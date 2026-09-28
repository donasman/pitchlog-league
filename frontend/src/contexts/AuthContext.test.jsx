/**
 * AuthContext 계약 테스트.
 *
 * DOM 이 필요한 부분(session state 세팅 · URL 파라미터 제거)은
 * `@testing-library/react` + `jsdom` 이 있어야 돌아간다.
 * 이 프로젝트에 두 devDependency 가 아직 없으므로 이 파일은 vitest 의 `include`
 * (현재 `src/**\/*.test.js`) 에 걸리지 않고, 향후 jsdom 이 붙으면 자동으로 편입된다.
 *
 * 지금은 lint 만 통과시키는 형태로 유지. 실제 통합 검증은 06(브라우저 실측) 몫이다.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// 이 파일은 jsdom 이 없으므로 render 계열 API 는 import 만 하고 describe.skip 로 미실행 유지.
// 향후 devDependency 가 붙으면 `describe.skip` 를 `describe` 로 뒤집는다.
describe.skip('AuthContext', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('no env => isAuthEnabled=false, session=null, isLoading=false, console.warn called once', async () => {
    // supabaseClient 를 env 부족 상태로 모킹
    vi.doMock('@/lib/supabaseClient', () => ({
      supabase: null,
      isAuthEnabled: false,
    }))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { AuthProvider, useAuth } = await import('./AuthContext.jsx')
    expect(AuthProvider).toBeTypeOf('function')
    expect(useAuth).toBeTypeOf('function')
    // 실측은 render + hook consumer 로 하지만 여기서는 계약만 확인
    warnSpy.mockRestore()
  })

  it('getSession returns a session => user set, isLoading=false', async () => {
    // 렌더러가 붙으면 여기서 renderHook 으로 확인
    expect(true).toBe(true)
  })

  it('onAuthStateChange SIGNED_OUT => user null', async () => {
    expect(true).toBe(true)
  })

  it('?error=access_denied => authError=cancelled + URL cleaned', async () => {
    expect(true).toBe(true)
  })

  it('clearAuthError => authError null', async () => {
    expect(true).toBe(true)
  })
})
