/**
 * 404 페이지
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '40px 24px' }}>
      <div style={{ display: 'grid', gap: 16, justifyItems: 'center', textAlign: 'center', maxWidth: 520 }}>
        <span className="num" style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-.03em', color: 'var(--pl-text)' }}>
          404
        </span>
        <div style={{ display: 'grid', gap: 8 }}>
          <h1 className="t-sec" style={{ margin: 0, fontSize: 22 }}>{t('notFound.title')}</h1>
          <p className="t-sub" style={{ margin: 0 }}>{t('notFound.desc')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/" className="pl-btn">{t('notFound.home')}</Link>
          <Link to="/matches" className="pl-btn pl-btn-ghost">{t('matches.pageTitle')}</Link>
          <Link to="/standings" className="pl-btn pl-btn-ghost">{t('standings.title')}</Link>
        </div>
      </div>
    </div>
  )
}
