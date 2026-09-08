/**
 * 순위표를 조 단위로 나누는 표시 헬퍼.
 *
 * `services/normalize.js` 가 아니라 여기 있는 이유 — 이건 백엔드 응답 정규화가 아니라
 * 순수한 표시 판단이고, 소비자가 `StandingsTable` 이다. 컴포넌트가 `services/` 를 직접
 * import 하면 Mock 모드 화면이 live 계층 모듈을 실행하게 된다 (`FRONTEND_GUIDE` 계층 규칙).
 */

/**
 * 순위 entries → 조 단위 묶음. 조가 하나면 `groupName: null` 인 한 덩어리로 돌려준다
 * (화면이 단일 표에 대회 이름을 머리글로 찍지 않도록).
 * 조 순서는 처음 나온 순서 — 백엔드가 groupName asc 로 정렬해 보낸다.
 * @param {Array<{groupName?: string|null}>} entries
 * @returns {Array<{ groupName: string|null, entries: Array }>}
 */
export function groupStandings(entries) {
  const list = entries ?? []
  const names = []
  for (const e of list) {
    const n = e?.groupName ?? null
    if (n && !names.includes(n)) names.push(n)
  }
  if (names.length <= 1) return [{ groupName: null, entries: list }]

  const groups = names.map(name => ({
    groupName: name,
    entries: list.filter(e => (e?.groupName ?? null) === name),
  }))
  // 조 이름이 빈 행은 어느 조에도 못 넣는다 — 버리지 않고 이름 없는 덩어리로 뒤에 붙인다
  const orphans = list.filter(e => !(e?.groupName ?? null))
  if (orphans.length) groups.push({ groupName: null, entries: orphans })
  return groups
}

/**
 * 미니 패널의 행 수 상한을 조 묶음에 적용한다.
 * 조가 여럿일 때 앞에서 maxRows 개를 그냥 자르면 A조 뒤에 B조가 머리글 없이 이어 붙는다.
 * maxRows 는 패널 높이를 묶으려는 값이므로, 조별리그에서는 첫 조 하나만 남긴다 —
 * 머리글이 어느 조인지 밝히므로 잘린 표가 전체 순위처럼 보이지 않는다.
 * @param {Array<{ groupName: string|null, entries: Array }>} groups
 * @param {number} [maxRows]
 */
export function limitStandingGroups(groups, maxRows) {
  const list = groups ?? []
  if (!maxRows || maxRows <= 0) return list
  const kept = list.length > 1 ? list.slice(0, 1) : list
  return kept.map(g => ({ ...g, entries: (g.entries ?? []).slice(0, maxRows) }))
}
