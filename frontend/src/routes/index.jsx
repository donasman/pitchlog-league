/**
 * React Router 라우트 정의
 * 페이지 단위 React.lazy 적용 — 초기 번들 최소화
 * SPA fallback: 배포 서버에서 모든 경로를 /index.html로 전달해야 함 (FRONTEND_GUIDE.md §9)
 */

import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/layouts/AppLayout'

const HomePage          = lazy(() => import('@/pages/HomePage'))
const TeamsPage         = lazy(() => import('@/pages/TeamsPage'))
const CompetitionsPage  = lazy(() => import('@/pages/CompetitionsPage'))
const CompetitionPage   = lazy(() => import('@/pages/CompetitionPage'))
const UCLKnockoutPage   = lazy(() => import('@/pages/UCLKnockoutPage'))
const MatchesPage       = lazy(() => import('@/pages/MatchesPage'))
const MatchPage         = lazy(() => import('@/pages/MatchPage'))
const StandingsPage     = lazy(() => import('@/pages/StandingsPage'))
const TeamPage          = lazy(() => import('@/pages/TeamPage'))
const TeamFixturesPage  = lazy(() => import('@/pages/TeamFixturesPage'))
const PlayerPage        = lazy(() => import('@/pages/PlayerPage'))
const StatsPage         = lazy(() => import('@/pages/StatsPage'))
const NotFoundPage          = lazy(() => import('@/pages/NotFoundPage'))
const PartsPage             = lazy(() => import('@/pages/PartsPage'))
const NotificationsPage     = lazy(() => import('@/pages/NotificationsPage'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true,                                         element: <HomePage /> },

      // 대회
      { path: 'competitions',                                element: <CompetitionsPage /> },
      { path: 'competitions/champions-league/knockout',      element: <UCLKnockoutPage /> },
      { path: 'competitions/:slug',                          element: <CompetitionPage /> },

      // 경기
      { path: 'matches',                                     element: <MatchesPage /> },
      { path: 'matches/:fixtureId',                          element: <MatchPage /> },

      // 순위
      { path: 'standings',                                   element: <StandingsPage /> },

      // 팀
      { path: 'teams',                                       element: <TeamsPage /> },
      { path: 'teams/:slug',                                 element: <TeamPage /> },
      { path: 'teams/:slug/fixtures',                        element: <TeamFixturesPage /> },

      // 통계
      { path: 'stats',                                       element: <StatsPage /> },

      // 선수
      { path: 'players/:slug',                               element: <PlayerPage /> },

      // 알림
      { path: 'notifications/settings',                      element: <NotificationsPage /> },

      // 개발 전용: 부품 시트
      { path: 'dev/parts',                                   element: <PartsPage /> },

      // 404
      { path: '*',                                           element: <NotFoundPage /> },
    ],
  },
])
