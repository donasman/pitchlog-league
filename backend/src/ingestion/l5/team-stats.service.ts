/**
 * L5 팀 통계 — `/fixtures/statistics?fixture=` 한 콜을 받아 team_match_stats 를 upsert 한다.
 *
 * ## 소유권 (D18·D19·D20)
 *   · matches 행에서 건드리는 것은 `has_team_stats` 하나 (+ 승격 헬퍼가 detail_checked_at·
 *     stats_state·confirmed_at 을 더 건드린다). `data_version`·`tie_id`·`leg` 은 절대 안 건드림.
 *   · `detail_eligible = false` 인 경기는 입장 검사에서 건너뛴다.
 *   · matches 갱신은 `updateMany + detailEligible:true` 로 count === 1 확인.
 *
 * ## 응답 규약 (D3)
 *   200 + response.length > 0  → hasTeamStats = true, 팀별 upsert
 *   200 + []                   → hasTeamStats = false (마감), 승격 시도
 *   에러·429·타임아웃          → NULL 유지 (throw). 다음 스케줄 주기가 재시도한다
 *
 * ## 18항목 파싱 규칙 (D6)
 *   · Int 컬럼은 null → 0 정규화. Red Cards 는 API 가 항상 null 인 것이 실측 — 0 이 된다.
 *   · Ball Possession / Passes % 는 "56%" 문자열이라 `%` 제거 후 parseInt.
 *   · expected_goals · goals_prevented 만 Decimal? — 문자열("5.91"·"-1.67") 그대로 Prisma Decimal 로.
 *     null 이면 컬럼도 null 유지 (예선 픽스처가 이렇게 온다).
 *
 * ## 트랜잭션 (pgbouncer 15 상한)
 *   외부 호출은 트랜잭션 밖. team_match_stats upsert + has_team_stats 세팅만 짧게.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiFootballClient } from '../api-football/api-football.client.js';
import { batchUpsert } from '../../prisma/batch-upsert.js';
import { promoteIfAllDetailsChecked } from '../../common/match-detail-status.js';
import type { ApiFixtureStatisticsItem } from '../api-football/api-football.types.js';

export interface L5TeamStatsResult {
  ok: boolean;
  reason?: string;
  hasTeamStats?: boolean;
  /** 저장된 팀 통계 행 수 (팀 매핑 실패로 빠진 팀은 제외) */
  teams?: number;
  /** 팀 매핑 실패 목록 (apiTeamId) — 있으면 그 팀은 스킵됐다 */
  missingTeams?: number[];
  promoted?: boolean;
}

/** 18컬럼 shape — Prisma raw 로 넣기 위해 snake_case. index signature 는 batchUpsert 제네릭 호환용 */
export type TeamStatsRow = {
  shots_on_goal: number;
  shots_off_goal: number;
  total_shots: number;
  blocked_shots: number;
  shots_insidebox: number;
  shots_outsidebox: number;
  fouls: number;
  corner_kicks: number;
  offsides: number;
  ball_possession: number;
  yellow_cards: number;
  red_cards: number;
  goalkeeper_saves: number;
  total_passes: number;
  passes_accurate: number;
  passes_percentage: number;
  expected_goals: Prisma.Decimal | null;
  goals_prevented: Prisma.Decimal | null;
};

/** 정수형 값 정규화 — null → 0. 문자열 숫자도 받는다 */
function intOrZero(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return Math.trunc(v);
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

/** "56%" · 56 · null → 정수. `%` 제거 후 parseInt. null → 0 (D6) */
function percentToInt(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return Math.trunc(v);
  const cleaned = v.replace('%', '').trim();
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Decimal? — 문자열 그대로 Prisma.Decimal. null 은 null 유지 (D6). "-1.67" · "-0.00" 도 OK */
function decimalOrNull(v: number | string | null | undefined): Prisma.Decimal | null {
  if (v === null || v === undefined) return null;
  // Prisma.Decimal 이 문자열을 그대로 받는다 — "5.91" · "-1.67" · "-0.00"
  return new Prisma.Decimal(typeof v === 'number' ? v : v);
}

/**
 * 18항목 파서 — API 의 `{type,value}` 배열을 컬럼 shape 로 옮긴다 (D6).
 * type 이름 매핑은 실측 그대로: 'Shots on Goal' 등.
 * 알 수 없는 type 은 조용히 무시한다 (API 가 항목을 추가하면 여기가 아니라 스키마가 늘 자리).
 */
export function parseTeamStats(rawStatistics: ReadonlyArray<{ type: string; value: number | string | null }>): TeamStatsRow {
  const map = new Map<string, number | string | null>();
  for (const s of rawStatistics) map.set(s.type, s.value);

  return {
    shots_on_goal: intOrZero(map.get('Shots on Goal')),
    shots_off_goal: intOrZero(map.get('Shots off Goal')),
    total_shots: intOrZero(map.get('Total Shots')),
    blocked_shots: intOrZero(map.get('Blocked Shots')),
    shots_insidebox: intOrZero(map.get('Shots insidebox')),
    shots_outsidebox: intOrZero(map.get('Shots outsidebox')),
    fouls: intOrZero(map.get('Fouls')),
    corner_kicks: intOrZero(map.get('Corner Kicks')),
    offsides: intOrZero(map.get('Offsides')),
    ball_possession: percentToInt(map.get('Ball Possession')),
    yellow_cards: intOrZero(map.get('Yellow Cards')),
    // D6: Red Cards 는 API 가 항상 null — null → 0
    red_cards: intOrZero(map.get('Red Cards')),
    goalkeeper_saves: intOrZero(map.get('Goalkeeper Saves')),
    total_passes: intOrZero(map.get('Total passes')),
    passes_accurate: intOrZero(map.get('Passes accurate')),
    passes_percentage: percentToInt(map.get('Passes %')),
    expected_goals: decimalOrNull(map.get('expected_goals')),
    goals_prevented: decimalOrNull(map.get('goals_prevented')),
  };
}

@Injectable()
export class L5TeamStatsService {
  private readonly logger = new Logger(L5TeamStatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: ApiFootballClient,
  ) {}

  async run(matchId: number, apiFixtureId: number): Promise<L5TeamStatsResult> {
    // 1) 매치 존재·자격 확인 (D19)
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, apiFixtureId: true, detailEligible: true },
    });
    if (!match) {
      this.logger.warn(`L5 team-stats: match id=${matchId} 없음 — skip`);
      return { ok: false, reason: 'match-not-found' };
    }
    if (match.apiFixtureId !== apiFixtureId) {
      this.logger.warn(
        `L5 team-stats: match id=${matchId} 의 apiFixtureId ${match.apiFixtureId} 가 인자 ${apiFixtureId} 와 다르다 — skip`,
      );
      return { ok: false, reason: 'fixture-id-mismatch' };
    }
    if (!match.detailEligible) {
      this.logger.warn(`L5 team-stats: match id=${matchId} 는 detail_eligible=false — skip`);
      return { ok: false, reason: 'not-eligible' };
    }

    // 2) 외부 호출 — 실패면 throw. has_team_stats NULL 유지
    const env = await this.api.get<ApiFixtureStatisticsItem[]>('/fixtures/statistics', { fixture: apiFixtureId });
    const items = env.response ?? [];

    // 3) 빈 응답 → hasTeamStats=false 마감 + 승격 시도 (D3)
    if (items.length === 0) {
      await this.prisma.match.updateMany({
        where: { id: matchId, detailEligible: true },
        data: { hasTeamStats: false },
      });
      const promoted = await promoteIfAllDetailsChecked(this.prisma, matchId);
      return { ok: true, hasTeamStats: false, teams: 0, missingTeams: [], promoted: promoted.promoted };
    }

    // 4) 팀 매핑 (apiTeamId → 내부 teamId). 없는 팀은 warn + skip
    const apiTeamIds = items.map((it) => it.team.id);
    const teams = await this.prisma.team.findMany({
      where: { apiTeamId: { in: apiTeamIds } },
      select: { id: true, apiTeamId: true },
    });
    const teamIdByApi = new Map(teams.map((t) => [t.apiTeamId, t.id]));

    const missingTeams: number[] = [];
    const rows: Array<TeamStatsRow & { match_id: number; team_id: number }> = [];
    for (const it of items) {
      const teamId = teamIdByApi.get(it.team.id);
      if (teamId === undefined) {
        missingTeams.push(it.team.id);
        this.logger.warn(`L5 team-stats: match id=${matchId}, apiTeamId=${it.team.id} 팀 매핑 실패 — 이 팀 skip`);
        continue;
      }
      rows.push({ match_id: matchId, team_id: teamId, ...parseTeamStats(it.statistics) });
    }

    // 5) 응답이 왔고 팀 하나라도 매핑됐다면 has_team_stats=true. 전 팀 매핑 실패면 false 로 마감
    const hasTeamStatsValue = rows.length > 0;

    // 6) 짧은 트랜잭션 — team_match_stats upsert + has_team_stats 세팅 (외부 호출 없음)
    await this.prisma.$transaction(async (tx) => {
      if (rows.length > 0) {
        await batchUpsert<(typeof rows)[number]>(tx, {
          table: 'team_match_stats',
          columns: {
            match_id: 'int',
            team_id: 'int',
            shots_on_goal: 'int',
            shots_off_goal: 'int',
            total_shots: 'int',
            blocked_shots: 'int',
            shots_insidebox: 'int',
            shots_outsidebox: 'int',
            fouls: 'int',
            corner_kicks: 'int',
            offsides: 'int',
            ball_possession: 'int',
            yellow_cards: 'int',
            red_cards: 'int',
            goalkeeper_saves: 'int',
            total_passes: 'int',
            passes_accurate: 'int',
            passes_percentage: 'int',
            // Decimal(5,2) — Prisma.Decimal 값을 그대로 넣는다. null 은 null 유지
            expected_goals: 'numeric',
            goals_prevented: 'numeric',
          },
          conflict: ['match_id', 'team_id'],
          update: [
            'shots_on_goal', 'shots_off_goal', 'total_shots', 'blocked_shots',
            'shots_insidebox', 'shots_outsidebox', 'fouls', 'corner_kicks', 'offsides',
            'ball_possession', 'yellow_cards', 'red_cards', 'goalkeeper_saves',
            'total_passes', 'passes_accurate', 'passes_percentage',
            'expected_goals', 'goals_prevented',
          ],
        }, rows);
      }
      await tx.match.updateMany({
        where: { id: matchId, detailEligible: true },
        data: { hasTeamStats: hasTeamStatsValue },
      });
    });

    // 7) 승격 시도
    const promoted = await promoteIfAllDetailsChecked(this.prisma, matchId);

    return {
      ok: true,
      reason: missingTeams.length > 0 ? `missing-teams:${missingTeams.join(',')}` : undefined,
      hasTeamStats: hasTeamStatsValue,
      teams: rows.length,
      missingTeams,
      promoted: promoted.promoted,
    };
  }
}
