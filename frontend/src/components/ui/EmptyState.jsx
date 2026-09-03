/**
 * 빈 결과 상태 — 오류 상태와 시각적으로 구분된다.
 * "데이터 없음"은 서비스 실패가 아니라 필터 조합 결과다.
 *
 * @param {{ title?:string, description?:string }} props
 */

import { useTranslation } from 'react-i18next'

export default function EmptyState({ title, description }) {
  const { t } = useTranslation()
  const displayTitle = title ?? t('common.noDataTitle')
  const displayDesc  = description ?? t('common.noDataDesc')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        gap: 12,
        textAlign: 'center',
      }}
      role="status"
    >
      {/* 아이콘 — 받은편지함 모양으로 "비어있음" 표현 */}
      <span
        aria-hidden="true"
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'var(--pl-fill)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--pl-sub)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      </span>

      <div style={{ display: 'grid', gap: 4 }}>
        <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--pl-text)', margin: 0 }}>
          {displayTitle}
        </p>
        <p className="t-sub" style={{ margin: 0 }}>
          {displayDesc}
        </p>
      </div>

      {/* 다음 행동 안내 — 오류와 구분되는 보조 힌트 */}
      <p className="t-cap" style={{ margin: 0, color: 'var(--pl-sub)' }}>
        {t('common.emptyHint')}
      </p>
    </div>
  )
}
