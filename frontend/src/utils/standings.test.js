import { describe, it, expect } from 'vitest'
import { groupStandings, limitStandingGroups } from './standings.js'

// ─── groupStandings · limitStandingGroups ──────────────────────

function entry(rank, groupName, teamId) {
  return { rank, groupName, teamId, teamSlug: teamId, zone: 'none' }
}

describe('groupStandings', () => {
  // 단일 표 대회는 group_name 에 대회 이름이 채워져 온다 — 이름이 있다고 조별리그가 아니다
  it('returns one unnamed block when every row carries the same group name', () => {
    const entries = [entry(1, 'Premier League', 'a'), entry(2, 'Premier League', 'b')]
    expect(groupStandings(entries)).toEqual([{ groupName: null, entries }])
  })

  it('returns one unnamed block when no row carries a group name', () => {
    const entries = [entry(1, null, 'a'), entry(2, undefined, 'b')]
    expect(groupStandings(entries)).toEqual([{ groupName: null, entries }])
  })

  it('splits the table once two different group names appear', () => {
    const a1 = entry(1, 'Group A', 'a1')
    const a2 = entry(2, 'Group A', 'a2')
    const b1 = entry(1, 'Group B', 'b1')
    expect(groupStandings([a1, a2, b1])).toEqual([
      { groupName: 'Group A', entries: [a1, a2] },
      { groupName: 'Group B', entries: [b1] },
    ])
  })

  it('keeps a nameless row instead of dropping it', () => {
    const a1 = entry(1, 'Group A', 'a1')
    const b1 = entry(1, 'Group B', 'b1')
    const orphan = entry(1, null, 'x')
    expect(groupStandings([a1, b1, orphan])).toEqual([
      { groupName: 'Group A', entries: [a1] },
      { groupName: 'Group B', entries: [b1] },
      { groupName: null, entries: [orphan] },
    ])
  })

  it('survives an empty or missing list', () => {
    expect(groupStandings([])).toEqual([{ groupName: null, entries: [] }])
    expect(groupStandings(undefined)).toEqual([{ groupName: null, entries: [] }])
  })
})

describe('limitStandingGroups', () => {
  const single = [{ groupName: null, entries: [1, 2, 3, 4, 5] }]

  it('leaves the table untouched without a row limit', () => {
    expect(limitStandingGroups(single, undefined)).toEqual(single)
  })

  it('cuts a single table to the row limit', () => {
    expect(limitStandingGroups(single, 3)).toEqual([{ groupName: null, entries: [1, 2, 3] }])
  })

  // 앞에서 그냥 자르면 A조 뒤에 B조가 머리글 없이 붙는다 — 첫 조만 남긴다
  it('keeps only the first group when the table is split', () => {
    const groups = [
      { groupName: 'Group A', entries: [1, 2, 3, 4] },
      { groupName: 'Group B', entries: [5, 6, 7, 8] },
    ]
    expect(limitStandingGroups(groups, 8)).toEqual([{ groupName: 'Group A', entries: [1, 2, 3, 4] }])
    expect(limitStandingGroups(groups, 2)).toEqual([{ groupName: 'Group A', entries: [1, 2] }])
  })
})
