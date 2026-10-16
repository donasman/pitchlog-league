/**
 * 사용자 즐겨찾기 팀 서비스.
 *
 * GET  → { asOf, items[] }, position 오름차순.
 * PUT  → 단일 interactive 트랜잭션 안에서 사용자 단위 advisory lock 후 DELETE + createMany 로 전체 교체.
 *
 * 검증 순서 (엄격히 이 순서 · 첫 실패에서 400):
 *   1) teamRefs.length > 10 → favorites_limit_exceeded
 *   2) 각 ref parseRef 로 apiId 뽑기 — 실패한 ref 는 unknown 목록에 담음
 *   3) 성공한 apiId 로 prisma.team.findMany select id,apiTeamId → apiId→teamId 맵
 *   4) 매핑 miss apiId 의 원문 ref → unknown 에 병합. unknown.length>0 → favorites_unknown_team
 *   5) teamId (=apiId 기준) 중복 → favorites_duplicate
 *   6) 트랜잭션: advisory xact lock → deleteMany → createMany (같은 사용자 동시 PUT 직렬화). position = 배열 index
 *   7) GET 조립 함수 재사용
 *
 * 참조 무결성:
 *   relationMode="prisma" · FK 없음. userId 는 Supabase auth.users.id (우리 DB에 없음).
 *   teamId 존재 검증은 (3)·(4) 로 앱 계층에서 담당.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NameLookup } from '../common/name-lookup.js';
import { names } from '../common/names.dto.js';
import { parseRef, toRef } from '../common/ref.js';
import type { Locale } from '../common/locale.js';
import type { PutFavoritesDto } from './dto/put-favorites.dto.js';
import type { FavoriteItemDto, FavoritesResponseDto } from './dto/favorites-response.dto.js';

const FAVORITES_LIMIT = 10;

@Injectable()
export class UserFavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /** 즐겨찾기 조회 — position 오름차순 · items 조립 후 반환. asOf 는 now(). */
  async list(userId: string, locale: Locale): Promise<FavoritesResponseDto> {
    const rows = await this.prisma.userFavoriteTeam.findMany({
      where: { userId },
      include: { team: true },
      orderBy: { position: 'asc' },
    });

    const lookup = new NameLookup(this.prisma, locale);
    await lookup.loadFor({ teams: rows.map((r) => r.team.id) });

    const items = rows.map((r): FavoriteItemDto => {
      const t = r.team;
      const nm = names(t.name, t.shortName ?? t.code, lookup.team(t.id));
      return {
        position: r.position,
        ref: toRef(t.apiTeamId, t.name),
        apiId: t.apiTeamId,
        displayName: nm.displayName,
        shortDisplayName: nm.shortDisplayName,
        originalName: nm.originalName,
        code: t.code,
        country: t.country,
        founded: t.founded,
        logoUrl: t.logoUrl,
      };
    });
    return { asOf: new Date().toISOString(), items };
  }

  /** 즐겨찾기 전체 교체. 순서 = 배열 index. */
  async replace(userId: string, dto: PutFavoritesDto, locale: Locale): Promise<FavoritesResponseDto> {
    const { teamRefs } = dto;

    // (1) 상한
    if (teamRefs.length > FAVORITES_LIMIT) {
      throw new BadRequestException({ code: 'favorites_limit_exceeded' });
    }

    // (2) parseRef — 실패는 unknown 으로 모은다. parseRef 는 자체적으로 BadRequestException 을 던지므로
    //     여기서는 try/catch 로 잡아 unknown 처리 (계약: 400 { code:'favorites_unknown_team', details:[원문 ref] }).
    const unknown: string[] = [];
    const parsed: { ref: string; apiId: number }[] = [];
    for (const ref of teamRefs) {
      try {
        const apiId = parseRef(ref, '팀 ref');
        parsed.push({ ref, apiId });
      } catch {
        unknown.push(ref);
      }
    }

    // (3) DB 매핑 — 성공한 apiId 만 조회
    const apiIds = parsed.map((p) => p.apiId);
    const teams = apiIds.length > 0
      ? await this.prisma.team.findMany({
          where: { apiTeamId: { in: apiIds } },
          select: { id: true, apiTeamId: true },
        })
      : [];
    const apiIdToTeamId = new Map<number, number>();
    for (const t of teams) apiIdToTeamId.set(t.apiTeamId, t.id);

    // (4) miss → unknown 에 병합
    for (const p of parsed) {
      if (!apiIdToTeamId.has(p.apiId)) unknown.push(p.ref);
    }
    if (unknown.length > 0) {
      throw new BadRequestException({ code: 'favorites_unknown_team', details: unknown });
    }

    // (5) 중복 — apiId 기준 (같은 팀을 여러 ref 로 지목한 경우 포함)
    const seenApiId = new Set<number>();
    for (const p of parsed) {
      if (seenApiId.has(p.apiId)) {
        throw new BadRequestException({ code: 'favorites_duplicate' });
      }
      seenApiId.add(p.apiId);
    }

    // (6) 트랜잭션: 전체 교체
    const rowsToCreate = parsed.map((p, index) => ({
      userId,
      teamId: apiIdToTeamId.get(p.apiId)!,
      position: index,
    }));
    // 같은 사용자 동시 PUT 직렬화 — 락 없이 두 트랜잭션이 엇갈리면 createMany 가 PK (userId, teamId)
    // 또는 unique (userId, position) 에 부딪혀 P2002 → 500. advisory xact lock 은 커밋/롤백 시 자동 해제.
    // $executeRaw 여야 한다 — $queryRaw 는 void(OID 2278) 결과를 adapter-pg 가 UnsupportedNativeDataType 으로 던진다.
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('user_favorites'), hashtext(${userId}))`;
      await tx.userFavoriteTeam.deleteMany({ where: { userId } });
      if (rowsToCreate.length > 0) {
        await tx.userFavoriteTeam.createMany({ data: rowsToCreate });
      }
    });

    // (7) 조립 재사용
    return this.list(userId, locale);
  }
}
