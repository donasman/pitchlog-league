/**
 * 경기 카드 승자 강조 판정 순수함수 (`feat/round-navigation` A 판 · MatchCard B 판이 소비).
 *
 * 백엔드 `winnerTeamId → team.ref` 규약 (`match.service.ts:329-330`) 을 그대로 소비한다 —
 * `normalizeTeam` 이 팀 `slug = dto.ref` 로 세팅 (`normalize.js:166`) · `normalizeMatch` 가
 * `winnerTeamRef` 를 통과시켜 (`normalize.js:406`) 두 값이 동일 문자열이면 승자.
 *
 * 무승부·미종료·판정 불가는 `winnerTeamRef` 가 null 이라 자동으로 false 를 돌려준다.
 */

/**
 * 지정 side 의 팀이 이 경기의 승자인가.
 * @param {{ winnerTeamRef?: string|null, homeTeam?: { slug?: string }, awayTeam?: { slug?: string } }} match
 * @param {'home'|'away'} side
 * @returns {boolean}
 */
export function isMatchWinner(match, side) {
  const ref = side === 'home' ? match?.homeTeam?.slug : match?.awayTeam?.slug
  return !!match?.winnerTeamRef && !!ref && match.winnerTeamRef === ref
}
