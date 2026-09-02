/**
 * 비동기 데이터 조회 Hook
 * 로딩·정상·오류·빈 결과 상태를 구분.
 * 오류를 빈 배열로 숨기지 않음 (FRONTEND_GUIDE.md §5).
 * unmount 후 상태 변경 방지.
 *
 * @template T
 * @param {() => Promise<T>} fetchFn  서비스 계층 함수
 * @param {any[]} deps  변경 시 재조회할 의존값 배열
 * @returns {{ data: T|null, loading: boolean, error: string|null }}
 *
 * @example
 * const { data: match, loading, error } = useData(() => fetchMatch(id), [id])
 */

import { useState, useEffect } from 'react'

export function useData(fetchFn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  useEffect(() => {
    let mounted = true
    setState({ data: null, loading: true, error: null })

    fetchFn()
      .then(data => {
        if (mounted) setState({ data, loading: false, error: null })
      })
      .catch(err => {
        if (mounted) setState({ data: null, loading: false, error: err?.message ?? String(err) })
      })

    return () => {
      mounted = false
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  return state
}
