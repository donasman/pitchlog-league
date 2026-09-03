/**
 * 공통 레이아웃 — 헤더 + 콘텐츠 + 푸터
 * ToastContainer · PermissionCard 전역 레이어 포함
 */

import { Outlet, ScrollRestoration } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AppHeader from '@/components/layout/AppHeader'
import ToastContainer from '@/components/notifications/ToastContainer'
import PermissionCard from '@/components/notifications/PermissionCard'

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

      {/* 전역 알림 레이어 */}
      <ToastContainer />
      <PermissionCard />
    </div>
  )
}
