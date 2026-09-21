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
