/**
 * 라이브 경기 폴링 훅. 화면 3곳(HomePage · MatchesPage · MatchPage)에서 호출.
 *
 * 규칙:
 *   · 마운트 즉시 1회 fetch. 성공 · 실패 관계없이 다음 interval 등록.
 *   · 라이브 있음 → 15,000ms 간격. 라이브 없음(응답 matches.length === 0) → 60,000ms.
 *     응답이 다시 라이브 하나라도 있으면 15,000ms 로 복귀.
 *   · document.visibilityState === 'hidden' 이면 clearInterval + abort. visible 복귀 시 즉시 fetch + interval 재시작.
 *   · AbortController — 언마운트 · visibility hidden 시 in-flight abort.
 *   · 누적 map — 한 번 받은 id 의 마지막 스냅샷을 세션 동안 유지 (fixture 가 5h 창 밖으로 밀려도 삭제 안 함).
 *     반환 map 은 항상 이 누적 map (현재 응답 항목이 없어도 이전 스냅샷이 남아 있다).
 *   · 에러 발생: 이전 data(누적 map) 은 그대로 유지 · error 노출 · `stale:true`.
 *     다음 성공 시 error=null · stale=false.
 *
 * @returns {{
 *   liveMap: Map<string, NormalizedLive>,   // 누적. mergeLive 에 그대로 넘겨라.
 *   asOf: string|null,                       // 마지막 성공 응답의 asOf
 *   error: string|null,
 *   stale: boolean,                          // error 상태이면 true. UI 는 '갱신 지연' 뱃지에 사용.
 * }}
 */
import { useEffect, useRef, useState } from 'react'
import { fetchLiveMatches } from '@/services/api'

const INTERVAL_ACTIVE_MS = 15_000
const INTERVAL_IDLE_MS   = 60_000

export function useLiveMatches() {
  // 누적 스냅샷 · React state 로 두어 소비자 리렌더가 트리거되게 한다.
  const [snapshot, setSnapshot] = useState(() => ({ map: new Map(), asOf: null }))
  const [error, setError] = useState(null)

  // 다음 interval 길이 (라이브 유무에 따라 동적)
  const nextIntervalRef = useRef(INTERVAL_ACTIVE_MS)

  useEffect(() => {
    let disposed = false
    let intervalId = null
    let abortCtl = null

    async function runOnce() {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      abortCtl?.abort()
      abortCtl = new AbortController()
      const localCtl = abortCtl
      try {
        const res = await fetchLiveMatches({ signal: localCtl.signal })
        if (disposed) return
        const arr = res?.matches ?? []
        setSnapshot(prev => {
          // 새 응답의 각 id 를 마지막 값으로 갱신 · 응답에 없는 id 는 그대로 유지
          const next = new Map(prev.map)
          for (const item of arr) if (item && item.id != null) next.set(item.id, item)
          return { map: next, asOf: res?.asOf ?? prev.asOf }
        })
        setError(null)
        nextIntervalRef.current = arr.length > 0 ? INTERVAL_ACTIVE_MS : INTERVAL_IDLE_MS
      } catch (err) {
        if (disposed) return
        // AbortError 는 취소 의도 — stale 상태로 승격하지 않는다
        if (localCtl?.signal?.aborted) return
        setError(err?.message ?? String(err))
        // 오류가 나도 폴링은 계속 · 다음 주기는 짧게 잡아 빠르게 회복 시도
        nextIntervalRef.current = INTERVAL_ACTIVE_MS
      }
    }

    function scheduleNext() {
      if (intervalId != null) clearInterval(intervalId)
      intervalId = setInterval(runOnce, nextIntervalRef.current)
    }

    function onVisibility() {
      if (typeof document === 'undefined') return
      if (document.visibilityState === 'hidden') {
        if (intervalId != null) clearInterval(intervalId)
        intervalId = null
        abortCtl?.abort()
      } else {
        runOnce().then(() => { if (!disposed) scheduleNext() })
      }
    }

    // 첫 실행 + interval 등록
    runOnce().then(() => { if (!disposed) scheduleNext() })

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }

    return () => {
      disposed = true
      if (intervalId != null) clearInterval(intervalId)
      abortCtl?.abort()
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [])

  return {
    liveMap: snapshot.map,
    asOf:    snapshot.asOf,
    error,
    stale:   error !== null,
  }
}
