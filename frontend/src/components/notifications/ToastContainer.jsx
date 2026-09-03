/**
 * 토스트 스택 컨테이너
 * - 최대 3개 visible, 초과분 → "가려진 알림 N건" collapse row
 * - 확정(confirmed) 알림이 항상 맨 위
 * - 위치: 우하단 fixed (desktop), 헤더 아래 상단 (mobile은 Portal 불필요)
 */

import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '@/contexts/NotificationContext'
import Toast from './Toast'

const MAX_VISIBLE = 3

export default function ToastContainer() {
  const { t } = useTranslation()
  const { toasts, dismissToast, dismissAllToasts } = useNotifications()

  const visible   = toasts.slice(0, MAX_VISIBLE)
  const collapsed = toasts.length - MAX_VISIBLE

  const dismiss = useCallback(id => dismissToast(id), [dismissToast])

  if (!toasts.length) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9000,
        display: 'grid',
        gap: 10,
        justifyItems: 'end',
        pointerEvents: 'none',
      }}
      aria-label={t('notif.bell')}
    >
      {/* 확정 알림을 항상 맨 위 */}
      {visible
        .slice()
        .sort((a, b) => (a.type === 'confirmed' ? -1 : b.type === 'confirmed' ? 1 : 0))
        .map(n => (
          <div key={n._toastId ?? n.id} style={{ pointerEvents: 'auto' }}>
            <Toast notification={n} onDismiss={() => dismiss(n._toastId ?? n.id)} />
          </div>
        ))
      }

      {/* 가려진 알림 */}
      {collapsed > 0 && (
        <div
          className="pl-card"
          style={{
            width: 340,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: 'var(--sh-over)',
            pointerEvents: 'auto',
          }}
        >
          <span className="t-sub">{t('notif.collapsedCount', { count: collapsed })}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="pl-link" onClick={() => {}}>
              {t('notif.showAll')}
            </button>
            <button className="pl-link" onClick={dismissAllToasts}>
              {t('notif.dismissAll')}
            </button>
          </span>
        </div>
      )}
    </div>
  )
}
