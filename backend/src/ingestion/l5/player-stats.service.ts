/**
 * L5 선수 통계 — `/fixtures/players?fixture=` 한 콜을 받아 player_match_stats 를 upsert 한다.
 *
 * ## 소유권 (D18·D19·D20)
 *   · matches 행에서 건드리는 것은 `has_player_stats` 하나 (+ 승격 헬퍼가 detail_checked_at·
 *     stats_state·confirmed_at). `data_version`·`tie_id`·`leg` 절대 안 건드림.
 *   · `detail_eligible = false` 는 진입 검사에서 skip.
 *   · matches 갱신은 `updateMany + detailEligible:true`.
 *
 * ## 응답 규약 (D3)
 *   200 + response.length > 0  → hasPlayerStats = true, 팀별 upsert
 *   200 + []                   → hasPlayerStats = false (마감), 승격 시도
 *   에러                        → NULL 유지 (throw)
 *
 * ## Player 최소 upsert (D9)
 *   lineups 응답과 다른 선수 집합이 올 수 있다 (예: /fixtures/players 에만 있는 선수).
 *   여기서 나오는 선수는 다 최소 upsert 한다. 트랜잭션 밖.
 *
 * ## 파싱 규칙 (D6)
 *   · rating: string|null → Decimal? — null 유지 (미출장·5분 이하). 절대 0 아님
 *   · passes.accuracy: null → null 유지 (정확 패스 횟수, 퍼센트 아님).
 *     문자열 → parseInt · 숫자 → 그대로. 저장 컬럼도 null 허용
 *   · penalty.commited → penalty_committed (API 오타 재매핑)
 *   · 그 외 대부분 Int 는 null → 0
 *
 * ## 트랜잭션
 *   외부 호출·Player upsert 트랜잭션 밖. player_match_stats upsert +
 *   has_player_stats 세팅만 짧은 트랜잭션.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiFootballClient } from '../api-football/api-football.client.js';
import { batchUpsert } from '../../prisma/batch-upsert.js';
import { promoteIfAllDetailsChecked } from '../../common/match-detail-status.js';
import type { ApiFixturePlayersItem } from '../api-football/api-football.types.js';

export interface L5PlayerStatsResult {
  ok: boolean;
  reason?: string;
  hasPlayerStats?: boolean;
  /** 저장된 선수 통계 행 수 */
  players?: number;
  missingTeams?: number[];
  promoted?: boolean;
}

/** null → 0 · number → 그대로 (정수 절삭) */
function intOrZero(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return Math.trunc(v);
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * passes.accuracy — null 유지. 문자열 → parseInt · 숫자 → 그대로 (D6).
 * 퍼센트가 아닌 "정확 패스 횟수" — 컬럼도 nullable 이다.
 */
function accuracyOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Math.trunc(v);
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

/** rating — string|null → Decimal?. null 유지 (D6: 미출장·5분 이하는 절대 0 이 아니다) */
function ratingOrNull(v: string | null | undefined): Prisma.Decimal | null {
  if (v === null || v === undefined) return null;
  return new Prisma.Decimal(v);
}

/** player_match_stats 컬럼 shape — snake_case. batchUpsert 제네릭 호환용 */
export type PlayerStatsRow = {
  match_id: number;
  player_id: number;
  team_id: number;
  competition_season_id: number;
  minutes: number;
  jersey_number: number | null;
  position: string | null;
  rating: Prisma.Decimal | null;
  is_captain: boolean;
  is_substitute: boolean;
  shots_total: number;
  shots_on: number;
  goals_total: number;
  goals_conceded: number;
  assists: number;
  saves: number;
  passes_total: number;
  passes_key: number;
  passes_accuracy: number | null;
  tackles_total: number;
  blocks: number;
  interceptions: number;
  duels_total: number;
  duels_won: number;
  dribbles_attempts: number;
  dribbles_success: number;
  dribbles_past: number;
  fouls_drawn: number;
  fouls_committed: number;
  yellow_cards: number;
  red_cards: number;
  penalty_won: number;
  penalty_committed: number;
  penalty_scored: number;
  penalty_missed: number;
  penalty_saved: number;
  offsides: number;
};

/**
 * `/fixtures/players` items → PlayerStatsRow[] (D6).
 * matchId · teamId · playerIdByApi · competitionSeasonId 는 호출자가 채운다.
 * players 는 팀당 배열이고 각 선수의 `statistics` 는 실측상 길이 1 (하지만 배열).
 */
export function parsePlayerStats(
  rawItems: ReadonlyArray<ApiFixturePlayersItem>,
  ctx: {
    matchId: number;
    competitionSeasonId: number;
    teamIdByApi: ReadonlyMap<number, number>;
    playerIdByApi: ReadonlyMap<number, number>;
  },
): { rows: PlayerStatsRow[]; missingTeams: number[] } {
  const rows: PlayerStatsRow[] = [];
  const missingTeams = new Set<number>();

  for (const it of rawItems) {
    const teamId = ctx.teamIdByApi.get(it.team.id);
    if (teamId === undefined) {
      missingTeams.add(it.team.id);
      continue;
    }
    for (const p of it.players) {
      const playerId = ctx.playerIdByApi.get(p.player.id);
      if (playerId === undefined) continue;
      const stat = p.statistics[0];
      if (!stat) continue;

      const games = stat.games ?? {
        minutes: null,
        number: null,
        position: null,
        rating: null,
        captain: false,
        substitute: false,
      };
      const shots = stat.shots ?? { total: null, on: null };
      const goals = stat.goals ?? { total: null, conceded: null, assists: null, saves: null };
      const passes = stat.passes ?? { total: null, key: null, accuracy: null };
      const tackles = stat.tackles ?? { total: null, blocks: null, interceptions: null };
      const duels = stat.duels ?? { total: null, won: null };
      const dribbles = stat.dribbles ?? { attempts: null, success: null, past: null };
      const fouls = stat.fouls ?? { drawn: null, committed: null };
      const cards = stat.cards ?? { yellow: 0, red: 0 };
      const penalty = stat.penalty ?? {
        won: null,
        commited: null,
        scored: null,
        missed: null,
        saved: null,
      };

      rows.push({
        match_id: ctx.matchId,
        player_id: playerId,
        team_id: teamId,
        competition_season_id: ctx.competitionSeasonId,
        minutes: intOrZero(games.minutes),
        jersey_number: games.number ?? null,
        position: games.position ?? null,
        // D6: 미출장/5분 이하는 API 가 rating=null. 절대 0 으로 바꾸지 않는다
        rating: ratingOrNull(games.rating),
        is_captain: games.captain === true,
        is_substitute: games.substitute === true,
        shots_total: intOrZero(shots.total),
        shots_on: intOrZero(shots.on),
        goals_total: intOrZero(goals.total),
        goals_conceded: intOrZero(goals.conceded),
        assists: intOrZero(goals.assists),
        saves: intOrZero(goals.saves),
        passes_total: intOrZero(passes.total),
        passes_key: intOrZero(passes.key),
        // D6: passes.accuracy 는 null → null 유지 (정확 패스 횟수, 퍼센트 아님)
        passes_accuracy: accuracyOrNull(passes.accuracy),
        tackles_total: intOrZero(tackles.total),
        blocks: intOrZero(tackles.blocks),
        interceptions: intOrZero(tackles.interceptions),
        duels_total: intOrZero(duels.total),
        duels_won: intOrZero(duels.won),
        dribbles_attempts: intOrZero(dribbles.attempts),
        dribbles_success: intOrZero(dribbles.success),
        dribbles_past: intOrZero(dribbles.past),
        fouls_drawn: intOrZero(fouls.drawn),
        fouls_committed: intOrZero(fouls.committed),
        yellow_cards: intOrZero(cards.yellow),
        red_cards: intOrZero(cards.red),
        penalty_won: intOrZero(penalty.won),
        // D6: API 오타 commited → committed 로 재매핑
        penalty_committed: intOrZero(penalty.commited),
        penalty_scored: intOrZero(penalty.scored),
        penalty_missed: intOrZero(penalty.missed),
        penalty_saved: intOrZero(penalty.saved),
        offsides: intOrZero(stat.offsides),
      });
    }
  }

  return { rows, missingTeams: [...missingTeams] };
}

@Injectable()
export class L5PlayerStatsService {
  private readonly logger = new Logger(L5PlayerStatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: ApiFootballClient,
  ) {}

  async run(matchId: number, apiFixtureId: number): Promise<L5PlayerStatsResult> {
    // 1) 매치 존재·자격 확인
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        apiFixtureId: true,
        detailEligible: true,
        competitionSeasonId: true,
      },
    });
    if (!match) {
      this.logger.warn(`L5 player-stats: match id=${matchId} 없음 — skip`);
      return { ok: false, reason: 'match-not-found' };
    }
    if (match.apiFixtureId !== apiFixtureId) {
      this.logger.warn(
        `L5 player-stats: match id=${matchId} 의 apiFixtureId ${match.apiFixtureId} 가 인자 ${apiFixtureId} 와 다르다 — skip`,
      );
      return { ok: false, reason: 'fixture-id-mismatch' };
    }
    if (!match.detailEligible) {
      this.logger.warn(`L5 player-stats: match id=${matchId} 는 detail_eligible=false — skip`);
      return { ok: false, reason: 'not-eligible' };
    }

    // 2) 외부 호출 — 실패 시 throw. has_player_stats NULL 유지
    const env = await this.api.get<ApiFixturePlayersItem[]>('/fixtures/players', { fixture: apiFixtureId });
    const items = env.response ?? [];

    // 3) 빈 응답 → hasPlayerStats=false 마감 + 승격 시도
    if (items.length === 0) {
      await this.prisma.match.updateMany({
        where: { id: matchId, detailEligible: true },
        data: { hasPlayerStats: false },
      });
      const promoted = await promoteIfAllDetailsChecked(this.prisma, matchId);
      return { ok: true, hasPlayerStats: false, players: 0, missingTeams: [], promoted: promoted.promoted };
    }

    // 4) Player 최소 upsert (트랜잭션 밖. D9: lineups 와 다른 선수 집합이 올 수 있다)
    const playerRowsMap = new Map<number, { api_player_id: number; name: string; photo_url: string | null }>();
    for (const it of items) {
      for (const p of it.players) {
        if (!playerRowsMap.has(p.player.id)) {
          playerRowsMap.set(p.player.id, {
            api_player_id: p.player.id,
            name: p.player.name,
            photo_url: p.player.photo ?? null,
          });
        }
      }
    }
    const playerIdByApi = new Map<number, number>();
    const playerRows = [...playerRowsMap.values()];
    if (playerRows.length > 0) {
      const res = await batchUpsert<(typeof playerRows)[number], { id: number; api_player_id: number }>(this.prisma, {
        table: 'players',
        columns: { api_player_id: 'int', name: 'text', photo_url: 'text' },
        conflict: ['api_player_id'],
        // photo_url 은 이 응답에 있다 — 갱신한다. profile_fetched_at 등 다른 컬럼은 건드리지 않음
        update: ['name', 'photo_url'],
        updatedAtColumn: 'updated_at',
        returning: ['id', 'api_player_id'],
      }, playerRows);
      for (const r of res.returned) playerIdByApi.set(r.api_player_id, r.id);
    }

    // 5) 팀 매핑
    const apiTeamIds = items.map((it) => it.team.id);
    const teams = await this.prisma.team.findMany({
      where: { apiTeamId: { in: apiTeamIds } },
      select: { id: true, apiTeamId: true },
    });
    const teamIdByApi = new Map(teams.map((t) => [t.apiTeamId, t.id]));

    // 6) 파싱
    const { rows, missingTeams } = parsePlayerStats(items, {
      matchId,
      competitionSeasonId: match.competitionSeasonId,
      teamIdByApi,
      playerIdByApi,
    });
    for (const t of missingTeams) {
      this.logger.warn(`L5 player-stats: match id=${matchId}, apiTeamId=${t} 팀 매핑 실패 — 이 팀 skip`);
    }

    const hasPlayerStatsValue = rows.length > 0;

    // 7) 짧은 트랜잭션 — player_match_stats upsert + has_player_stats 세팅
    await this.prisma.$transaction(async (tx) => {
      if (rows.length > 0) {
        await batchUpsert<(typeof rows)[number]>(tx, {
          table: 'player_match_stats',
          columns: {
            match_id: 'int',
            player_id: 'int',
            team_id: 'int',
            competition_season_id: 'int',
            minutes: 'int',
            jersey_number: 'int',
            position: 'text',
            rating: 'numeric',
            is_captain: 'boolean',
            is_substitute: 'boolean',
            shots_total: 'int',
            shots_on: 'int',
            goals_total: 'int',
            goals_conceded: 'int',
            assists: 'int',
            saves: 'int',
            passes_total: 'int',
            passes_key: 'int',
            passes_accuracy: 'int',
            tackles_total: 'int',
            blocks: 'int',
            interceptions: 'int',
            duels_total: 'int',
            duels_won: 'int',
            dribbles_attempts: 'int',
            dribbles_success: 'int',
            dribbles_past: 'int',
            fouls_drawn: 'int',
            fouls_committed: 'int',
            yellow_cards: 'int',
            red_cards: 'int',
            penalty_won: 'int',
            penalty_committed: 'int',
            penalty_scored: 'int',
            penalty_missed: 'int',
            penalty_saved: 'int',
            offsides: 'int',
          },
          conflict: ['match_id', 'player_id'],
          update: [
            'team_id', 'competition_season_id',
            'minutes', 'jersey_number', 'position', 'rating', 'is_captain', 'is_substitute',
            'shots_total', 'shots_on',
            'goals_total', 'goals_conceded', 'assists', 'saves',
            'passes_total', 'passes_key', 'passes_accuracy',
            'tackles_total', 'blocks', 'interceptions',
            'duels_total', 'duels_won',
            'dribbles_attempts', 'dribbles_success', 'dribbles_past',
            'fouls_drawn', 'fouls_committed',
            'yellow_cards', 'red_cards',
            'penalty_won', 'penalty_committed', 'penalty_scored', 'penalty_missed', 'penalty_saved',
            'offsides',
          ],
        }, rows);
      }
      await tx.match.updateMany({
        where: { id: matchId, detailEligible: true },
        data: { hasPlayerStats: hasPlayerStatsValue },
      });
    });

    // 8) 승격 시도
    const promoted = await promoteIfAllDetailsChecked(this.prisma, matchId);

    return {
      ok: true,
      reason: missingTeams.length > 0 ? `missing-teams:${missingTeams.join(',')}` : undefined,
      hasPlayerStats: hasPlayerStatsValue,
      players: rows.length,
      missingTeams,
      promoted: promoted.promoted,
    };
  }
}
