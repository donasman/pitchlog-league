/**
 * L6-c — 팀 시즌 통계 (`/teams/statistics?league=&season=&team=`)
 *
 * 팀당 1콜이라 대상 선정이 곧 예산이다. **`format === ROUND_ROBIN` 대회만** 돈다 —
 * 리그 5개 × 96팀 × 5시즌 ≈ 480콜.
 *
 * ## UCL 을 빼는 이유
 * UCL 참가팀은 `competition_entries` 기준 81개인데 절반이 예선 전용이다. 405콜을 쓰고도
 * 절반은 화면에 나오지 않는다. `NEXT_STEPS` 8-b 가 "L6 전에 예선팀을 걷어낸다" 고 경고한 그 지점이고,
 * 예선팀 정리는 아직 안 됐다. 정리된 뒤에 이 조건을 다시 본다.
 *
 * 팀 하나가 실패해도 나머지는 계속한다 — 96팀 중 1팀 때문에 시즌을 버릴 이유가 없다.
 * 쿼터 소진만 위로 던진다.
 *
 * ⚠ `team_season_stats` 에는 `updated_at` 컬럼이 없다.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiFootballClient } from '../api-football/api-football.client.js';
import { ApiQuotaExhaustedError } from '../api-football/api-football.errors.js';
import { batchUpsert } from '../../prisma/batch-upsert.js';
import { toTeamSeasonStatRow, type TeamSeasonStatRow } from './player-stats.mapper.js';
import type { ApiTeamStatistics } from '../api-football/api-football.types.js';

export interface TeamSeasonStatsResult {
  targets: number;
  rows: number;
  failed: string[];
  partial: boolean;
}

@Injectable()
export class TeamSeasonStatsService {
  private readonly logger = new Logger(TeamSeasonStatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: ApiFootballClient,
  ) {}

  async collect(
    cs: { id: number; apiCompetitionId: number; seasonYear: number; label: string },
    runAt: string,
  ): Promise<TeamSeasonStatsResult> {
    const result: TeamSeasonStatsResult = { targets: 0, rows: 0, failed: [], partial: false };

    // 대상은 그 대회시즌의 참가팀이다 — 팀을 여기서 만들지 않는다 (L2·L6-a 와 같은 규칙)
    const entries = await this.prisma.competitionEntry.findMany({
      where: { competitionSeasonId: cs.id },
      select: { team: { select: { id: true, apiTeamId: true } } },
      orderBy: { teamId: 'asc' },
    });
    result.targets = entries.length;
    if (entries.length === 0) {
      this.logger.warn(`${cs.label}: 참가팀이 없다 — L0 를 먼저 돌린다`);
      return result;
    }

    const rows: TeamSeasonStatRow[] = [];
    for (const e of entries) {
      try {
        const { response } = await this.api.get<ApiTeamStatistics>('/teams/statistics', {
          league: cs.apiCompetitionId,
          season: cs.seasonYear,
          team: e.team.apiTeamId,
        });
        // 이 엔드포인트는 배열이 아니라 객체를 준다. 시즌 등록 전이면 빈 값이 온다
        if (!response || typeof response !== 'object') {
          this.logger.warn(`${cs.label}: 팀 ${e.team.apiTeamId} 통계가 비었다 — 건너뜀`);
          continue;
        }
        rows.push(toTeamSeasonStatRow(response, { competitionSeasonId: cs.id, teamId: e.team.id }, runAt));
      } catch (err) {
        if (err instanceof ApiQuotaExhaustedError) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        result.failed.push(`team=${e.team.apiTeamId}: ${msg}`);
        result.partial = true;
        this.logger.warn(`${cs.label}: 팀 ${e.team.apiTeamId} 통계 실패 — ${msg}. 나머지 팀은 계속한다`);
      }
    }

    /*
     * 전 팀이 실패했으면 이 갈래는 **실패**다 (rankings.service.ts 와 같은 규칙).
     * 한둘이 실패한 것은 partial 로 보고하고 계속한다 — 96팀 중 1팀 때문에 시즌을 버리지 않는다.
     */
    if (rows.length === 0 && result.failed.length === entries.length) {
      throw new Error(`팀 ${entries.length}개가 모두 실패했다 — ${result.failed.slice(0, 5).join(' / ')}`);
    }

    if (rows.length > 0) {
      const res = await batchUpsert<TeamSeasonStatRow>(this.prisma, {
        table: 'team_season_stats',
        columns: {
          competition_season_id: 'int', team_id: 'int', form: 'text',
          played_home: 'int', played_away: 'int', played_total: 'int',
          wins_home: 'int', wins_away: 'int', draws_home: 'int', draws_away: 'int',
          loses_home: 'int', loses_away: 'int',
          goals_for_home: 'int', goals_for_away: 'int', goals_against_home: 'int', goals_against_away: 'int',
          biggest_win_home: 'text', biggest_win_away: 'text', biggest_lose_home: 'text', biggest_lose_away: 'text',
          clean_sheet_total: 'int', failed_to_score_total: 'int',
          penalty_scored: 'int', penalty_missed: 'int',
          formations: 'jsonb', cards: 'jsonb', as_of: 'timestamptz',
        },
        conflict: ['competition_season_id', 'team_id'],
        // updated_at 컬럼이 없는 테이블이다
      }, rows);
      result.rows = res.rows;
    }

    this.logger.log(
      `${cs.label}: 팀 통계 ${result.rows}/${result.targets}` + (result.failed.length ? ` · 실패 ${result.failed.length}` : ''),
    );
    return result;
  }
}
