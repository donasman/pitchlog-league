/**
 * pickFocusMatchdays — matchday-based (not calendar-day) focus picker lock.
 *
 * Uses kstDateKey (KST-based YYYY-MM-DD) internally, so ISO datetimes are chosen
 * such that KST-normalized key stays on the intended local day. Times are given
 * in KST (UTC+9) — e.g. '2026-09-26T12:00:00+09:00' -> KST key '2026-09-26'.
 */

import { describe, it, expect } from 'vitest'
import { pickFocusMatchdays, FOCUS_MATCHDAYS } from './matchDays.js'

/** helper — build a match record with KST-anchored ISO datetime */
function m(id, kstDate, kstTime, displayState) {
  return {
    id,
    date: kstDate === null ? null : `${kstDate}T${kstTime}+09:00`,
    displayState,
  }
}

describe('pickFocusMatchdays', () => {
  it('exports FOCUS_MATCHDAYS === 3 as a stable constant', () => {
    expect(FOCUS_MATCHDAYS).toBe(3)
  })

  it('skips calendar-empty days — picks 3 nearest matchdays not 3 calendar days', () => {
    const today = '2026-09-27'
    // three matchdays: today, today-14 (=09-13), today-30 (=08-28). today-1..-13 empty.
    const matches = [
      m('a', '2026-09-27', '20:00', 'final'),
      m('b', '2026-09-13', '18:00', 'final'),
      m('c', '2026-08-28', '21:00', 'final'),
    ]
    const r = pickFocusMatchdays(matches, today)
    expect(r.recentDayCount).toBe(3)
    expect(r.recent.map(x => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('today matches split by state — finished go to recent, live/scheduled go to upcoming', () => {
    const today = '2026-09-27'
    const matches = [
      m('f1', '2026-09-27', '14:00', 'final'),
      m('f2', '2026-09-27', '16:00', 'final'),
      m('s1', '2026-09-27', '20:00', 'scheduled'),
    ]
    const r = pickFocusMatchdays(matches, today)
    expect(r.recent).toHaveLength(2)
    expect(r.upcoming).toHaveLength(1)
    expect(r.upcoming[0].id).toBe('s1')
  })

  it('recent order — latest matchday first, within-day latest kickoff first', () => {
    const today = '2026-09-27'
    // today-1 = 2026-09-26 with 20:00 and 18:00, today-3 = 2026-09-24 with 22:00
    const matches = [
      m('d1-18', '2026-09-26', '18:00', 'final'),
      m('d1-20', '2026-09-26', '20:00', 'final'),
      m('d3-22', '2026-09-24', '22:00', 'final'),
    ]
    const r = pickFocusMatchdays(matches, today)
    expect(r.recent.map(x => x.id)).toEqual(['d1-20', 'd1-18', 'd3-22'])
  })

  it('upcoming order — live first, then scheduled by kickoff asc within a day', () => {
    const today = '2026-09-27'
    const matches = [
      m('s20', '2026-09-27', '20:00', 'scheduled'),
      m('L21', '2026-09-27', '21:00', 'live'),
      m('s19', '2026-09-27', '19:00', 'scheduled'),
    ]
    const r = pickFocusMatchdays(matches, today)
    expect(r.upcoming.map(x => x.id)).toEqual(['L21', 's19', 's20'])
  })

  it('returns empty arrays and zero counts when no matches', () => {
    const today = '2026-09-27'
    expect(pickFocusMatchdays([], today)).toEqual({
      recent: [], upcoming: [], recentDayCount: 0, upcomingDayCount: 0,
    })
    expect(pickFocusMatchdays(null, today)).toEqual({
      recent: [], upcoming: [], recentDayCount: 0, upcomingDayCount: 0,
    })
  })

  it('ignores matches with null date', () => {
    const today = '2026-09-27'
    const matches = [
      { id: 'x', date: null, displayState: 'final' },
      m('ok', '2026-09-26', '20:00', 'final'),
    ]
    const r = pickFocusMatchdays(matches, today)
    expect(r.recent.map(x => x.id)).toEqual(['ok'])
    expect(r.recentDayCount).toBe(1)
  })

  it('today matches all scheduled — today lands in upcoming only, recent walks back to earlier finished days', () => {
    const today = '2026-09-27'
    const matches = [
      m('t1', '2026-09-27', '19:00', 'scheduled'),
      m('t2', '2026-09-27', '21:00', 'scheduled'),
      m('y1', '2026-09-25', '20:00', 'final'),
    ]
    const r = pickFocusMatchdays(matches, today)
    expect(r.upcoming.map(x => x.id)).toEqual(['t1', 't2'])
    expect(r.upcomingDayCount).toBe(1)
    expect(r.recent.map(x => x.id)).toEqual(['y1'])
    expect(r.recentDayCount).toBe(1)
  })

  it('fewer than 3 matchdays available — counts stay below the cap', () => {
    const today = '2026-09-27'
    const matches = [
      m('r1', '2026-09-27', '10:00', 'final'),
      m('u1', '2026-09-28', '20:00', 'scheduled'),
    ]
    const r = pickFocusMatchdays(matches, today)
    expect(r.recentDayCount).toBe(1)
    expect(r.upcomingDayCount).toBe(1)
  })

  it('postponed and cancelled matches are excluded from both sections', () => {
    const today = '2026-09-27'
    const matches = [
      m('p1', '2026-09-27', '20:00', 'postponed'),
      m('c1', '2026-09-27', '21:00', 'cancelled'),
      m('p2', '2026-09-26', '18:00', 'postponed'),
      m('ok', '2026-09-26', '20:00', 'final'),
    ]
    const r = pickFocusMatchdays(matches, today)
    expect(r.upcoming.map(x => x.id)).toEqual([])
    expect(r.recent.map(x => x.id)).toEqual(['ok'])
    // day 2026-09-27 has no eligible match → not counted as a matchday for either section
    expect(r.upcomingDayCount).toBe(0)
    expect(r.recentDayCount).toBe(1)
  })

  it('caps recent and upcoming at FOCUS_MATCHDAYS (=3) matchdays', () => {
    const today = '2026-09-27'
    // 5 distinct finished days (all <= today)
    const recentPool = [
      m('r1', '2026-09-27', '10:00', 'final'),
      m('r2', '2026-09-26', '10:00', 'final'),
      m('r3', '2026-09-25', '10:00', 'final'),
      m('r4', '2026-09-24', '10:00', 'final'),
      m('r5', '2026-09-23', '10:00', 'final'),
    ]
    // 6 distinct upcoming days (all >= today, scheduled)
    const upcomingPool = [
      m('u1', '2026-09-27', '22:00', 'scheduled'),
      m('u2', '2026-09-28', '20:00', 'scheduled'),
      m('u3', '2026-09-29', '20:00', 'scheduled'),
      m('u4', '2026-09-30', '20:00', 'scheduled'),
      m('u5', '2026-10-01', '20:00', 'scheduled'),
      m('u6', '2026-10-02', '20:00', 'scheduled'),
    ]
    const r = pickFocusMatchdays([...recentPool, ...upcomingPool], today)
    expect(r.recentDayCount).toBe(3)
    expect(r.upcomingDayCount).toBe(3)
  })
})
