/**
 * L3 라인업 — `/fixtures/lineups?fixture=` 한 콜을 받아 라인업·엔트리를 쓴다.
 *
 * ## 소유권 (D18·D19·D20)
 *   · matches 행에서 건드리는 것은 `has_lineups` 하나뿐 (승격 헬퍼가 detail_checked_at·
 *     stats_state·confirmed_at 을 더 건드린다). `data_version`·`tie_id`·`leg` 은 절대 안 건드림.
 *   · `detail_eligible = false` 인 경기는 입장 검사에서 건너뛴다.
 *   · matches 갱신은 `updateMany + detailEligible:true` 로 count === 1 확인.
 *
 * ## 응답 규약 (D3)
 *   200 + response.length > 0  → hasLineups = true, 라인업·엔트리 upsert
 *   200 + []                   → hasLineups = false (마감), 승격 시도
 *   에러·429·타임아웃          → NULL 유지 (throw). 다음 스케줄 주기가 재시도한다
 *
 * ## 트랜잭션 (pgbouncer 15 상한)
 *   Coach·Player 최소 upsert 는 트랜잭션 밖. 재실행 안전하고 외부 참조가 없다.
 *   MatchLineup·LineupEntry·has_lineups 세팅만 한 트랜잭션에 짧게 넣는다.
 *
 * ## 오케스트레이터
 *   이 서비스는 단일 매치를 받는다. 여러 매치를 도는 루프·큐는 다음 판(오케스트레이터) 소관.
 *   실 API 는 여기서도 부르지 않는다 — 스케줄러 시점에만 호출한다는 규칙에 따라
 *   위쪽 orchestrator 가 이 서비스를 부른다.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiFootballClient } from '../api-football/api-football.client.js';
import { batchUpsert } from '../../prisma/batch-upsert.js';
import { promoteIfAllDetailsChecked } from '../../common/match-detail-status.js';
import type { ApiFixtureLineupItem } from '../api-football/api-football.types.js';

export interface L3LineupsResult {
  ok: boolean;
  /** 실패·건너뜀 사유. ok=true 여도 채워질 수 있다 (팀 매핑 실패 등 부분) */
  reason?: string;
  /** hasLineups 최종값 */
  hasLineups?: boolean;
  /** 저장한 라인업·엔트리 수 */
  lineups?: number;
  entries?: number;
  /** 승격 결과 */
  promoted?: boolean;
}

@Injectable()
export class L3LineupsService {
  private readonly logger = new Logger(L3LineupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: ApiFootballClient,
  ) {}

  async run(matchId: number, apiFixtureId: number): Promise<L3LineupsResult> {
    // 1) 매치 존재·자격 확인. detail_eligible=false 는 여기서 건너뛴다 (D19)
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        apiFixtureId: true,
        detailEligible: true,
        homeTeamId: true,
        awayTeamId: true,
      },
    });
    if (!match) {
      this.logger.warn(`L3 lineups: match id=${matchId} 없음 — skip`);
      return { ok: false, reason: 'match-not-found' };
    }
    if (match.apiFixtureId !== apiFixtureId) {
      this.logger.warn(
        `L3 lineups: match id=${matchId} 의 apiFixtureId ${match.apiFixtureId} 가 인자 ${apiFixtureId} 와 다르다 — skip`,
      );
      return { ok: false, reason: 'fixture-id-mismatch' };
    }
    if (!match.detailEligible) {
      this.logger.warn(`L3 lineups: match id=${matchId} 는 detail_eligible=false — skip`);
      return { ok: false, reason: 'not-eligible' };
    }

    // 2) 외부 호출. 실패면 그대로 throw — has_lineups NULL 유지
    const env = await this.api.get<ApiFixtureLineupItem[]>('/fixtures/lineups', { fixture: apiFixtureId });
    const items = env.response ?? [];

    // 3) 빈 응답 → hasLineups=false 마감 + 승격 시도 (D3)
    if (items.length === 0) {
      await this.prisma.match.updateMany({
        where: { id: matchId, detailEligible: true },
        data: { hasLineups: false },
      });
      const promoted = await promoteIfAllDetailsChecked(this.prisma, matchId);
      return { ok: true, hasLineups: false, lineups: 0, entries: 0, promoted: promoted.promoted };
    }

    // 4) Coach 최소 upsert (id 가 있는 것만). 트랜잭션 밖 (D9: null 이면 coachId=null 로 저장)
    const coachRows = items
      .filter((it) => it.coach.id !== null)
      .map((it) => ({
        api_coach_id: it.coach.id as number,
        name: it.coach.name,
        photo_url: it.coach.photo,
      }));
    const coachIdByApi = new Map<number, number>();
    if (coachRows.length > 0) {
      const res = await batchUpsert<(typeof coachRows)[number], { id: number; api_coach_id: number }>(this.prisma, {
        table: 'coaches',
        columns: { api_coach_id: 'int', name: 'text', photo_url: 'text' },
        conflict: ['api_coach_id'],
        update: ['name', 'photo_url'],
        returning: ['id', 'api_coach_id'],
      }, coachRows);
      for (const r of res.returned) coachIdByApi.set(r.api_coach_id, r.id);
    }

    // 5) Player 최소 upsert (startXI + substitutes 의 player.id 목록)
    const playerRows = items.flatMap((it) =>
      [...it.startXI, ...it.substitutes].map((e) => ({
        api_player_id: e.player.id,
        name: e.player.name,
        photo_url: null as string | null,
      })),
    );
    const playerIdByApi = new Map<number, number>();
    if (playerRows.length > 0) {
      const res = await batchUpsert<(typeof playerRows)[number], { id: number; api_player_id: number }>(this.prisma, {
        table: 'players',
        columns: { api_player_id: 'int', name: 'text', photo_url: 'text' },
        conflict: ['api_player_id'],
        // photo_url 은 lineups 응답에 없다 — 기존 값을 지우지 않도록 update 목록에서 제외
        update: ['name'],
        updatedAtColumn: 'updated_at',
        returning: ['id', 'api_player_id'],
      }, playerRows);
      for (const r of res.returned) playerIdByApi.set(r.api_player_id, r.id);
    }

    // 6) 팀 매핑. apiTeamId → 내부 teamId. 없으면 그 팀은 통째로 skip 후 warn
    const apiTeamIds = items.map((it) => it.team.id);
    const teams = await this.prisma.team.findMany({
      where: { apiTeamId: { in: apiTeamIds } },
      select: { id: true, apiTeamId: true },
    });
    const teamIdByApi = new Map(teams.map((t) => [t.apiTeamId, t.id]));

    // 7) MatchLineup · LineupEntry 행 준비
    const lineupRows: Array<{
      match_id: number;
      team_id: number;
      formation: string | null;
      coach_id: number | null;
    }> = [];
    const entryRows: Array<{
      match_id: number;
      team_id: number;
      player_id: number;
      jersey_number: number | null;
      position: string | null;
      grid: string | null;
      is_starter: boolean;
    }> = [];

    const missingTeams: number[] = [];
    for (const it of items) {
      const teamId = teamIdByApi.get(it.team.id);
      if (teamId === undefined) {
        missingTeams.push(it.team.id);
        this.logger.warn(`L3 lineups: match id=${matchId}, apiTeamId=${it.team.id} 팀 매핑 실패 — 이 팀 skip`);
        continue;
      }
      const coachId = it.coach.id !== null ? (coachIdByApi.get(it.coach.id) ?? null) : null;
      lineupRows.push({
        match_id: matchId,
        team_id: teamId,
        formation: it.formation ?? null,
        coach_id: coachId,
      });
      for (const e of it.startXI) {
        const playerId = playerIdByApi.get(e.player.id);
        if (playerId === undefined) continue;
        entryRows.push({
          match_id: matchId,
          team_id: teamId,
          player_id: playerId,
          jersey_number: e.player.number ?? null,
          position: e.player.pos ?? null,
          grid: e.player.grid ?? null,
          is_starter: true,
        });
      }
      for (const e of it.substitutes) {
        const playerId = playerIdByApi.get(e.player.id);
        if (playerId === undefined) continue;
        entryRows.push({
          match_id: matchId,
          team_id: teamId,
          player_id: playerId,
          jersey_number: e.player.number ?? null,
          position: e.player.pos ?? null,
          // 벤치는 항상 null (DTO 규약)
          grid: null,
          is_starter: false,
        });
      }
    }

    // 8) 짧은 트랜잭션 — lineups + entries + has_lineups 세팅
    // hasLineups 값: 응답이 왔고 우리가 팀 하나라도 매핑에 성공했다면 true. 전 팀 매핑 실패면 false 로 마감
    const hasLineupsValue = lineupRows.length > 0;

    let lineupsCount = 0;
    let entriesCount = 0;
    await this.prisma.$transaction(async (tx) => {
      if (lineupRows.length > 0) {
        const r = await batchUpsert<(typeof lineupRows)[number]>(tx, {
          table: 'match_lineups',
          columns: { match_id: 'int', team_id: 'int', formation: 'text', coach_id: 'int' },
          conflict: ['match_id', 'team_id'],
          update: ['formation', 'coach_id'],
        }, lineupRows);
        lineupsCount = r.rows;
      }
      if (entryRows.length > 0) {
        const r = await batchUpsert<(typeof entryRows)[number]>(tx, {
          table: 'lineup_entries',
          columns: {
            match_id: 'int', team_id: 'int', player_id: 'int',
            jersey_number: 'int', position: 'text', grid: 'text', is_starter: 'boolean',
          },
          conflict: ['match_id', 'player_id'],
          update: ['team_id', 'jersey_number', 'position', 'grid', 'is_starter'],
        }, entryRows);
        entriesCount = r.rows;
      }
      await tx.match.updateMany({
        where: { id: matchId, detailEligible: true },
        data: { hasLineups: hasLineupsValue },
      });
    });

    // 9) 승격 시도 (다른 has_* 가 아직 NULL 이면 조용히 no-op)
    const promoted = await promoteIfAllDetailsChecked(this.prisma, matchId);

    const reason = missingTeams.length > 0 ? `missing-teams:${missingTeams.join(',')}` : undefined;
    return {
      ok: true,
      reason,
      hasLineups: hasLineupsValue,
      lineups: lineupsCount,
      entries: entriesCount,
      promoted: promoted.promoted,
    };
  }
}
