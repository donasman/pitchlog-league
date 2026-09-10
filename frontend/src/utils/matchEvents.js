/**
 * 경기 이벤트 헬퍼 — 선수별 이벤트 종류 목록.
 *
 * 왜 playerRef 기준인가:
 *   이름(playerName)으로 묶으면 동명이인·표기 흔들림에 취약하다. 백엔드가 준
 *   playerRef 는 API-Football player id 접두라 결정적이다 — 라인업의 playerRef 로
 *   피치 마커를 찾을 때 같은 키로 이벤트를 조회한다.
 *
 * playerRef 가 null 인 이벤트(예: 팀 이벤트·미매칭)는 스킵한다 — 마커에 붙일 곳이 없다.
 */

/**
 * events → { [playerRef]: Array<eventType> }.
 * 같은 playerRef 에 여러 이벤트가 있으면 순서대로 배열에 담긴다.
 *
 * @param {Array<{playerRef:string|null, type:string}>} events
 * @returns {Record<string, Array<string>>}
 */
export function buildEventMapByRef(events = []) {
  const map = {}
  for (const e of events) {
    if (!e?.playerRef) continue
    if (!map[e.playerRef]) map[e.playerRef] = []
    map[e.playerRef].push(e.type)
  }
  return map
}
