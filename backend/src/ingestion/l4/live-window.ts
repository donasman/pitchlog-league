/**
 * L4 관측 모드용 순수 함수 계층.
 *
 * DB 쓰기 없음 — 이 파일은 상수 · 인터페이스 · 5개 순수 함수만 노출한다.
 * 서비스는 이 함수를 호출해 대상 선정 · 청크 분할 · 주기 결정 · 전이 분류를 한다.
 */

/** 대상 0 일 때 다음 tick 예약 초. env 아님. */
export const LIVE_IDLE_CHECK_SEC = 60;

/** 관측 대상에서 제외되는 종료 상태 (kickoff 창 안이라도 뽑지 않음). */
export const TERMINAL_STATUSES = ['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO'] as const;

/** 첫 관측이 이 상태이면 detail 로그 트리거. */
export const FINAL_TERMINAL_STATUSES = ['FT', 'AET', 'PEN'] as const;

/** 관측 시 즉시 제외 대상. memory.excluded 에 넣는다. */
export const EXCLUDE_STATUSES = ['PST', 'CANC', 'ABD'] as const;

/** FT 관측 후 10분 동안은 창에 유지한다 (전이 로그 안정화용). */
export const FT_TTL_MS = 10 * 60 * 1000;

/** kickoff 창 하한 (now-4h). */
export const WINDOW_LOOKBACK_MS = 4 * 60 * 60 * 1000;

/** kickoff 창 상한 (now+5m). */
export const WINDOW_LOOKAHEAD_MS = 5 * 60 * 1000;

export interface LiveDbRow {
  apiFixtureId: number;
  kickoffAt: Date;
  statusShort: string;
  elapsed: number | null;
  extraElapsed: number | null;
  goalsHome: number | null;
  goalsAway: number | null;
}

export interface MemoryFilter {
  /** FT 관측 시각. FT_TTL_MS 이상 지나면 제외. */
  finishedAt: Map<number, Date>;
  /** PST/CANC/ABD 관측된 apiFixtureId. */
  excluded: Set<number>;
}

export interface ProbeEntry {
  apiFixtureId: number;
  kickoffAt: Date;
  statusShort: string;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  seenAt: Date;
}

export interface LastSeen {
  statusShort: string;
  elapsed: number | null;
  extraElapsed: number | null;
  goalsHome: number | null;
  goalsAway: number | null;
}

export interface LivePollerConfig {
  slowAt: number;
  stopAt: number;
  periodSec: number;
  slowPeriodSec: number;
}

export type Transition = 'none' | 'status' | 'score' | 'both';

/** kickoff 창 (now-4h ≤ kickoffAt ≤ now+5m) 안이면서 memoryFilter 를 통과하는 DB 대상. */
export function selectDbTargets(
  rows: readonly LiveDbRow[],
  memoryFilter: MemoryFilter,
  now: Date,
): number[] {
  const nowMs = now.getTime();
  const lower = nowMs - WINDOW_LOOKBACK_MS;
  const upper = nowMs + WINDOW_LOOKAHEAD_MS;

  const filtered = rows.filter((r) => {
    const k = r.kickoffAt.getTime();
    if (k < lower || k > upper) return false;
    if (memoryFilter.excluded.has(r.apiFixtureId)) return false;
    const finished = memoryFilter.finishedAt.get(r.apiFixtureId);
    if (finished) {
      if (nowMs - finished.getTime() > FT_TTL_MS) return false;
    }
    return true;
  });

  filtered.sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());
  return filtered.map((r) => r.apiFixtureId);
}

/** Probe 대상 — kickoff 창 + memoryFilter 만 본다. statusShort 자체 필터 없음. */
export function selectProbeTargets(
  probes: ReadonlyMap<number, ProbeEntry>,
  memoryFilter: MemoryFilter,
  now: Date,
): number[] {
  const nowMs = now.getTime();
  const lower = nowMs - WINDOW_LOOKBACK_MS;
  const upper = nowMs + WINDOW_LOOKAHEAD_MS;

  const out: { id: number; kickoffMs: number }[] = [];
  for (const [id, p] of probes) {
    const k = p.kickoffAt.getTime();
    if (k < lower || k > upper) continue;
    if (memoryFilter.excluded.has(id)) continue;
    const finished = memoryFilter.finishedAt.get(id);
    if (finished && nowMs - finished.getTime() > FT_TTL_MS) continue;
    out.push({ id, kickoffMs: k });
  }
  out.sort((a, b) => a.kickoffMs - b.kickoffMs);
  return out.map((x) => x.id);
}

/** id 배열을 chunkSize 마다 잘라 하이픈 join. 빈 입력 → []. */
export function chunkIds(ids: readonly number[], chunkSize = 20): string[] {
  if (ids.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    out.push(ids.slice(i, i + chunkSize).join('-'));
  }
  return out;
}

/** 쿼터 사용량에 따라 주기 결정. usedToday=null → 정상. */
export function decidePeriod(
  usedToday: number | null,
  cfg: LivePollerConfig,
): { periodSec: number; stopped: boolean; reason: 'quota_stop' | null } {
  if (usedToday === null) {
    return { periodSec: cfg.periodSec, stopped: false, reason: null };
  }
  if (usedToday >= cfg.stopAt) {
    return { periodSec: cfg.periodSec, stopped: true, reason: 'quota_stop' };
  }
  if (usedToday >= cfg.slowAt) {
    return { periodSec: cfg.slowPeriodSec, stopped: false, reason: null };
  }
  return { periodSec: cfg.periodSec, stopped: false, reason: null };
}

/** 전이 분류 — prev=null → 'none'. 그 외 status/score 조합. */
export function classifyTransition(
  prev: { statusShort: string; goalsHome: number | null; goalsAway: number | null } | null,
  next: { statusShort: string; goalsHome: number | null; goalsAway: number | null },
): Transition {
  if (prev === null) return 'none';
  const statusChanged = prev.statusShort !== next.statusShort;
  const scoreChanged = prev.goalsHome !== next.goalsHome || prev.goalsAway !== next.goalsAway;
  if (statusChanged && scoreChanged) return 'both';
  if (statusChanged) return 'status';
  if (scoreChanged) return 'score';
  return 'none';
}
