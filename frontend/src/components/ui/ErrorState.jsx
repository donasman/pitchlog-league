/**
 * API 오류 상태
 * @param {{ title?:string, description?:string, onRetry?:()=>void }} props
 */

import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ErrorState({ title, description, onRetry }) {
  const { t } = useTranslation()
  const displayTitle = title ?? t('common.errorTitle')
  const displayDesc  = description ?? t('common.errorDesc')

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
      <AlertTriangle size={40} className="text-amber-500" aria-hidden="true" />
      <div className="text-center">
        <p className="font-medium text-slate-300">{displayTitle}</p>
        <p className="text-sm mt-1">{displayDesc}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 rounded bg-navy-700 hover:bg-navy-500 text-sm text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}
