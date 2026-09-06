/**
 * 권한 요청 카드 — 2단계 진행
 * 1단계: 우리 카드 (설명 + 나중에/알림받기)
 * 2단계: 브라우저 권한 창 (requestPermission 호출)
 *
 * 브라우저 창을 바로 띄우지 않는다 — 거절률이 높고, 거절되면 되돌릴 수 없다.
 */

import { useTranslation } from 'react-i18next'
import { useNotifications } from '@/contexts/NotificationContext'

export default function PermissionCard() {
  const { t } = useTranslation()
  const { permCardVisible, hidePermCard, requestPermission } = useNotifications()

  if (!permCardVisible) return null

  return (
    /* 오버레이 */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11,17,32,.48)',
        zIndex: 8000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={hidePermCard}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="pl-card"
        style={{
          maxWidth: 420,
          width: '100%',
          padding: 20,
          display: 'grid',
          gap: 14,
          boxShadow: 'var(--sh-modal)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <span className="t-sec" style={{ fontSize: 19, margin: 0 }}>{t('notif.permTitle')}</span>
        <span className="t-sub" style={{ lineHeight: 1.65 }}>{t('notif.permDesc')}</span>
        <span className="t-cap">{t('notif.permNote')}</span>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="pl-btn pl-btn-sm pl-btn-ghost" onClick={hidePermCard}>
            {t('notif.permLater')}
          </button>
          <button className="pl-btn pl-btn-sm" onClick={requestPermission}>
            {t('notif.permAccept')}
          </button>
        </div>
      </div>
    </div>
  )
}
