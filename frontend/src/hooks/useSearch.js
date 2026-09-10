/**
 * 검색 훅 — 250ms 디바운스 + AbortController + 세 상태(loading · results · error).
 *
 * SearchPanel 이 소비하는 유일한 검색 진입점. `fetchSearch` 는 `services/api.js` 가
 * Mock/Live 를 골라 준다 — 이 훅은 스위치를 몰라도 된다.
 *
 * 오류를 빈 결과로 위장하지 않는다 (FRONTEND_GUIDE §5) — 실패는 error 상태로 노출.
 * abort 는 사용자 의도(빠른 재입력·언마운트)라 조용히 무시한다 (AssistantContext 와 같은 규칙).
 *
 * 상태 규약:
 *   - 빈 쿼리 (trim 후 0자): { results: null, loading: false, error: null }
 *   - 요청 중:                { results: 이전 결과 or null, loading: true, error: null }
 *   - 성공:                   { results: {...}, loading: false, error: null }
 *   - 실패:                   { results: null, loading: false, error: string }
 *
 * 이전 결과를 로딩 중에도 유지하는 이유: 입력이 한 글자씩 바뀔 때 검색 목록이 깜빡이지
 * 않게 한다 (사용자 경험). 새 결과가 도착하면 그때 교체.
 *
 * @param {string} query  검색어 (원시 사용자 입력)
 * @param {number} [debounceMs=250]  디바운스 시간
 * @returns {{ results: {teams:Array,players:Array,competitions:Array}|null, loading: boolean, error: string|null }}
 */

import { useEffect, useRef, useState } from 'react'
import { fetchSearch } from '@/services/api'

const DEFAULT_DEBOUNCE_MS = 250

export function useSearch(query, debounceMs = DEFAULT_DEBOUNCE_MS) {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const abortRef     = useRef(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const q = (query ?? '').trim()

    // 빈 쿼리 — 이전 결과·오류를 지운다. 요청도 보내지 않는다
    if (!q) {
      abortRef.current?.abort()
      setResults(null)
      setLoading(false)
      setError(null)
      return
    }

    // 디바운스 — 250ms 안에 새 입력이 오면 요청을 보내지 않는다
    const timer = setTimeout(() => {
      // 진행 중이던 요청 취소 → 새 controller 로 교체
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      setError(null)

      fetchSearch(q, { signal: controller.signal })
        .then(data => {
          // 뒤늦게 도착한 응답은 새 요청이 있으면 버린다 (controller 가 abort 됐다는 것으로 판정)
          if (!isMountedRef.current || controller.signal.aborted) return
          setResults(data)
          setLoading(false)
        })
        .catch(err => {
          // abort 는 사용자 의도(새 입력·언마운트) — 오류로 그리지 않는다
          if (controller.signal.aborted) return
          if (!isMountedRef.current) return
          // 오류를 빈 결과로 감추지 않는다 — error 상태로 SearchPanel 이 명시적으로 그린다
          setResults(null)
          setLoading(false)
          setError(err?.message ?? String(err))
        })
    }, debounceMs)

    return () => {
      clearTimeout(timer)
    }
  }, [query, debounceMs])

  return { results, loading, error }
}
