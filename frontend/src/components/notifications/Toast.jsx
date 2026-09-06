/**
 * 개별 토스트 — 4종
 * goal · kickoff · fulltime: 자동 사라짐 (progress bar)
 * confirmed: 수동 닫기, 초록 표시선 + 틴트 배경 (이 서비스의 차별점)
 *
 * @param {{ notification:Object, onDismiss:()=>void }} props
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MatchStatusBadge from '@/components/ui/MatchStatusBadge'

const TYPE_CONFIG = {
  confirmed: { badge: 'confirmed', autoSec: null },
  goal:      { badge: 'live',      autoSec: 5 },
  kickoff:   { badge: 'scheduled', autoSec: 5 },
  fulltime:  { badge: 'final',     autoSec: 7 },
}

export default function Toast({ notification, onDismiss }) {
  const { t } = useTranslation()
  const cfg         = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.goal
  const isConfirmed = notification.type === 'confirmed'
  const [progress, setProgress] = useState(100)
  const intervalRef = useRef(null)
  const startRef    = useRef(Date.now())

  /* 자동 사라짐 */
  useEffect(() => {
    if (!cfg.autoSec) return
    const durationMs = cfg.autoSec * 1000
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      const pct = Math.max(0, 100 - (elapsed / durationMs) * 100)
      setProgress(pct)
      if (pct === 0) {
        clearInterval(intervalRef.current)
        onDismiss()
      }
    }, 50)
    return () => clearInterval(intervalRef.current)
  }, [cfg.autoSec, onDismiss])

  return (
    <div
      style={{
        width: 340,
        padding: 14,
        display: 'grid',
        gap: 8,
        boxShadow: 'var(--sh-over)',
        borderRadius: 'var(--r-card)',
        background: isConfirmed
          ? 'color-mix(in srgb, var(--st-pos) 7%, var(--pl-card))'
          : 'var(--pl-card)',
        borderLeft: isConfirmed ? '3px solid var(--st-pos)' : '3px solid transparent',
      }}
      role="alert"
      aria-live="assertive"
    >
      {/* 헤더: 아이콘/이니셜 + 제목 + 배지 + 닫기 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* 확정: 체크 아이콘 */}
        {isConfirmed ? (
          <span
            style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--st-pos)', color: '#fff',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M2 6.3 4.6 9 10 3.4" />
            </svg>
          </span>
        ) : (
          /* 나머지: 대회 이니셜 뱃지 */
          <span
            style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              background: 'var(--pl-fill-2)', display: 'grid', placeItems: 'center',
              fontSize: 9, fontWeight: 700, color: 'var(--pl-sub)',
            }}
          >
            {notification.competitionSlug?.replace('premier-league','EPL').replace('champions-league','UCL').replace('la-liga','LL').replace('bundesliga','BL').replace('serie-a','SA').replace('ligue-1','L1').slice(0,3).toUpperCase()}
          </span>
        )}

        <span
          className="t-card tname"
          style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {notification.title}
        </span>

        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <MatchStatusBadge state={cfg.badge} />
          <button
            onClick={onDismiss}
            aria-label={t('notif.dismiss')}
            style={{
              width: 24, height: 24, display: 'grid', placeItems: 'center',
              color: 'var(--pl-sub)', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 14, borderRadius: 4,
            }}
          >
            ✕
          </button>
        </span>
      </div>

      {/* 본문 */}
      <span className="t-sub" style={{ color: 'var(--pl-text)' }}>
        {notification.body}
        {notification.detail && (
          <span className="t-cap" style={{ display: 'block', marginTop: 2 }}>{notification.detail}</span>
        )}
      </span>

      {/* 푸터: 자동 닫힘 안내 + 경기 상세 링크 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="t-cap">
          {isConfirmed ? t('notif.manualHide') : t('notif.autoHide', { sec: cfg.autoSec })}
        </span>
        {notification.matchId && (
          <Link
            to={`/matches/${notification.matchId}`}
            className="pl-link"
            style={{ marginLeft: 'auto', fontSize: 12 }}
            onClick={onDismiss}
          >
            {t('notif.matchDetail')}
          </Link>
        )}
      </div>

      {/* 진행 바 (자동 사라지는 토스트만) */}
      {!isConfirmed && (
        <span style={{ height: 2, borderRadius: 2, background: 'var(--pl-fill-2)', overflow: 'hidden' }}>
          <span
            style={{
              display: 'block',
              height: 2,
              width: `${progress}%`,
              background: 'var(--pl-primary)',
              transition: 'width 0.05s linear',
            }}
          />
        </span>
      )}
    </div>
  )
}
