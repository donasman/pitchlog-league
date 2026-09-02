/**
 * 공통 레이아웃 — 헤더 + 콘텐츠 + 푸터
 */

import { Outlet, ScrollRestoration } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AppHeader from '@/components/layout/AppHeader'

export default function AppLayout() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border py-4 px-6 text-center text-xs text-muted-foreground">
        PitchLog — {t('common.mockNotice')}
      </footer>
      <ScrollRestoration />
    </div>
  )
}
