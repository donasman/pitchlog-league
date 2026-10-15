/**
 * API-Football 선수 id 가 실제 선수를 가리키는가.
 * 실측 2026-10-15 fixture 1635690 — lineups 는 `null`, `/fixtures/players` 는 같은 선수를 `0` 으로 준다.
 * 0 은 id 가 아니다 — players.api_player_id 가 NOT NULL·UNIQUE(schema.prisma:364)라 0 을 쓰면
 * 서로 다른 무명 선수가 한 행으로 합쳐진다.
 */
export function knownApiPlayerId(id: number | null | undefined): number | null {
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null;
}
