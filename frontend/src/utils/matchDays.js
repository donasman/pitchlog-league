/**
 * 경기일 기준 요약 칸용 데이터 산출.
 * "경기일" = 경기가 1개 이상 있는 KST 날짜 (getKSTDateKey 대신 실제 함수명 kstDateKey 사용).
 * 달력 날짜가 아니다 — A매치 휴식기의 빈 날은 건너뛴다.
 *
 * 규칙:
 *   - 최근 결과 = 오늘 포함 이전 경기일 중 가까운 3개의 종료(isFinished: final|recheck|confirmed) 경기. 최신 앞.
 *   - 다가오는 = 오늘 포함 이후 경기일 중 가까운 3개의 진행 중(isLive) + 예정(scheduled) 경기. 진행 중 앞, 그다음 킥오프 asc.
 *   - 오늘도 경기일이면: finished 는 recent 로, live/scheduled 는 upcoming 으로.
 *   - **연기(postponed) · 취소(cancelled) 는 두 섹션 모두 제외** — 요약 칸에서 다루지 않는다.
 *   - 대회 필터는 소비자가 이미 걸러 넘긴 것 — 여기서는 안 만짐.
 *   - 상태 필터도 여기서는 무시 (요약 칸은 원래 두 축을 다 보여준다).
 *
 * 반환은 소비자가 그대로 카드로 그릴 수 있는 배열 두 개 + 실 채워진 경기일 수 두 개.
 *
 * @param {Array<{ id, date: string|null, displayState: string }>} matches
 * @param {string} todayKey  'YYYY-MM-DD' KST — clock.todayKstKey() 결과
 * @returns {{ recent: Array, upcoming: Array, recentDayCount: number, upcomingDayCount: number }}
 */
import { kstDateKey } from './dateFormat.js'
import { isLive, isFinished } from './matchStatus.js'

export const FOCUS_MATCHDAYS = 3

export function pickFocusMatchdays(matches, todayKey) {
  const list = Array.isArray(matches) ? matches : []

  // 경기일 map — key = kstDateKey, value = { finished, liveUpcoming }
  /** @type {Map<string, {finished:any[], liveUpcoming:any[]}>} */
  const byDay = new Map()
  for (const m of list) {
    if (!m || !m.date) continue
    const key = kstDateKey(m.date)
    if (!byDay.has(key)) byDay.set(key, { finished: [], liveUpcoming: [] })
    const bucket = byDay.get(key)
    const state = m.displayState
    if (isFinished(state)) bucket.finished.push(m)
    else if (isLive(state) || state === 'scheduled') bucket.liveUpcoming.push(m)
    // postponed · cancelled 는 어느 쪽에도 안 들어간다 (요약 칸 규약 · R2)
  }

  // 최근 결과 — key <= today · finished 있음
  const recentDayKeys = Array.from(byDay.keys())
    .filter(k => k <= todayKey && byDay.get(k).finished.length > 0)
    .sort()
    .reverse()
    .slice(0, FOCUS_MATCHDAYS)

  const recent = []
  for (const k of recentDayKeys) {
    // 하루 안에서는 킥오프 최신 앞 (desc)
    const sorted = byDay.get(k).finished
      .slice()
      .sort((a, b) => new Date(b?.date ?? 0).getTime() - new Date(a?.date ?? 0).getTime())
    recent.push(...sorted)
  }

  // 다가오는 — key >= today · liveUpcoming 있음
  const upcomingDayKeys = Array.from(byDay.keys())
    .filter(k => k >= todayKey && byDay.get(k).liveUpcoming.length > 0)
    .sort()
    .slice(0, FOCUS_MATCHDAYS)

  const upcoming = []
  for (const k of upcomingDayKeys) {
    // 하루 안: isLive 먼저 (kickoff asc) · 그다음 예정 (kickoff asc)
    const rows = byDay.get(k).liveUpcoming.slice()
    const liveRows = rows.filter(m => isLive(m?.displayState))
      .sort((a, b) => new Date(a?.date ?? 0).getTime() - new Date(b?.date ?? 0).getTime())
    const otherRows = rows.filter(m => !isLive(m?.displayState))
      .sort((a, b) => new Date(a?.date ?? 0).getTime() - new Date(b?.date ?? 0).getTime())
    upcoming.push(...liveRows, ...otherRows)
  }

  return {
    recent,
    upcoming,
    recentDayCount:   recentDayKeys.length,
    upcomingDayCount: upcomingDayKeys.length,
  }
}
