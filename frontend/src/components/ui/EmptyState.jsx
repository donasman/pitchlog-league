/**
 * 빈 결과 상태
 * @param {{ title?:string, description?:string }} props
 */

import { Inbox } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function EmptyState({ title, description }) {
  const { t } = useTranslation()
  const displayTitle = title ?? t('common.noDataTitle')
  const displayDesc  = description ?? t('common.noDataDesc')

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
      <Inbox size={40} aria-hidden="true" />
      <div className="text-center">
        <p className="font-medium text-slate-400">{displayTitle}</p>
        <p className="text-sm mt-1">{displayDesc}</p>
      </div>
    </div>
  )
}
