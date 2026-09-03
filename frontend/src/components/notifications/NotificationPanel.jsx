/**
 * 알림 패널 — 벨 클릭 시 헤더 아래 드롭다운
 * 내용 있음 / 비어 있음 두 상태
 * 읽음·안 읽음: 좌측 파랑 점 + 배경 틴트 (브랜드 파랑 — 빨강 금지)
 */

import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '@/contexts/NotificationContext'
import MatchStatusBadge from '@/components/ui/MatchStatusBadge'

/* 알림 타입 → 배지 상태 매핑 */
const TYPE_TO_STATE = {
  confirmed: 'confirmed',
  goal:      'live',
  kickoff:   'scheduled',
  fulltime:  'final',
}

function NotifItem({ n, onClick }) {
  const state = TYPE_TO_STATE[n.type] ?? 'scheduled'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '10px 1fr auto',
        gap: 10,
        padding: '12px 16px',
        borderTop: '1px solid var(--pl-line)',
        alignItems: 'start',
        background: n.read ? 'transparent' : 'color-mix(in srgb, var(--pl-primary) 5%, transparent)',
        cursor: 'pointer',
      }}
      onClick={() => onClick(n.id)}
    >
      {/* 안 읽음 점 — 브랜드 파랑 */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: n.read ? 'transparent' : 'var(--pl-primary)',
          marginTop: 6,
          flexShrink: 0,
        }}
        aria-hidden="true"
      />

      <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <MatchStatusBadge state={state} />
          <span className="t-body" style={{ fontWeight: n.read ? 500 : 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {n.title}
          </span>
        </div>
        <span className="t-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {n.body}
        </span>
      </div>

      {/* 시각 */}
      <span className="t-cap num" style={{ flexShrink: 0, color: 'var(--pl-sub)' }}>
        {formatAt(n.at)}
      </span>
    </div>
  )
}

function formatAt(isoString) {
  const d = new Date(isoString)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })
}

export default function NotificationPanel({ onClose }) {
  const { t } = useTranslation()
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()
  const panelRef = useRef(null)

  /* 바깥 클릭 닫기 */
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const empty = notifications.length === 0

  return (
    <div
      ref={panelRef}
      className="pl-card"
      style={{
        width: 400,
        maxWidth: 'calc(100vw - 32px)',
        overflow: 'hidden',
        boxShadow: 'var(--sh-modal)',
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 8,
        zIndex: 1000,
      }}
      role="dialog"
      aria-label={t('notif.bell')}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--pl-line)' }}>
        <span className="t-card">{t('notif.bell')}</span>
        {!empty && unreadCount > 0 && (
          <span className="t-cap num" style={{ color: 'var(--pl-sub)' }}>
            {t('notif.unreadCount', { count: unreadCount })}
          </span>
        )}
        {!empty && unreadCount > 0 && (
          <button
            className="pl-link"
            style={{ marginLeft: 'auto', fontSize: 12 }}
            onClick={markAllRead}
          >
            {t('notif.markAllRead')}
          </button>
        )}
      </div>

      {/* 목록 / 빈 상태 */}
      {empty ? (
        <div style={{ display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center', padding: '44px 24px' }}>
          <span
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--pl-fill-2)', color: 'var(--pl-sub)',
              display: 'grid', placeItems: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M10 3.2a5 5 0 0 0-5 5V12l-1.6 2.6h13.2L15 12V8.2a5 5 0 0 0-5-5zM8 17.2h4" />
            </svg>
          </span>
          <span className="t-card">{t('notif.emptyTitle')}</span>
          <span className="t-sub" style={{ maxWidth: 280 }}>{t('notif.emptyDesc')}</span>
          <Link to="/notifications/settings" className="pl-btn pl-btn-sm" onClick={onClose}>
            {t('notif.openSettings')}
          </Link>
        </div>
      ) : (
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {notifications.map(n => (
            <NotifItem key={n.id} n={n} onClick={id => { markRead(id); onClose() }} />
          ))}
        </div>
      )}

      {/* 푸터 */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--pl-line)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link to="/notifications/settings" className="pl-link" onClick={onClose} style={{ fontSize: 13 }}>
          {t('notif.settingsLink')}
        </Link>
        <span className="t-cap" style={{ marginLeft: 'auto' }}>{t('notif.browserOnly')}</span>
      </div>
    </div>
  )
}
