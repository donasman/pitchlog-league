/**
 * 로딩 스켈레톤
 * @param {{ rows?:number, variant?:'row'|'card'|'text' }} props
 */

import { useTranslation } from 'react-i18next'

function Bar({ className = '' }) {
  return <div className={`bg-navy-700 rounded animate-pulse ${className}`} aria-hidden="true" />
}

export default function LoadingSkeleton({ rows = 5, variant = 'row' }) {
  const { t } = useTranslation()
  const label = t('common.loading')

  if (variant === 'card') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="status" aria-label={label}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="bg-navy-800 rounded-lg p-4 space-y-3">
            <Bar className="h-4 w-3/4" />
            <Bar className="h-8 w-full" />
            <Bar className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'text') {
    return (
      <div className="space-y-2" role="status" aria-label={label}>
        {Array.from({ length: rows }).map((_, i) => (
          <Bar key={i} className={`h-4 ${i % 3 === 2 ? 'w-1/2' : 'w-full'}`} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1" role="status" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 px-2">
          <Bar className="h-4 w-6" />
          <Bar className="w-7 h-7 rounded-lg flex-shrink-0" />
          <Bar className="h-4 flex-1" />
          <Bar className="h-4 w-8" />
          <Bar className="h-4 w-10" />
        </div>
      ))}
    </div>
  )
}
