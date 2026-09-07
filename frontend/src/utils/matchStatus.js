/**
 * 경기 상태 유틸리티
 * API-Football 상태 코드를 화면 표시 상태로 변환.
 * STATUS_LABELS / STATUS_DESCRIPTIONS 는 번역 키 맵으로 교체됨.
 * 실제 문자열은 MatchStatusBadge 에서 useTranslation().t() 로 해석.
 */

/**
 * @typedef {'NS'|'TBD'|'1H'|'HT'|'2H'|'ET'|'BT'|'P'|'LIVE'|'FT'|'AET'|'PEN'|'AWD'|'WO'|'SUSP'|'INT'|'PST'|'CANC'|'ABD'} MatchStatusCode
 * @typedef {'scheduled'|'live'|'halftime'|'final'|'recheck'|'confirmed'|'postponed'|'cancelled'} DisplayState
 * @typedef {'NONE'|'RECHECK'|'CONFIRMED'} StatsState  백엔드 `matches.stats_state` (DATA_RULES 3장 넷째 상태)
 */

/** @type {Record<MatchStatusCode, DisplayState>} */
const STATUS_CODE_MAP = {
  NS: 'scheduled',
  TBD: 'scheduled',
  '1H': 'live',
  HT: 'halftime',
  '2H': 'live',
  ET: 'live',
  BT: 'live',
  P: 'live',
  LIVE: 'live',
  FT: 'final',
  AET: 'final',
  PEN: 'final',
  AWD: 'final',
  WO: 'final',
  SUSP: 'cancelled',
  INT: 'cancelled',
  PST: 'postponed',
  CANC: 'cancelled',
  ABD: 'cancelled',
}

/** 종료 코드에서만 statsState 가 표시 상태를 가른다 — final → recheck → confirmed (PRD 4-2) */
const STATS_STATE_MAP = {
  NONE:      'final',
  RECHECK:   'recheck',
  CONFIRMED: 'confirmed',
}

/** 상태 → 번역 키 맵 (MatchStatusBadge 에서 t()로 해석) */
export const STATUS_LABEL_KEYS = {
  scheduled: 'match.scheduled',
  live:      'match.live',
  halftime:  'match.halftime',
  final:     'match.final',
  recheck:   'match.recheck',
  confirmed: 'match.confirmed',
  postponed: 'match.postponed',
  cancelled: 'match.cancelled',
}

/** 상태 설명 → 번역 키 맵 (aria-label용) */
export const STATUS_DESC_KEYS = {
  scheduled: 'match.statusDesc_scheduled',
  live:      'match.statusDesc_live',
  halftime:  'match.statusDesc_halftime',
  final:     'match.statusDesc_final',
  recheck:   'match.statusDesc_recheck',
  confirmed: 'match.statusDesc_confirmed',
  postponed: 'match.statusDesc_postponed',
  cancelled: 'match.statusDesc_cancelled',
}

/**
 * API 상태 코드 + 통계 확정 상태 → 화면 표시 상태
 *
 * | statusShort                | NONE      | RECHECK   | CONFIRMED |
 * |----------------------------|-----------|-----------|-----------|
 * | NS · TBD · 모르는 값        | scheduled | scheduled | scheduled |
 * | 1H · 2H · ET · BT · P · LIVE | live    | live      | live      |
 * | HT                         | halftime  | halftime  | halftime  |
 * | FT · AET · PEN · AWD · WO  | final     | recheck   | confirmed |
 * | PST                        | postponed | postponed | postponed |
 * | CANC · ABD · SUSP · INT    | cancelled | cancelled | cancelled |
 *
 * @param {MatchStatusCode|string} code
 * @param {StatsState} [statsState='NONE']  종료 코드가 아니면 읽지 않는다
 * @returns {DisplayState}
 */
export function getDisplayState(code, statsState = 'NONE') {
  const base = STATUS_CODE_MAP[code] ?? 'scheduled'
  if (base !== 'final') return base
  return STATS_STATE_MAP[statsState] ?? 'final'
}

/**
 * 경기가 진행 중인지 확인
 * @param {DisplayState} state
 */
export function isLive(state) {
  return state === 'live' || state === 'halftime'
}

/**
 * 경기가 종료됐는지 확인 (재검증, 확정 포함)
 * @param {DisplayState} state
 */
export function isFinished(state) {
  return state === 'final' || state === 'recheck' || state === 'confirmed'
}
