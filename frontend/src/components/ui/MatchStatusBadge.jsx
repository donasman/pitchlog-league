/**
 * 경기 상태 배지 8종
 * 예정·LIVE·하프타임·종료·재검증 중·확정·연기·취소
 * 색상 외 형태 단서(도트, 점선, 취소선)로 구분 — 색상 단독 의존 금지
 *
 * @param {{ state:string, showDescription?:boolean }} props
 */

import { useTranslation } from 'react-i18next'
import { STATUS_LABEL_KEYS, STATUS_DESC_KEYS } from '@/utils/matchStatus'

const STATE_BADGE_CLASS = {
  scheduled: 'pl-badge b-sched',
  live:      'pl-badge b-live',
  halftime:  'pl-badge b-half',
  final:     'pl-badge b-ft',
  recheck:   'pl-badge b-recheck',
  confirmed: 'pl-badge b-final',
  postponed: 'pl-badge b-post',
  cancelled: 'pl-badge b-cancel',
}

export default function MatchStatusBadge({ state, showDescription = false }) {
  const { t } = useTranslation()
  const safeState = STATE_BADGE_CLASS[state] ? state : 'scheduled'
  const label    = t(STATUS_LABEL_KEYS[safeState])
  const ariaDesc = t(STATUS_DESC_KEYS[safeState])

  return (
    <div className="inline-flex flex-col gap-0.5">
      <span
        className={STATE_BADGE_CLASS[safeState]}
        aria-label={ariaDesc}
      >
        {safeState === 'live' && (
          <span className="pl-dot pl-dot-pulse" aria-hidden="true" />
        )}
        {safeState === 'halftime' && (
          <span className="pl-dot pl-dot-ring" aria-hidden="true" />
        )}
        {label}
      </span>
      {showDescription && (
        <span className="t-cap" style={{ color: 'var(--pl-sub)' }}>{ariaDesc}</span>
      )}
    </div>
  )
}
