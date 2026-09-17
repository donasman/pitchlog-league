/**
 * LocalizedName 배치 조회 · Map 캐시.
 *
 * 왜 배치인가:
 *   응답에서 팀·대회 이름을 만드는 곳이 여럿이고, 목록 응답은 팀 수백·대회 수십 건이라
 *   행마다 `findFirst` 하면 N+1 이다 (매 요청 수백 쿼리). 서비스가 필요한 (type, ids)
 *   을 한 번의 `IN` 조회로 로드해서 Map 을 채우고, 조립 시 lookup 만 한다.
 *
 * 사용 흐름:
 *   const lookup = new NameLookup(prisma, locale);
 *   await lookup.loadFor({ teams: teamIds, competitions: compIds, players: playerIds });
 *   // 조립 시:
 *   ...names(t.name, t.shortName, lookup.team(t.id))
 *
 * locale='en' 이면 아무 것도 로드하지 않는다 — 원본만 사용 (schema 상 en 시드가 없다 ·
 * 있어도 원본과 같음 · 계약 2 "locale=en 이면 전부 원본").
 */
import type { PrismaService } from '../prisma/prisma.service.js';
import { EntityType } from '../generated/prisma/client.js';
import type { Locale } from './locale.js';

export interface NameOverride {
  name?: string;
  shortName?: string | null;
}

interface LoadTargets {
  teams?: number[];
  competitions?: number[];
  players?: number[];
}

export class NameLookup {
  private readonly teams = new Map<number, NameOverride>();
  private readonly competitions = new Map<number, NameOverride>();
  private readonly players = new Map<number, NameOverride>();

  constructor(
    private readonly prisma: PrismaService,
    readonly locale: Locale,
  ) {}

  /** locale='en' 이면 스킵. 중복 id 는 알아서 유니크화. 빈 배열이면 쿼리 안 함. */
  async loadFor(targets: LoadTargets): Promise<void> {
    if (this.locale === 'en') return;
    const jobs: Promise<void>[] = [];
    const teamIds = uniq(targets.teams);
    const compIds = uniq(targets.competitions);
    const playerIds = uniq(targets.players);
    if (teamIds.length > 0) jobs.push(this.load(EntityType.TEAM, teamIds, this.teams));
    if (compIds.length > 0) jobs.push(this.load(EntityType.COMPETITION, compIds, this.competitions));
    if (playerIds.length > 0) jobs.push(this.load(EntityType.PLAYER, playerIds, this.players));
    await Promise.all(jobs);
  }

  team(id: number): NameOverride | undefined {
    return this.teams.get(id);
  }

  competition(id: number): NameOverride | undefined {
    return this.competitions.get(id);
  }

  player(id: number): NameOverride | undefined {
    return this.players.get(id);
  }

  private async load(entityType: EntityType, ids: number[], into: Map<number, NameOverride>): Promise<void> {
    const rows = await this.prisma.localizedName.findMany({
      where: { entityType, entityId: { in: ids }, locale: this.locale },
      select: { entityId: true, name: true, shortName: true },
    });
    for (const r of rows) {
      into.set(r.entityId, { name: r.name, shortName: r.shortName });
    }
  }
}

function uniq(xs: number[] | undefined): number[] {
  if (!xs || xs.length === 0) return [];
  return [...new Set(xs)];
}
