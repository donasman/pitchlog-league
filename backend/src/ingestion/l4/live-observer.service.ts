/**
 * L4 관측 모드 — LiveObserverService.
 *
 * 이 서비스는 DB 쓰기가 없다. `prisma.match.findMany` 만 부른다 (관측 창 조회).
 * 실시간 갱신은 L4 실행 단계 이후 판에서 붙인다.
 *
 * tick 흐름:
 *   1. DB 창 조회 (findMany)
 *   2. selectDbTargets · selectProbeTargets → dedup
 *   3. 대상 0 이면 바로 반환
 *   4. opts.fetchStatus 이면 /status 호출해 used 갱신
 *   5. chunkIds(20) → /fixtures?ids=... 청크별 호출
 *   6. 응답 파싱 · wouldWrite · 전이 · detail · lastSeen 갱신
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ApiFootballClient } from '../api-football/api-football.client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ApiEnvelope, ApiFixture, ApiStatus } from '../api-football/api-football.types.js';
import {
  selectDbTargets,
  selectProbeTargets,
  chunkIds,
  classifyTransition,
  TERMINAL_STATUSES,
  FINAL_TERMINAL_STATUSES,
  EXCLUDE_STATUSES,
} from './live-window.js';
import type {
  LiveDbRow,
  MemoryFilter,
  ProbeEntry,
  LastSeen,
} from './live-window.js';
import { LiveWriterService } from './live-writer.service.js';

export type LivePollerMode = 'observe' | 'write';

export interface TickOpts {
  fetchStatus: boolean;
  mode: LivePollerMode;
}

export interface TickTransition {
  apiFixtureId: number;
  home: string;
  away: string;
  prev: string;
  next: string;
  goalsHome: number | null;
  goalsAway: number | null;
  kind: 'status' | 'score' | 'both';
}

export interface TickDetail {
  apiFixtureId: number;
  home: string;
  away: string;
  events: number;
  lineups: number;
  statistics: number;
  players: number;
  isProbe: boolean;
}

export interface TickResult {
  targets: number;
  liveCount: number;
  chunks: number;
  bytes: number;
  ms: number;
  used: number | null;
  wouldWrite: number;
  /** 이번 tick 에 실제로 조건부 UPDATE 가 성공한 수 (mode='write' 에서만 증가). */
  written: number;
  /** 역행 가드로 UPDATE 가 0행 반환한 수 (mode='write' 에서만 증가). */
  blocked: number;
  isProbe: boolean;
  transitions: TickTransition[];
  details: TickDetail[];
}

interface FiveField {
  statusShort: string;
  elapsed: number | null;
  extraElapsed: number | null;
  goalsHome: number | null;
  goalsAway: number | null;
}

/** 5컬럼 (statusShort · elapsed · extraElapsed · goalsHome · goalsAway) 중 다른 필드 수. */
function countDiffs5(a: FiveField, b: FiveField): number {
  let n = 0;
  if (a.statusShort !== b.statusShort) n++;
  if (a.elapsed !== b.elapsed) n++;
  if (a.extraElapsed !== b.extraElapsed) n++;
  if (a.goalsHome !== b.goalsHome) n++;
  if (a.goalsAway !== b.goalsAway) n++;
  return n;
}

const LIVE_EXCLUDE_STATUSES: readonly string[] = [
  'NS',
  'TBD',
  'FT',
  'AET',
  'PEN',
  'PST',
  'CANC',
  'ABD',
  'AWD',
  'WO',
];

@Injectable()
export class LiveObserverService {
  private readonly logger = new Logger(LiveObserverService.name);

  constructor(
    private readonly api: ApiFootballClient,
    private readonly prisma: PrismaService,
    @Optional() private readonly writer?: LiveWriterService,
  ) {}

  async tick(
    now: Date,
    memory: MemoryFilter,
    probes: ReadonlyMap<number, ProbeEntry>,
    lastSeen: Map<number, LastSeen>,
    opts: TickOpts,
  ): Promise<TickResult> {
    const start = Date.now();

    // 1) DB 창 조회
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const fiveMinsFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    const dbRowsRaw = await this.prisma.match.findMany({
      where: {
        kickoffAt: { gte: fourHoursAgo, lte: fiveMinsFromNow },
        statusShort: { notIn: [...TERMINAL_STATUSES] },
        competitionSeason: { competition: { isTracked: true } },
      },
      select: {
        apiFixtureId: true,
        kickoffAt: true,
        statusShort: true,
        elapsed: true,
        extraElapsed: true,
        goalsHome: true,
        goalsAway: true,
      },
    });
    const dbRows: LiveDbRow[] = dbRowsRaw;

    // 2) 대상 선정 · dedup
    const dbTargets = selectDbTargets(dbRows, memory, now);
    const probeTargets = selectProbeTargets(probes, memory, now);
    const seen = new Set<number>();
    const allTargets: number[] = [];
    for (const id of dbTargets) {
      if (!seen.has(id)) {
        seen.add(id);
        allTargets.push(id);
      }
    }
    for (const id of probeTargets) {
      if (!seen.has(id)) {
        seen.add(id);
        allTargets.push(id);
      }
    }

    const dbRowMap = new Map<number, LiveDbRow>(dbRows.map((r) => [r.apiFixtureId, r]));

    // 3) 대상 0 → 종료
    if (allTargets.length === 0) {
      return {
        targets: 0,
        liveCount: 0,
        chunks: 0,
        bytes: 0,
        ms: Date.now() - start,
        used: null,
        wouldWrite: 0,
        written: 0,
        blocked: 0,
        isProbe: false,
        transitions: [],
        details: [],
      };
    }

    // 4) /status
    let used: number | null = null;
    if (opts.fetchStatus) {
      const status = await this.api.get<ApiStatus>('/status');
      used = status.response.requests.current;
    }

    // 5) 청크 분할
    const chunkStrs = chunkIds(allTargets, 20);
    const isProbe = allTargets.some((id) => probes.has(id));

    let bytes = 0;
    let chunks = 0;
    let liveCount = 0;
    let wouldWrite = 0;
    let written = 0;
    let blocked = 0;
    const transitions: TickTransition[] = [];
    const details: TickDetail[] = [];

    for (const chunkStr of chunkStrs) {
      const env: ApiEnvelope<ApiFixture[]> = await this.api.get<ApiFixture[]>('/fixtures', {
        ids: chunkStr,
      });
      bytes += JSON.stringify(env).length;
      chunks += 1;

      for (const raw of env.response as unknown[]) {
        const item = raw as Record<string, unknown>;
        const f = item.fixture as {
          id: number;
          status: { short: string; long?: string | null; elapsed: number | null; extra: number | null };
        };
        const teams = item.teams as { home: { name: string }; away: { name: string } };
        const goals = item.goals as { home: number | null; away: number | null };
        const score = (item.score ?? {}) as {
          halftime?: { home: number | null; away: number | null } | null;
          fulltime?: { home: number | null; away: number | null } | null;
          extratime?: { home: number | null; away: number | null } | null;
          penalty?: { home: number | null; away: number | null } | null;
        };

        const id = f.id;
        const isProbeFixture = probes.has(id);
        const next: LastSeen = {
          statusShort: f.status.short,
          elapsed: f.status.elapsed,
          extraElapsed: f.status.extra,
          goalsHome: goals.home,
          goalsAway: goals.away,
        };
        const prev = lastSeen.get(id) ?? null;

        // wouldWrite (probe 매치는 0). 행 단위 — 5 컬럼 중 하나라도 다르면 +1.
        let shouldWrite = false;
        if (!isProbeFixture) {
          if (prev === null) {
            const dbRow = dbRowMap.get(id);
            if (dbRow && countDiffs5(dbRow, next) > 0) {
              wouldWrite += 1;
              shouldWrite = true;
            }
          } else {
            if (countDiffs5(prev, next) > 0) {
              wouldWrite += 1;
              shouldWrite = true;
            }
          }
        }

        // 쓰기 모드 — probe 는 절대 쓰지 않는다. diff 있을 때만 조건부 UPDATE 시도.
        if (shouldWrite && opts.mode === 'write' && this.writer) {
          const prevForLog =
            prev?.statusShort ?? dbRowMap.get(id)?.statusShort ?? '?';
          const prevElapsedForLog =
            prev?.elapsed ?? dbRowMap.get(id)?.elapsed ?? null;
          try {
            const r = await this.writer.write({
              apiFixtureId: id,
              statusShort: next.statusShort,
              statusLong: f.status.long ?? null,
              elapsed: next.elapsed,
              extraElapsed: next.extraElapsed,
              goalsHome: next.goalsHome,
              goalsAway: next.goalsAway,
              htHome: score.halftime?.home ?? null,
              htAway: score.halftime?.away ?? null,
              ftHome: score.fulltime?.home ?? null,
              ftAway: score.fulltime?.away ?? null,
              etHome: score.extratime?.home ?? null,
              etAway: score.extratime?.away ?? null,
              penHome: score.penalty?.home ?? null,
              penAway: score.penalty?.away ?? null,
            });
            written += r.written;
            blocked += r.blocked;
            if (r.written) {
              this.logger.log(
                `live-poller write · ${id} ${teams.home.name}-${teams.away.name} ` +
                  `${prevForLog}→${next.statusShort} ${next.goalsHome ?? 0}-${next.goalsAway ?? 0}`,
              );
            } else {
              this.logger.log(
                `live-poller blocked · ${id} ${prevForLog}(${prevElapsedForLog ?? '-'})` +
                  ` ← ${next.statusShort}(${next.elapsed ?? '-'})`,
              );
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`live-poller write error · ${id}: ${msg}`);
          }
        }

        // 전이
        const kind = classifyTransition(prev, next);
        if (kind !== 'none') {
          transitions.push({
            apiFixtureId: id,
            home: teams.home.name,
            away: teams.away.name,
            prev: prev?.statusShort ?? next.statusShort,
            next: next.statusShort,
            goalsHome: goals.home,
            goalsAway: goals.away,
            kind,
          });
        }

        // detail 트리거: 전이가 있거나 · 첫 관측이며 FT/AET/PEN
        const isFirstObs = prev === null;
        const isFirstTerminal =
          isFirstObs && (FINAL_TERMINAL_STATUSES as readonly string[]).includes(next.statusShort);
        const shouldDetail = kind !== 'none' || isFirstTerminal;
        if (shouldDetail) {
          details.push({
            apiFixtureId: id,
            home: teams.home.name,
            away: teams.away.name,
            events: Array.isArray(item.events) ? (item.events as unknown[]).length : -1,
            lineups: Array.isArray(item.lineups) ? (item.lineups as unknown[]).length : -1,
            statistics: Array.isArray(item.statistics) ? (item.statistics as unknown[]).length : -1,
            players: Array.isArray(item.players) ? (item.players as unknown[]).length : -1,
            isProbe: isProbeFixture,
          });
        }

        // 메모리 필터 갱신 — FINAL_TERMINAL_STATUSES 전부(FT · AET · PEN) 를 finishedAt 에 기록.
        // 처음 본 시각만 기록 — 매 tick 갱신하면 FT_TTL 이 재시작돼 관측 창이 닫히지 않는다.
        if ((FINAL_TERMINAL_STATUSES as readonly string[]).includes(next.statusShort)) {
          if (!memory.finishedAt.has(id)) memory.finishedAt.set(id, now);
        }
        if ((EXCLUDE_STATUSES as readonly string[]).includes(next.statusShort)) {
          memory.excluded.add(id);
        }

        // lastSeen 갱신 (전이·wouldWrite 판정 이후)
        lastSeen.set(id, next);

        // liveCount 카운트
        if (!LIVE_EXCLUDE_STATUSES.includes(next.statusShort)) liveCount += 1;
      }
    }

    return {
      targets: allTargets.length,
      liveCount,
      chunks,
      bytes,
      ms: Date.now() - start,
      used,
      wouldWrite,
      written,
      blocked,
      isProbe,
      transitions,
      details,
    };
  }

  /**
   * Probe 매시 fetch. probes 를 mutate.
   * 응답에 없는 id 는 기존 값 유지 · missing 개수를 반환.
   */
  async refreshProbe(
    now: Date,
    probes: Map<number, ProbeEntry>,
    probeIds: readonly number[],
  ): Promise<{ used: number | null; results: number; missing: number }> {
    if (probeIds.length === 0) return { used: null, results: 0, missing: 0 };
    const chunk = probeIds.join('-');
    const env: ApiEnvelope<ApiFixture[]> = await this.api.get<ApiFixture[]>('/fixtures', {
      ids: chunk,
    });
    const seenIds = new Set<number>();
    for (const raw of env.response as unknown[]) {
      const item = raw as Record<string, unknown>;
      const f = item.fixture as { id: number; date: string; status: { short: string } };
      const teams = item.teams as { home: { name: string }; away: { name: string } };
      const goals = item.goals as { home: number | null; away: number | null };
      const id = f.id;
      seenIds.add(id);
      probes.set(id, {
        apiFixtureId: id,
        kickoffAt: new Date(f.date),
        statusShort: f.status.short,
        home: teams.home.name,
        away: teams.away.name,
        homeGoals: goals.home,
        awayGoals: goals.away,
        seenAt: now,
      });
    }
    const missing = probeIds.filter((id) => !seenIds.has(id)).length;
    return { used: null, results: env.response.length, missing };
  }
}
