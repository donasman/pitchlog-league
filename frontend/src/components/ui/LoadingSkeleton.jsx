/**
 * 로딩 스켈레톤
 * 실제 콘텐츠와 같은 레이아웃을 유지해 레이아웃 이동(CLS)을 최소화한다.
 *
 * @param {{ rows?:number, variant?:'row'|'card'|'text' }} props
 */

import { useTranslation } from 'react-i18next'

function Bar({ style }) {
  return <div className="pl-sk" style={style} aria-hidden="true" />
}

export default function LoadingSkeleton({ rows = 5, variant = 'row' }) {
  const { t } = useTranslation()
  const label = t('common.loading')

  if (variant === 'card') {
    return (
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}
        role="status"
        aria-label={label}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="pl-card" style={{ padding: 16, display: 'grid', gap: 12 }}>
            <Bar style={{ height: 16, width: '75%' }} />
            <Bar style={{ height: 40 }} />
            <Bar style={{ height: 12, width: '50%' }} />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'text') {
    return (
      <div style={{ display: 'grid', gap: 8 }} role="status" aria-label={label}>
        {Array.from({ length: rows }).map((_, i) => (
          <Bar key={i} style={{ height: 16, width: i % 3 === 2 ? '50%' : '100%' }} />
        ))}
      </div>
    )
  }

  /* row — 순위표·목록 행 */
  return (
    <div style={{ display: 'grid', gap: 4 }} role="status" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
          <Bar style={{ height: 14, width: 24 }} />
          <Bar style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0 }} />
          <Bar style={{ height: 14, flex: 1 }} />
          <Bar style={{ height: 14, width: 32 }} />
          <Bar style={{ height: 14, width: 40 }} />
        </div>
      ))}
    </div>
  )
}
