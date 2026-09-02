/**
 * 경기 상태 배지
 * LIVE / HT / 예정 / 종료 / 재검증 / 확정 / 연기 / 취소 상태를 색상+텍스트로 구분.
 * 색상만으로 구분하지 않고 텍스트 레이블을 반드시 함께 표시.
 * 언어: useTranslation + STATUS_LABEL_KEYS / STATUS_DESC_KEYS
 *
 * @param {{ state:string, showDescription?:boolean }} props
 */

import { useTranslation } from 'react-i18next'
import { STATUS_LABEL_KEYS, STATUS_DESC_KEYS } from '@/utils/matchStatus'

const STATE_STYLE = {
  scheduled: 'bg-muted text-muted-foreground',
  live:      'bg-red-600 text-white',
  halftime:  'bg-yellow-500 text-white dark:bg-yellow-600',
  final:     'bg-muted text-muted-foreground',
  recheck:   'bg-amber-100 text-amber-800 dark:bg-amber-700 dark:text-amber-100',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200',
  postponed: 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200',
  cancelled: 'bg-muted text-muted-foreground/50',
}

export default function MatchStatusBadge({ state, showDescription = false }) {
  const { t } = useTranslation()

  const safeState = STATE_STYLE[state] ? state : 'scheduled'
  const label    = t(STATUS_LABEL_KEYS[safeState])
  const ariaDesc = t(STATUS_DESC_KEYS[safeState])

  return (
    <div className="inline-flex flex-col gap-0.5">
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold tracking-wide whitespace-nowrap ${STATE_STYLE[safeState]}`}
        aria-label={ariaDesc}
      >
        {safeState === 'live' && (
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
        )}
        {label}
      </span>
      {showDescription && (
        <span className="text-xs text-muted-foreground">{ariaDesc}</span>
      )}
    </div>
  )
}
