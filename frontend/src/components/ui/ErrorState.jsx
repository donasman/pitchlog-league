/**
 * API 오류 상태 — 빈 화면으로 위장하지 않는다.
 * 무엇이 실패했는지와 재시도 수단을 반드시 노출한다.
 *
 * @param {{ title?:string, description?:string, onRetry?:()=>void }} props
 */

import { useTranslation } from 'react-i18next'

export default function ErrorState({ title, description, onRetry }) {
  const { t } = useTranslation()
  const displayTitle = title ?? t('common.errorTitle')
  const displayDesc  = description ?? t('common.errorDesc')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        gap: 16,
        textAlign: 'center',
      }}
      role="alert"
    >
      {/* 경고 아이콘 */}
      <span
        aria-hidden="true"
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'rgba(208, 25, 25, .08)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--st-neg)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m10.29 3.86-8.19 14.2A2 2 0 0 0 3.82 21h16.36a2 2 0 0 0 1.72-3l-8.19-14.2a2 2 0 0 0-3.44 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </span>

      <div style={{ display: 'grid', gap: 6 }}>
        <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--pl-text)', margin: 0 }}>
          {displayTitle}
        </p>
        <p className="t-sub" style={{ margin: 0 }}>
          {displayDesc}
        </p>
      </div>

      {onRetry && (
        <button className="pl-btn pl-btn-sm" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}
