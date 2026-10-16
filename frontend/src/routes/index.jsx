/**
 * React Router 라우트 정의
 * 페이지 단위 React.lazy 적용 — 초기 번들 최소화
 * SPA fallback: 배포 서버에서 모든 경로를 /index.html로 전달해야 함 (FRONTEND_GUIDE.md §9)
 */

import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '@/layouts/AppLayout'

const HomePage          = lazy(() => import('@/pages/HomePage'))
const TeamsPage         = lazy(() => import('@/pages/TeamsPage'))
const CompetitionPage   = lazy(() => import('@/pages/CompetitionPage'))
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

/**
 * route config 를 별도 export 로 노출한다.
 * `createBrowserRouter` 는 `document` 를 요구해 node 환경 (vitest) 에서 임포트 자체가 터진다.
 * 테스트에서는 이 배열만 소비해 route 매핑 회귀를 잠근다 (routes.test.js).
 */
export const routes = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true,                                         element: <HomePage /> },

      // 대회
      { path: 'competitions',                                element: <Navigate to="/competitions/champions-league" replace /> },
      // 이전 UCL 녹아웃 URL 은 대진표 탭으로 리다이렉트 (탭 파라미터가 없어 대회 페이지로만 보낸다 · 09-22 핫픽스)
      { path: 'competitions/champions-league/knockout',      element: <Navigate to="/competitions/champions-league" replace /> },
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
]

// `createBrowserRouter` 는 window/document 를 요구한다 — node (vitest) 에서 임포트만 해도 터진다.
// 테스트는 `routes` 만 소비하므로 브라우저에서만 라우터를 만든다.
export const router = typeof document === 'undefined'
  ? null
  : createBrowserRouter(routes)
