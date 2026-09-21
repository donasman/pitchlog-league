/**
 * 일정 탭 분할 · 컵 라운드 그룹 순수함수 (`feat/schedule-split`).
 *
 * 다음 판 (A · 라운드 네비게이션) 도 여기를 그대로 재사용한다 —
 * `ScheduleSections` 컴포넌트도 이 함수 결과를 소비하므로 페이지에 인라인으로 두지 않는다.
 */

import { isLive, isFinished } from './matchStatus'

/**
 * 일정을 `live` / `upcoming` / `results` 로 나눈다. 입력은 불변 (배열을 복사해서 정렬).
 *
 * 분류는 `displayState` 만 본다 (`normalize.js` 가 만든 값 · `isLive`·`isFinished` 헬퍼 재사용 —
 * 새 상태 문자열은 만들지 않는다):
 *   - `live` = `isLive`     ('live' · 'halftime')  · 킥오프 오름차순
 *   - `results` = `isFinished` ('final' · 'confirmed' · 'recheck') · 킥오프 **내림차순** (최근 위)
 *   - `upcoming` = 나머지 ('scheduled' · unknown)  · 킥오프 오름차순
 *
 * `nowMs` 는 인자로 받는다 (테스트 재현성) — 현재 로직은 시간 기반 분류를 안 하지만
 * 라운드 네비 판(A) 에서 "지금 라운드" 기본 선택에 쓸 수 있어 시그니처만 미리 확보.
 *
 * @param {Array<{ date: string|null, displayState: string }>} matches
 * @param {number} [_nowMs]  현재 시각 (ms · 옵션 · 지금 로직에선 미사용)
 * @returns {{ live: Array<object>, upcoming: Array<object>, results: Array<object> }}
 */
export function splitSchedule(matches, _nowMs) {
  const live = []
  const upcoming = []
  const results = []
  for (const m of matches ?? []) {
    const s = m?.displayState
    if (isLive(s)) live.push(m)
    else if (isFinished(s)) results.push(m)
    else upcoming.push(m)
  }
  const asc  = (a, b) => new Date(a?.date ?? 0).getTime() - new Date(b?.date ?? 0).getTime()
  const desc = (a, b) => new Date(b?.date ?? 0).getTime() - new Date(a?.date ?? 0).getTime()
  return {
    live:     live.slice().sort(asc),
    upcoming: upcoming.slice().sort(asc),
    results:  results.slice().sort(desc),
  }
}

/**
 * 컵 일정을 라운드별로 묶는다. 그룹 순서는 `roundOrdinal` 오름차순 (백엔드 `/fixtures/rounds` 순서 ·
 * `normalize.js:407` 통과). 그룹 안 경기는 `date` 오름차순.
 *
 * `normalize.js:386` 가 `round` 를 **문자열** (`'Round of 64'` · null) 로 넘긴다 —
 * 인라인 로직이 `m.round?.name` 을 참조하던 09-21 실측 결함이 여기서 잡힌다.
 *
 * @param {Array<{ round: string|null, roundOrdinal: number|null, date: string|null }>} matches
 * @returns {Array<[string, Array<object>]>}
 */
export function groupCupMatchesByRound(matches) {
  const map = new Map()
  for (const m of matches ?? []) {
    const key = m?.round ?? ''
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(m)
  }
  for (const list of map.values()) {
    list.sort((a, b) => new Date(a?.date ?? 0).getTime() - new Date(b?.date ?? 0).getTime())
  }
  const firstOrdinal = (list) => {
    for (const m of list) if (m?.roundOrdinal != null) return m.roundOrdinal
    return null
  }
  return Array.from(map.entries()).sort(([, a], [, b]) => {
    const ao = firstOrdinal(a)
    const bo = firstOrdinal(b)
    if (ao == null && bo == null) return 0   // 첫 등장 순 (Map 삽입 순) 유지
    if (ao == null) return 1
    if (bo == null) return -1
    return ao - bo
  })
}

/** 종료로 치는 표시 상태 — 취소도 그 라운드에서는 더 진행될 것이 없다 (normalize.js `isSettled` 와 같은 규약) */
function isSettled(state) {
  return isFinished(state) || state === 'cancelled'
}

/**
 * 정렬용 key — roundOrdinal 있으면 String(ordinal), 없으면 round 이름 (컵 폴백).
 * `pickDefaultRound`·`filterByRound`·`useRoundParam` 이 소비하는 URL `?round=` 값 규칙과 일치.
 */
function roundKeyOf(m) {
  return m?.roundOrdinal != null ? String(m.roundOrdinal) : (m?.round ?? '')
}

/**
 * 라운드 네비게이션 기본 라운드 결정 (D2 ㄴ 갈래):
 *   1) live 있으면 그 라운드 (컵이면 첫 등장 라운드 · 리그면 roundOrdinal 최댓값)
 *   2) 아니면 아직 종료 안 된 것 중 킥오프 최솟값 라운드 (upcoming 폴백)
 *   3) 아니면 종료된 것 중 roundOrdinal 최댓값 라운드 (results 폴백)
 * 후보 0건이면 { roundOrdinal:null, roundKey:'', source:'results' }.
 *
 * @param {Array<{ date: string|null, displayState: string, round: string|null, roundOrdinal: number|null }>} matches
 * @param {Date} nowDate  현재 시각 (테스트 재현성)
 * @returns {{ roundOrdinal: number|null, roundKey: string, source: 'live'|'upcoming'|'results' }}
 */
export function pickDefaultRound(matches, nowDate) {
  const list = Array.isArray(matches) ? matches : []
  if (list.length === 0) return { roundOrdinal: null, roundKey: '', source: 'results' }

  // 1) live
  const liveMatches = list.filter(m => isLive(m?.displayState))
  if (liveMatches.length > 0) {
    // roundOrdinal 최댓값 기준. 전부 null 이면 첫 등장 라운드
    let pick = liveMatches[0]
    let bestOrd = pick.roundOrdinal
    for (const m of liveMatches) {
      if (m.roundOrdinal != null && (bestOrd == null || m.roundOrdinal > bestOrd)) {
        pick = m
        bestOrd = m.roundOrdinal
      }
    }
    return {
      roundOrdinal: pick.roundOrdinal ?? null,
      roundKey:     roundKeyOf(pick),
      source:       'live',
    }
  }

  // 2) upcoming — 아직 종료 안 된 것 중 킥오프 최솟값 (미래·과거 상관 없이 unsettled 인 것 전부)
  const nowMs = (nowDate instanceof Date ? nowDate : new Date()).getTime()
  const unsettled = list.filter(m => !isSettled(m?.displayState))
  if (unsettled.length > 0) {
    // 미래 우선 · 없으면 unsettled 아무거나 (킥오프 최솟값)
    const future = unsettled.filter(m => m?.date && new Date(m.date).getTime() >= nowMs)
    const pool = future.length > 0 ? future : unsettled
    let pick = pool[0]
    let bestMs = new Date(pick?.date ?? 0).getTime()
    for (const m of pool) {
      const t = new Date(m?.date ?? 0).getTime()
      if (t < bestMs) { pick = m; bestMs = t }
    }
    return {
      roundOrdinal: pick.roundOrdinal ?? null,
      roundKey:     roundKeyOf(pick),
      source:       'upcoming',
    }
  }

  // 3) results — 종료된 것 중 roundOrdinal 최댓값
  const settled = list.filter(m => isSettled(m?.displayState))
  if (settled.length > 0) {
    let pick = settled[0]
    let bestOrd = pick.roundOrdinal
    let bestMs = new Date(pick?.date ?? 0).getTime()
    for (const m of settled) {
      if (m.roundOrdinal != null && (bestOrd == null || m.roundOrdinal > bestOrd)) {
        pick = m
        bestOrd = m.roundOrdinal
        bestMs = new Date(m?.date ?? 0).getTime()
      } else if (bestOrd == null && m.roundOrdinal == null) {
        // 전부 null 인 컵 케이스 — 킥오프 최댓값
        const t = new Date(m?.date ?? 0).getTime()
        if (t > bestMs) { pick = m; bestMs = t }
      }
    }
    return {
      roundOrdinal: pick.roundOrdinal ?? null,
      roundKey:     roundKeyOf(pick),
      source:       'results',
    }
  }

  return { roundOrdinal: null, roundKey: '', source: 'results' }
}

/**
 * 라운드 목록 — 각 라운드마다 { ordinal, name, key, matchCount, settled, hasLive, hasUpcoming }.
 * 정렬: ordinal asc (null 뒤 · 삽입 순 유지 — groupCupMatchesByRound 규약 재사용).
 *
 * @param {Array<{ round: string|null, roundOrdinal: number|null, displayState: string }>} matches
 * @returns {Array<{ ordinal: number|null, name: string, key: string, matchCount: number, settled: number, hasLive: boolean, hasUpcoming: boolean }>}
 */
export function roundList(matches) {
  const list = Array.isArray(matches) ? matches : []
  const map = new Map()  // key → { ordinal, name, key, matchCount, settled, hasLive, hasUpcoming }
  for (const m of list) {
    const key = roundKeyOf(m)
    if (!map.has(key)) {
      map.set(key, {
        ordinal:      m?.roundOrdinal ?? null,
        name:         m?.round ?? '',
        key,
        matchCount:   0,
        settled:      0,
        hasLive:      false,
        hasUpcoming:  false,
      })
    }
    const row = map.get(key)
    row.matchCount += 1
    if (isSettled(m?.displayState)) row.settled += 1
    if (isLive(m?.displayState))    row.hasLive = true
    if (!isSettled(m?.displayState) && !isLive(m?.displayState)) row.hasUpcoming = true
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.ordinal == null && b.ordinal == null) return 0   // 삽입 순 유지
    if (a.ordinal == null) return 1
    if (b.ordinal == null) return -1
    return a.ordinal - b.ordinal
  })
}

/**
 * 라운드 상태 — RoundNavigator 가 소비하는 세 값.
 *   - hasLive → 'current'
 *   - settled === matchCount && matchCount > 0 → 'completed'
 *   - 그 외 → 'upcoming'
 * (RoundNavigator 는 별도로 "진행 중 없으면 upcoming 첫 라운드 하나만 current 승격" 을 B 판에서 계산)
 *
 * @param {{ hasLive: boolean, settled: number, matchCount: number }} round
 * @returns {'completed'|'current'|'upcoming'}
 */
export function roundStatus(round) {
  if (round?.hasLive === true) return 'current'
  if ((round?.matchCount ?? 0) > 0 && round.settled === round.matchCount) return 'completed'
  return 'upcoming'
}

/**
 * 경기를 라운드 키로 거른다. `roundKey` 가 falsy 이면 원본 그대로.
 *   - roundOrdinal 이 있는 경기: String(ordinal) === roundKey
 *   - roundOrdinal null 경기 (컵): round 이름 === roundKey
 *
 * @param {Array<{ round: string|null, roundOrdinal: number|null }>} matches
 * @param {string} roundKey
 */
export function filterByRound(matches, roundKey) {
  const list = Array.isArray(matches) ? matches : []
  if (!roundKey) return list
  return list.filter(m => {
    if (m?.roundOrdinal != null) return String(m.roundOrdinal) === roundKey
    return m?.round === roundKey
  })
}
