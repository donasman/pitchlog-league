/**
 * routes 설정 회귀 잠금
 *
 * `/competitions` 는 `CompetitionsPage` 를 삭제한 뒤 `/competitions/premier-league` 로
 * replace 리다이렉트한다. 이 잠금이 없으면 누가 `<Navigate>` 를 지우거나 다른 slug 로
 * 바꿔도 CI 가 알려주지 못한다.
 *
 * 이 프로젝트의 vitest 는 `environment: 'node'` 에 jsdom 이 없다 (vitest.config.js:12).
 * 그래서 `createBrowserRouter` 나 `createMemoryRouter` 를 실제로 렌더링하지 않고
 * (둘 다 `document` 를 요구한다) `routes` 배열만 소비해 매치되는 route 의 element 가
 * `<Navigate>` 이고 to=... replace 인지만 검증한다.
 */

import { describe, it, expect } from 'vitest'
import { Navigate } from 'react-router-dom'
import { routes } from './index.jsx'

/** routes 트리에서 부모 path + child path 를 이어붙여 전체 경로가 target 인 route 를 찾는다. */
function findRouteByPath(nodes, target, parent = '') {
  for (const route of nodes) {
    const raw = route.path ?? ''
    // React Router 는 index 라우트, absolute path 자식, 상대 path 자식이 섞인다.
    const full = raw.startsWith('/')
      ? raw
      : parent
        ? `${parent.replace(/\/$/, '')}/${raw}`.replace(/\/+/g, '/')
        : `/${raw}`
    if (route.path && full === target) return route
    if (route.children) {
      const found = findRouteByPath(route.children, target, full)
      if (found) return found
    }
  }
  return null
}

describe('route: /competitions redirect', () => {
  it('redirects /competitions to /competitions/premier-league (replace)', () => {
    const route = findRouteByPath(routes, '/competitions')
    expect(route).not.toBeNull()
    expect(route.element).toBeDefined()
    expect(route.element.type).toBe(Navigate)
    expect(route.element.props.to).toBe('/competitions/premier-league')
    expect(route.element.props.replace).toBe(true)
  })
})
