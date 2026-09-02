/**
 * 404 페이지
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
      <div className="text-6xl font-black text-slate-700">404</div>
      <div>
        <h1 className="text-xl font-bold text-foreground">{t('notFound.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('notFound.desc')}</p>
      </div>
      <Link
        to="/"
        className="px-5 py-2.5 rounded-lg bg-green-700 hover:bg-green-600 text-white font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        {t('notFound.home')}
      </Link>
    </div>
  )
}
