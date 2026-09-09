/**
 * L3 이벤트 — `/fixtures/events?fixture=` 한 콜을 받아 match_events 를 다시 쓴다.
 *
 * ## 왜 deleteMany + createMany 인가 (D12)
 * 재실행 시 이벤트 수가 줄면 옛 행이 남는다 (예: VAR 취소로 골이 사라짐).
 * 이벤트는 `(match_id, seq)` 가 유일하므로 upsert 로는 옛 seq 를 지울 수 없다 —
 * 한 번에 지우고 다시 쓴다. 트랜잭션은 짧게 유지한다.
 *
 * ## 정렬 (D8)
 * API 응답이 시간순이 **아니다** (fixture 1557387 실측: 90+5 카드가 90분 교체 앞에 옴).
 * (time.elapsed asc, time.extra asc, 원 index asc) 로 정렬해 seq = 0..N 을 매긴다.
 * `minute_extra` 컬럼은 NULL 유지 — API extra 는 정렬용으로만 쓴다.
 *
 * ## Player 매핑 (D9)
 * `player.id` 가 lineups 응답에 없을 수 있다. 이름이 있으면 최소 upsert 로 만들고,
 * id 도 이름도 없으면 그냥 playerId = null 로 저장. assist 도 같음.
 * team.id 나 time.elapsed 가 null 이면 그 행은 skip + warn (팀 없이는 방향을 못 잡는다).
 *
 * ## 소유권 (D18·D19·D20)
 * matches 갱신은 `has_events` 하나 (+ 승격 헬퍼가 detail_checked_at·stats_state·confirmed_at).
 * `updateMany + detailEligible:true` 로 count === 1 확인.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiFootballClient } from '../api-football/api-football.client.js';
import { batchUpsert } from '../../prisma/batch-upsert.js';
import { promoteIfAllDetailsChecked } from '../../common/match-detail-status.js';
import type { ApiFixtureEventItem } from '../api-football/api-football.types.js';

export interface L3EventsResult {
  ok: boolean;
  reason?: string;
  hasEvents?: boolean;
  events?: number;
  /** 정렬·매핑 등에서 버려진 이벤트 수 */
  dropped?: number;
  promoted?: boolean;
}

interface OrderedEvent {
  item: ApiFixtureEventItem;
  index: number;
}

/** (elapsed asc, extra asc, index asc) 정렬. null 은 0 으로 취급 (정렬 안정성만 필요) */
export function sortEvents(items: readonly ApiFixtureEventItem[]): OrderedEvent[] {
  const ordered: OrderedEvent[] = items.map((item, index) => ({ item, index }));
  ordered.sort((a, b) => {
    const ea = a.item.time.elapsed ?? 0;
    const eb = b.item.time.elapsed ?? 0;
    if (ea !== eb) return ea - eb;
    const xa = a.item.time.extra ?? 0;
    const xb = b.item.time.extra ?? 0;
    if (xa !== xb) return xa - xb;
    return a.index - b.index;
  });
  return ordered;
}

@Injectable()
export class L3EventsService {
  private readonly logger = new Logger(L3EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: ApiFootballClient,
  ) {}

  async run(matchId: number, apiFixtureId: number): Promise<L3EventsResult> {
    // 1) 매치 존재·자격 확인
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, apiFixtureId: true, detailEligible: true },
    });
    if (!match) {
      this.logger.warn(`L3 events: match id=${matchId} 없음 — skip`);
      return { ok: false, reason: 'match-not-found' };
    }
    if (match.apiFixtureId !== apiFixtureId) {
      this.logger.warn(
        `L3 events: match id=${matchId} 의 apiFixtureId ${match.apiFixtureId} 가 인자 ${apiFixtureId} 와 다르다 — skip`,
      );
      return { ok: false, reason: 'fixture-id-mismatch' };
    }
    if (!match.detailEligible) {
      this.logger.warn(`L3 events: match id=${matchId} 는 detail_eligible=false — skip`);
      return { ok: false, reason: 'not-eligible' };
    }

    // 2) 외부 호출. 실패면 그대로 throw — has_events NULL 유지
    const env = await this.api.get<ApiFixtureEventItem[]>('/fixtures/events', { fixture: apiFixtureId });
    const items = env.response ?? [];

    // 3) 빈 응답 → 옛 이벤트 지우고 hasEvents=false
    if (items.length === 0) {
      await this.prisma.$transaction([
        this.prisma.matchEvent.deleteMany({ where: { matchId } }),
        this.prisma.match.updateMany({
          where: { id: matchId, detailEligible: true },
          data: { hasEvents: false },
        }),
      ]);
      const promoted = await promoteIfAllDetailsChecked(this.prisma, matchId);
      return { ok: true, hasEvents: false, events: 0, dropped: 0, promoted: promoted.promoted };
    }

    // 4) 정렬 (D8) — 응답이 시간순이 아니다
    const ordered = sortEvents(items);

    // 5) 팀 매핑 준비
    const apiTeamIds = new Set<number>();
    for (const o of ordered) {
      if (o.item.team.id !== null) apiTeamIds.add(o.item.team.id);
    }
    const teams = await this.prisma.team.findMany({
      where: { apiTeamId: { in: [...apiTeamIds] } },
      select: { id: true, apiTeamId: true },
    });
    const teamIdByApi = new Map(teams.map((t) => [t.apiTeamId, t.id]));

    // 6) Player 최소 upsert — id 가 있고 이름도 있는 것만 (id 있는데 이름 없는 경우도 실측 존재)
    const playerRowsMap = new Map<number, { api_player_id: number; name: string }>();
    for (const o of ordered) {
      const pid = o.item.player.id;
      const pname = o.item.player.name;
      if (pid !== null && pname !== null && pname !== '' && !playerRowsMap.has(pid)) {
        playerRowsMap.set(pid, { api_player_id: pid, name: pname });
      }
      const aid = o.item.assist.id;
      const aname = o.item.assist.name;
      if (aid !== null && aname !== null && aname !== '' && !playerRowsMap.has(aid)) {
        playerRowsMap.set(aid, { api_player_id: aid, name: aname });
      }
    }
    const playerIdByApi = new Map<number, number>();
    const playerRows = [...playerRowsMap.values()];
    if (playerRows.length > 0) {
      const res = await batchUpsert<(typeof playerRows)[number], { id: number; api_player_id: number }>(this.prisma, {
        table: 'players',
        columns: { api_player_id: 'int', name: 'text' },
        conflict: ['api_player_id'],
        // 이름은 lineups 에도 있으므로 갱신. photo_url 은 이벤트 응답에 없으니 건드리지 않는다
        update: ['name'],
        updatedAtColumn: 'updated_at',
        returning: ['id', 'api_player_id'],
      }, playerRows);
      for (const r of res.returned) playerIdByApi.set(r.api_player_id, r.id);
    }

    // 7) 행 구성. team.id 나 time.elapsed 가 null 이면 skip (팀 없이는 방향을 못 잡는다)
    let dropped = 0;
    const rows: Array<{
      match_id: number;
      seq: number;
      minute: number;
      minute_extra: number | null;
      team_id: number;
      player_id: number | null;
      assist_player_id: number | null;
      type: string;
      detail: string | null;
      comments: string | null;
    }> = [];
    let seq = 0;
    for (const o of ordered) {
      const t = o.item.team.id;
      const elapsed = o.item.time.elapsed;
      if (t === null || elapsed === null) {
        dropped++;
        this.logger.warn(
          `L3 events: match id=${matchId} — team=${t} elapsed=${elapsed} 행 skip (원 index ${o.index})`,
        );
        continue;
      }
      const teamId = teamIdByApi.get(t);
      if (teamId === undefined) {
        dropped++;
        this.logger.warn(`L3 events: match id=${matchId}, apiTeamId=${t} 팀 매핑 실패 — 이 행 skip`);
        continue;
      }
      const playerId = o.item.player.id !== null ? (playerIdByApi.get(o.item.player.id) ?? null) : null;
      const assistId = o.item.assist.id !== null ? (playerIdByApi.get(o.item.assist.id) ?? null) : null;
      rows.push({
        match_id: matchId,
        seq: seq++,
        minute: elapsed,
        // API extra 는 정렬용으로만 썼다. 저장 컬럼은 NULL 유지 (D8)
        minute_extra: null,
        team_id: teamId,
        player_id: playerId,
        assist_player_id: assistId,
        type: o.item.type,
        detail: o.item.detail ?? null,
        comments: o.item.comments ?? null,
      });
    }

    // 8) 트랜잭션 — delete + insert + has_events 세팅
    const hasEventsValue = rows.length > 0;
    await this.prisma.$transaction(async (tx) => {
      await tx.matchEvent.deleteMany({ where: { matchId } });
      if (rows.length > 0) {
        await batchUpsert<(typeof rows)[number]>(tx, {
          table: 'match_events',
          columns: {
            match_id: 'int', seq: 'int', minute: 'int', minute_extra: 'int',
            team_id: 'int', player_id: 'int', assist_player_id: 'int',
            type: 'text', detail: 'text', comments: 'text',
          },
          conflict: ['match_id', 'seq'],
          update: [
            'minute', 'minute_extra', 'team_id', 'player_id', 'assist_player_id',
            'type', 'detail', 'comments',
          ],
        }, rows);
      }
      await tx.match.updateMany({
        where: { id: matchId, detailEligible: true },
        data: { hasEvents: hasEventsValue },
      });
    });

    const promoted = await promoteIfAllDetailsChecked(this.prisma, matchId);
    return {
      ok: true,
      hasEvents: hasEventsValue,
      events: rows.length,
      dropped,
      promoted: promoted.promoted,
    };
  }
}
