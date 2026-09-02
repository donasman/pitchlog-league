/**
 * 데이터 기준 시각 표시
 * 언어에 따라 레이블과 날짜 형식이 바뀜.
 * @param {{ updatedAt:string, className?:string }} props
 */

import { Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toKSTDateTime } from '@/utils/dateFormat'

export default function DataTimestamp({ updatedAt, className = '' }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  if (!updatedAt) return null
  return (
    <div className={`flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
      <Clock size={11} aria-hidden="true" />
      <span>{t('common.dataUpdated', { datetime: toKSTDateTime(updatedAt, locale) })}</span>
    </div>
  )
}
