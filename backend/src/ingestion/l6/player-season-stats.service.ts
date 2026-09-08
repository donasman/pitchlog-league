/**
 * L6-a — 선수 시즌 통계 (`/players?league=&season=&page=`)
 *
 * 백필-1 에서 가장 비싼 갈래다. 실측 5시즌 페이지 합: EPL 211 · 라리가 205 · 분데스 166 ·
 * 세리에A 221 · 리그1 191 · UCL 510 = **1,504콜**. 컵 6개(3,162콜)는 화면이 없어 범위 밖이다.
 *
 * ## 왜 `getAllPages` 를 안 쓰나
 * 클라이언트의 `getAllPages` 는 페이지 하나가 던지면 시즌 전체가 죽는다. UCL 은 한 시즌이
 * 57페이지짜리도 있다 — 56페이지를 받아놓고 마지막 하나 때문에 전부 버리는 대가가 너무 크다.
 * 여기서는 페이지 루프를 직접 돌고 **실패한 페이지 번호만 모아서 계속**한다.
 *
 * 예외는 하나 — `ApiQuotaExhaustedError` 는 즉시 던진다. 재시도해도 같은 에러라
 * 남은 페이지 56개를 마저 요청해봐야 같은 실패 56줄이 쌓일 뿐이다 (L2·probe 와 같은 규칙).
 *
 * ## 레이트 리밋은 여기서 다루지 않는다
 * `ApiFootballClient` 가 분당 슬라이딩 윈도우 · 지수 백오프 · 429 처리를 이미 보장한다
 * (`api-football.client.ts` 의 `throttle()` · `MAX_ATTEMPTS`). 여기서 sleep 을 더 넣으면
 * 그 예산을 두 번 쓰는 셈이라 백필이 며칠로 늘어난다.
 *
 * ## 부모-먼저, 트랜잭션 없음 (SCHEMA_DESIGN 2-4 · L1 과 같은 이유)
 *   ① 팀 맵 — **여기서 팀을 만들지 않는다.** 맵에 없으면 그 행을 버리고 `missingTeams` 로 보고한다.
 *      L2 와 같은 처리다. 선수 통계가 팀 마스터의 소스가 되면 예선 전용 팀이 화면에 샌다.
 *   ② `players` upsert + RETURNING → apiId→내부 id 맵
 *   ③ `player_season_stats` upsert
 * 한 트랜잭션으로 묶지 않는다 — 페이지 57개를 다 받는 동안 커넥션을 물고 있으면
 * Supabase 풀이 마르고, 중간 실패 시 이미 받은 56페이지도 버리게 된다.
 *
 * ⚠ `player_season_stats` 에는 `updated_at` 컬럼이 **없다**. `updatedAtColumn` 을 주면 SQL 이 터진다.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiFootballClient } from '../api-football/api-football.client.js';
import { ApiQuotaExhaustedError } from '../api-football/api-football.errors.js';
import { batchUpsert } from '../../prisma/batch-upsert.js';
import type { ApiPlayerSeason } from '../api-football/api-football.types.js';
import {
  pickSeasonStats,
  toPlayerProfileRow,
  toPlayerSeasonStatRow,
  type PlayerProfileRow,
  type PlayerSeasonStatRow,
} from './player-stats.mapper.js';

export interface PlayerSeasonStatsResult {
  /** `/players` 가 알려준 전체 페이지 수 — 예산 추적의 근거라 로그·결과 양쪽에 남긴다 */
  pages: number;
  fetchedPages: number;
  /** 받지 못한 페이지 번호. 비어 있지 않으면 partial 이다 */
  failedPages: number[];
  players: number;
  stats: number;
  /** DB 에 없는 API 팀 id — L0 를 다시 돌려야 한다는 신호 */
  missingTeams: number[];
  partial: boolean;
}

@Injectable()
export class PlayerSeasonStatsService {
  private readonly logger = new Logger(PlayerSeasonStatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: ApiFootballClient,
  ) {}

  async collect(
    cs: { id: number; apiCompetitionId: number; seasonYear: number; label: string },
    teamIdByApi: ReadonlyMap<number, number>,
    runAt: string,
  ): Promise<PlayerSeasonStatsResult> {
    const result: PlayerSeasonStatsResult = {
      pages: 0, fetchedPages: 0, failedPages: [], players: 0, stats: 0, missingTeams: [], partial: false,
    };

    const query = { league: cs.apiCompetitionId, season: cs.seasonYear };
    const first = await this.api.get<ApiPlayerSeason[]>('/players', { ...query, page: 1 });
    const total = first.paging?.total ?? 1;
    result.pages = total;
    result.fetchedPages = 1;
    this.logger.log(`${cs.label}: /players ${total}페이지`);

    const entries: ApiPlayerSeason[] = [...(first.response ?? [])];
    for (let page = 2; page <= total; page++) {
      try {
        const res = await this.api.get<ApiPlayerSeason[]>('/players', { ...query, page });
        entries.push(...(res.response ?? []));
        result.fetchedPages++;
      } catch (err) {
        // 일일 한도는 재시도해도 같다 — 남은 페이지를 마저 태우지 않고 위로 던진다
        if (err instanceof ApiQuotaExhaustedError) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        result.failedPages.push(page);
        result.partial = true;
        this.logger.warn(`${cs.label}: /players page=${page} 실패 — ${msg}. 나머지 페이지는 계속한다`);
      }
    }

    if (entries.length === 0) {
      // 시즌 등록 전이면 비어 있다. 실패가 아니라 "아직 없음" (DATA_RULES 5-4)
      this.logger.warn(`${cs.label}: 선수 0명 — 아직 시작 전이거나 커버리지 없음`);
      return result;
    }

    // ② 선수 프로필 — 부모가 먼저다
    const playerIdByApi = await this.upsertPlayerProfiles(entries.map((e) => e.player), runAt);
    result.players = playerIdByApi.size;

    // ③ 시즌 통계
    const missing = new Set<number>();
    const rows: PlayerSeasonStatRow[] = [];
    for (const entry of entries) {
      const playerId = playerIdByApi.get(entry.player.id);
      if (playerId === undefined) continue;
      for (const st of pickSeasonStats(entry, cs.apiCompetitionId, cs.seasonYear)) {
        const teamId = teamIdByApi.get(st.team.id);
        if (teamId === undefined) {
          missing.add(st.team.id);
          continue;
        }
        rows.push(toPlayerSeasonStatRow(st, { playerId, teamId, competitionSeasonId: cs.id }, runAt));
      }
    }
    result.missingTeams = [...missing].sort((a, b) => a - b);
    if (missing.size > 0) {
      result.partial = true;
      this.logger.warn(`${cs.label}: DB 에 없는 팀 ${missing.size}개 — 그 선수 기록은 건너뛴다. L0 를 다시 돌린다`);
    }

    if (rows.length > 0) {
      const res = await batchUpsert<PlayerSeasonStatRow>(this.prisma, {
        table: 'player_season_stats',
        columns: {
          player_id: 'int', team_id: 'int', competition_season_id: 'int',
          appearances: 'int', lineups_count: 'int', minutes: 'int', goals: 'int', assists: 'int',
          yellow_cards: 'int', yellowred_cards: 'int', red_cards: 'int', rating_avg: 'numeric',
          shots_total: 'int', shots_on: 'int', passes_key: 'int',
          tackles_total: 'int', interceptions: 'int', duels_total: 'int', duels_won: 'int',
          dribbles_success: 'int', source: '"StatsSource"', as_of: 'timestamptz',
        },
        conflict: ['player_id', 'team_id', 'competition_season_id'],
        // updated_at 컬럼이 없는 테이블이다 — updatedAtColumn 을 주면 SQL 이 터진다
      }, rows);
      result.stats = res.rows;
    }

    this.logger.log(
      `${cs.label}: 선수 ${result.players} · 통계 ${result.stats} · 페이지 ${result.fetchedPages}/${result.pages}` +
        (result.failedPages.length ? ` · 실패 페이지 ${result.failedPages.join(',')}` : ''),
    );
    return result;
  }

  /**
   * `players` upsert + RETURNING → apiId→내부 id 맵 (L1 과 같은 방식).
   * 랭킹 갈래도 이걸 쓴다 — 랭킹 응답에 선수 프로필이 통째로 들어 있어서,
   * 선수 통계 페이지가 실패해도 `top_rankings.player_id` 가 고아가 되지 않는다.
   *
   * ⚠ `coalesceUpdate` 가 핵심이다. 시즌 역순이라 2026 패스가 채운 `birth_date` · `photo_url` 을
   * 뒤이은 2022 패스의 null 이 지우면 안 된다. `name` 만 일반 update — 항상 값이 오는 필드다.
   */
  async upsertPlayerProfiles(players: readonly ApiPlayerSeason['player'][], runAt: string): Promise<Map<number, number>> {
    const rows: PlayerProfileRow[] = players.map((p) => toPlayerProfileRow(p, runAt));
    if (rows.length === 0) return new Map();
    const res = await batchUpsert<PlayerProfileRow, { id: number; api_player_id: number }>(this.prisma, {
      table: 'players',
      columns: {
        api_player_id: 'int', name: 'text', firstname: 'text', lastname: 'text',
        birth_date: 'date', birth_place: 'text', birth_country: 'text', nationality: 'text',
        height_cm: 'int', weight_kg: 'int', photo_url: 'text', profile_fetched_at: 'timestamptz',
      },
      conflict: ['api_player_id'],
      update: [
        'name',
        'firstname', 'lastname', 'birth_date', 'birth_place', 'birth_country',
        'nationality', 'height_cm', 'weight_kg', 'photo_url', 'profile_fetched_at',
      ],
      // 프로필 컬럼 전부. `photo_url` 도 여기다 — 빈 프로필 응답이 앞선 시즌의 사진을 NULL 로 덮으면 안 된다
      coalesceUpdate: [
        'firstname', 'lastname', 'birth_date', 'birth_place', 'birth_country',
        'nationality', 'height_cm', 'weight_kg', 'photo_url', 'profile_fetched_at',
      ],
      updatedAtColumn: 'updated_at',
      returning: ['id', 'api_player_id'],
    }, rows);
    return new Map(res.returned.map((p) => [p.api_player_id, p.id]));
  }
}
