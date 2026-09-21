/**
 * RoundNavigator — 대회 페이지 일정 탭 위 라운드 네비게이션 (`feat/round-navigation` B 판).
 *
 * A 판 산출물 소비:
 *   - `roundList(matches)` → `[{ ordinal, name, key, matchCount, settled, hasLive, hasUpcoming }]`
 *     을 부모(CompetitionPage) 에서 만들어 `rounds` 로 넘긴다.
 *   - `roundStatus(round)` → `'completed' | 'current' | 'upcoming'`.
 *
 * chip 상태 승격 규칙 (D4 · planner § 4-1 마지막 라인):
 *   진행 중 라운드(`hasLive`) 가 하나도 없으면 `upcoming` 첫 라운드 하나만 `current` 로 승격.
 *
 * DOM:
 *   [◀ prev] [chip · chip · chip ...] [▶ next]
 *   - 모바일에서는 chip 리스트가 가로 스크롤.
 *   - 현재 chip (`aria-selected`) 이 스크롤 뷰의 중앙에 오도록 `scrollIntoView`.
 *
 * `rounds.length <= 1` 이면 렌더 안 함 — 라운드가 하나 이하면 네비게이션이 의미 없음.
 */

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { roundStatus } from '@/utils/schedule'

const CHIP_BASE = {
  flexShrink: 0,
  padding: '6px 12px',
  borderRadius: 999,
  fontSize: 13,
  fontFamily: 'var(--font)',
  cursor: 'pointer',
  border: 'none',
  background: 'none',
  minHeight: 32,
  lineHeight: '20px',
  whiteSpace: 'nowrap',
}

function ArrowButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        flexShrink: 0,
        width: 32,
        height: 32,
        borderRadius: 999,
        border: '1px solid var(--pl-line)',
        background: 'transparent',
        color: disabled ? 'var(--pl-sub)' : 'var(--pl-text)',
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'var(--font)',
        fontSize: 16,
        lineHeight: '20px',
        opacity: disabled ? 0.4 : 1,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {children}
    </button>
  )
}

function chipStyle({ state, active }) {
  const base = { ...CHIP_BASE }
  if (state === 'completed') {
    base.opacity = 0.55
    base.background = 'var(--pl-fill)'
    base.color = 'var(--pl-sub)'
  } else if (state === 'current') {
    base.background = 'var(--pl-primary)'
    base.color = 'white'
    base.fontWeight = 700
  } else {
    // upcoming
    base.border = '1px solid var(--pl-line)'
    base.color = 'var(--pl-text)'
    base.background = 'transparent'
  }
  if (active) {
    base.fontWeight = 700
    base.boxShadow = 'inset 0 0 0 2px var(--pl-primary)'
  }
  return base
}

export default function RoundNavigator({ rounds, roundKey, onChange }) {
  const { t } = useTranslation()
  const activeChipRef = useRef(null)
  const list = Array.isArray(rounds) ? rounds : []

  useEffect(() => {
    const el = activeChipRef.current
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ inline: 'center', block: 'nearest' })
    }
  }, [roundKey])

  if (list.length <= 1) return null

  const anyLive = list.some(r => r?.hasLive === true)
  const firstUpcomingKey = !anyLive
    ? list.find(r => roundStatus(r) === 'upcoming')?.key ?? null
    : null

  const chipState = (r) => {
    const base = roundStatus(r)
    if (base === 'upcoming' && r.key === firstUpcomingKey) return 'current'
    return base
  }

  const activeIndex = Math.max(0, list.findIndex(r => r.key === roundKey))
  const prevDisabled = activeIndex <= 0
  const nextDisabled = activeIndex >= list.length - 1

  const goPrev = () => { if (!prevDisabled) onChange(list[activeIndex - 1].key) }
  const goNext = () => { if (!nextDisabled) onChange(list[activeIndex + 1].key) }

  const chipLabel = (r) => (r?.name && String(r.name).trim()) || (r?.ordinal != null ? String(r.ordinal) : '')

  return (
    <div
      role="tablist"
      aria-label={t('competition.round.progressLabel')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        // 부모 grid/flex 자식 규약 — chip 리스트가 넘쳐도 컨테이너 폭을 늘리지 않는다.
        // 없으면 chip 폭 합이 뷰포트 폭을 넘겨 문서 전체가 가로 스크롤되는 fix/round-bar-overflow 실측 결함.
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      <ArrowButton label={t('competition.round.previous')} onClick={goPrev} disabled={prevDisabled}>‹</ArrowButton>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          padding: '2px 2px',
        }}
      >
        {list.map(r => {
          const state = chipState(r)
          const active = r.key === roundKey
          return (
            <button
              key={r.key || '__blank'}
              ref={active ? activeChipRef : undefined}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(r.key)}
              style={chipStyle({ state, active })}
            >
              {chipLabel(r)}
            </button>
          )
        })}
      </div>

      <ArrowButton label={t('competition.round.next')} onClick={goNext} disabled={nextDisabled}>›</ArrowButton>
    </div>
  )
}
