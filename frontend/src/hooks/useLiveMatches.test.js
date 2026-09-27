/**
 * useLiveMatches 훅 스모크 테스트.
 *
 * ** 왜 스모크만 있는가 **
 * package.json:16-42 확인 결과 `@testing-library/react` 가 없다 (deps 목록에 없음).
 * vitest 는 node env 기본이라 useEffect 가 트리거되지 않고, renderToString 은 useEffect 를
 * 아예 안 돌린다 (SSR 은 mount 효과가 생략된다) — 이 훅의 핵심(폴링·visibility·abort·누적 map)은
 * 브라우저·jsdom 없이 검증할 수 없다.
 *
 * 여기서는 다음만 잠근다:
 *   1) 모듈이 로드된다 (import 부작용 없음)
 *   2) `useLiveMatches` 라는 함수가 export 된다 (규약)
 *
 * 폴링 규칙 (15s active · 60s idle · visibility hidden abort · 누적 map · stale on error)
 * 은 06 브라우저 실측 (frontend-verifier) 에서 확인해야 한다. 이 사실은 이 판 보고서에도 남긴다.
 */

import { describe, it, expect } from 'vitest'
import * as mod from './useLiveMatches'

describe('useLiveMatches (smoke)', () => {
  it('module loads without side effects and exports a function', () => {
    expect(typeof mod.useLiveMatches).toBe('function')
  })
})
