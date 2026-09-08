/**
 * L6-b — 득점·도움·경고·퇴장 랭킹 (`/players/top*`)
 *
 * 대회시즌당 **4콜**. 6대회 × 5시즌 × 4종 = 120콜로 백필-1 에서 가장 싼 갈래다.
 * 엔드포인트 이름은 이 넷이 전부다 — `topcards` 는 **없다**(경고·퇴장이 따로다).
 *
 * ## rank 는 API 가 주지 않는다
 * 응답은 정렬된 배열일 뿐 순위 번호가 없다. 필터 후 **배열 인덱스+1** 로 매긴다.
 * 값이 null 인 행은 버린다 — 0 으로 접으면 "0골 득점왕" 이 생긴다.
 *
 * ## 왜 랭킹도 선수를 upsert 하나
 * 응답에 선수 프로필이 통째로 들어 있다. 선수 통계 갈래(L6-a)가 페이지 실패로 죽어도
 * `top_rankings.player_id` 가 없는 선수를 가리키면 안 된다 — 같은 mapper 를 재사용한다.
 *
 * ## 목록이 줄면 남는 유령 행 — `as_of` 정리
 * 20위까지 있던 랭킹이 15위까지로 줄면 16~20위 행이 그대로 남는다(unique 가 `(cs, category, rank)`).
 * upsert 를 먼저 하고, 그 뒤 **이번 run 의 `as_of` 보다 오래된 행만** 지운다.
 * delete-then-insert 는 쓰지 않는다 — 중간에 빈 랭킹이 화면에 보이고 트랜잭션이 필요해진다.
 * 그래서 한 run 의 모든 행이 **같은 `as_of`** 를 갖는 것이 이 방식의 전제다 (호출자가 runAt 하나를 넘긴다).
 *
 * ⚠ `top_rankings` 에는 `updated_at` 컬럼이 없다.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiFootballClient } from '../api-football/api-football.client.js';
import { ApiQuotaExhaustedError } from '../api-football/api-football.errors.js';
import { batchUpsert } from '../../prisma/batch-upsert.js';
import { RankingCategory } from '../../generated/prisma/client.js';
import type { ApiPlayerSeason } from '../api-football/api-football.types.js';
import { pickSeasonStats, rankingValueOf, type RankingCategoryKey } from './player-stats.mapper.js';
import { PlayerSeasonStatsService } from './player-season-stats.service.js';

/** 카테고리 ↔ 엔드포인트. 값이 어느 필드에서 오는지는 mapper 의 `rankingValueOf` 가 정한다 */
const RANKING_ENDPOINTS: readonly { category: RankingCategory; key: RankingCategoryKey; path: string }[] = [
  { category: RankingCategory.SCORERS, key: 'SCORERS', path: '/players/topscorers' },
  { category: RankingCategory.ASSISTS, key: 'ASSISTS', path: '/players/topassists' },
  { category: RankingCategory.YELLOW_CARDS, key: 'YELLOW_CARDS', path: '/players/topyellowcards' },
  { category: RankingCategory.RED_CARDS, key: 'RED_CARDS', path: '/players/topredcards' },
];

type RankingRow = {
  competition_season_id: number;
  category: string;
  rank: number;
  player_id: number;
  team_id: number;
  value: number;
  as_of: string;
};

export interface RankingsResult {
  categories: number;
  rows: number;
  /** 값이 null 이라 버린 행 수 */
  droppedNullValue: number;
  missingTeams: number[];
  /** 목록 축소로 지운 유령 행 수 */
  pruned: number;
  failed: string[];
  partial: boolean;
}

@Injectable()
export class RankingsService {
  private readonly logger = new Logger(RankingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: ApiFootballClient,
    private readonly players: PlayerSeasonStatsService,
  ) {}

  async collect(
    cs: { id: number; apiCompetitionId: number; seasonYear: number; label: string },
    teamIdByApi: ReadonlyMap<number, number>,
    runAt: string,
  ): Promise<RankingsResult> {
    const result: RankingsResult = {
      categories: 0, rows: 0, droppedNullValue: 0, missingTeams: [], pruned: 0, failed: [], partial: false,
    };
    const missing = new Set<number>();

    for (const ep of RANKING_ENDPOINTS) {
      // 한 카테고리 실패가 나머지 셋을 막지 않는다. 쿼터 소진은 위로 던진다 (L6 루프가 break 한다)
      try {
        const { response } = await this.api.get<ApiPlayerSeason[]>(ep.path, {
          league: cs.apiCompetitionId,
          season: cs.seasonYear,
        });
        const entries = response ?? [];
        if (entries.length === 0) {
          this.logger.warn(`${cs.label}: ${ep.path} 0건 — 아직 시작 전`);
          result.categories++;
          continue;
        }

        // 선수가 먼저다 — player_id 는 NOT NULL 이고 FK 가 없어 DB 가 막아주지 않는다
        const playerIdByApi = await this.players.upsertPlayerProfiles(entries.map((e) => e.player), runAt);

        const rows: RankingRow[] = [];
        for (const [index, entry] of entries.entries()) {
          /*
           * API 는 rank 를 주지 않는다 — **응답 배열의 자리**가 순위다.
           * `rows.length + 1` 로 매기면 안 된다: 1위 선수의 팀이 DB 에 없어 그 행을 버리는 순간
           * 2위가 `rank = 1` 로 저장돼 **틀린 득점왕이 화면에 뜬다**.
           * 버린 행의 자리는 비워 둔다 — 화면이 "3위 없음" 을 보는 게 "2위가 1위" 보다 낫다.
           */
          const rank = index + 1;
          const playerId = playerIdByApi.get(entry.player.id);
          if (playerId === undefined) continue;
          const st = pickSeasonStats(entry, cs.apiCompetitionId, cs.seasonYear)[0];
          if (st === undefined) continue;
          const value = rankingValueOf(st, ep.key);
          if (value === null) {
            result.droppedNullValue++;
            continue;
          }
          const teamId = teamIdByApi.get(st.team.id);
          if (teamId === undefined) {
            missing.add(st.team.id);
            continue;
          }
          rows.push({
            competition_season_id: cs.id,
            category: ep.category,
            rank,
            player_id: playerId,
            team_id: teamId,
            value,
            as_of: runAt,
          });
        }

        if (rows.length > 0) {
          const res = await batchUpsert<RankingRow>(this.prisma, {
            table: 'top_rankings',
            columns: {
              competition_season_id: 'int', category: '"RankingCategory"', rank: 'int',
              player_id: 'int', team_id: 'int', value: 'int', as_of: 'timestamptz',
            },
            conflict: ['competition_season_id', 'category', 'rank'],
            // updated_at 컬럼이 없는 테이블이다
          }, rows);
          result.rows += res.rows;
          // 정리는 **새 목록을 실제로 쓴 뒤에만** 한다 (아래 else 주석 참고)
          result.pruned += await this.pruneStale(cs.id, ep.category, runAt);
        } else {
          /*
           * 응답은 왔는데 한 행도 못 넣었다 — 팀이 전부 DB 에 없거나(L0 미실행) value 가 전부 null 이다.
           * 여기서 pruneStale 을 부르면 이전 run 의 20행이 전부 `as_of < runAt` 이라 **카테고리가 통째로 지워진다.**
           * 새 목록이 없으니 옛 목록을 지울 근거도 없다 — 오래된 랭킹을 보여주는 편이 빈 랭킹보다 낫다.
           */
          result.partial = true;
          this.logger.warn(
            `${cs.label}: ${ep.path} 응답 ${entries.length}건인데 저장 0행 — 기존 랭킹을 지우지 않고 둔다`,
          );
        }
        result.categories++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // 쿼터 소진은 갈래 격리로 삼키지 않는다 — 위(L6 루프)가 남은 대회시즌을 끊어야 한다
        if (err instanceof ApiQuotaExhaustedError) throw err;
        result.failed.push(`${ep.path}: ${msg}`);
        result.partial = true;
        this.logger.warn(`${cs.label}: ${ep.path} 실패 — ${msg}`);
      }
    }

    /*
     * 넷 다 실패했으면 이 갈래는 **실패**다 — partial 로 삼키지 않고 던진다.
     * 부분 실패(한둘)는 partial 로 보고하고 계속하는 것이 맞지만, 하나도 못 받은 것을 partial 로
     * 넘기면 L6 가 그 대회시즌을 DONE 으로 닫고 `dataStateOf` 가 COMPLETE 로 읽는다.
     */
    if (result.categories === 0 && result.failed.length === RANKING_ENDPOINTS.length) {
      throw new Error(`랭킹 ${RANKING_ENDPOINTS.length}종이 모두 실패했다 — ${result.failed.join(' / ')}`);
    }

    result.missingTeams = [...missing].sort((a, b) => a - b);
    if (missing.size > 0) {
      result.partial = true;
      this.logger.warn(`${cs.label}: 랭킹에 DB 에 없는 팀 ${missing.size}개 — 그 행은 건너뛴다`);
    }
    this.logger.log(
      `${cs.label}: 랭킹 ${result.rows}행 / ${result.categories}종` +
        (result.pruned ? ` · 유령 ${result.pruned}행 정리` : '') +
        (result.droppedNullValue ? ` · value null ${result.droppedNullValue}행 버림` : ''),
    );
    return result;
  }

  /**
   * 이번 run 이 다시 쓰지 않은 행 = 목록에서 빠진 순위다.
   * `as_of` 가 run 시작 시각보다 오래된 것만 지운다 — 방금 쓴 행은 정확히 runAt 이라 살아남는다.
   */
  private async pruneStale(competitionSeasonId: number, category: RankingCategory, runAt: string): Promise<number> {
    return this.prisma.$executeRaw`
      DELETE FROM "top_rankings"
      WHERE "competition_season_id" = ${competitionSeasonId}
        AND "category" = ${category}::"RankingCategory"
        AND "as_of" < ${runAt}::timestamptz`;
  }
}
