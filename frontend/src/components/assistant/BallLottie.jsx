/**
 * BallLottie — 어시스턴트 "생각 중" 로더 (Lottie 애니메이션)
 *
 * 렌더 계층:
 *   1) prefers-reduced-motion: reduce → Lottie 로드하지 않고 정적 SVG 만 표시
 *   2) 로드 성공 → Lottie SVG 애니메이션
 *   3) 로드 실패 → 정적 SVG 로 폴백
 *
 * lottie-web 은 SVG 전용 경량판(lottie_light) 을 동적 import 로 지연 로드해
 * 초기 청크에 넣지 않는다. animationData 도 동적 import 로 청크 분리.
 *
 * 색상은 CSS 로 덮어씌운다 — JSON 의 rgb(0,0,0) → currentColor(=--pl-primary),
 * rgb(51,51,51) → --pl-text @ opacity .18 (styles/tokens.css 의 .pl-ball-lottie 규칙).
 */

import { useEffect, useRef, useState } from 'react'

const BALL_SPEED = 1.25

/* 정적 폴백 — 로드 전·실패·reduced-motion 에 표시하는 브랜드색 축구공 */
function StaticFallback() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" style={{ display: 'block' }}>
      <circle cx="12" cy="12" r="10.5" fill="var(--pl-card)" stroke="currentColor" strokeWidth="1.5" />
      <polygon points="12,7.2 15.6,9.8 14.2,14 9.8,14 8.4,9.8" fill="currentColor" />
      <path
        d="M12 7.2V2.6 M15.6 9.8 19.9 8.2 M14.2 14 16.9 17.9 M9.8 14 7.1 17.9 M8.4 9.8 4.1 8.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export default function BallLottie() {
  const containerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false

    if (reduced) {
      setFallback(true)
      return
    }

    let anim = null
    let cancelled = false

    Promise.all([
      import('lottie-web/build/player/lottie_light'),
      import('@/assets/lottie/ball-loader.json'),
    ])
      .then(([mod, data]) => {
        if (cancelled || !containerRef.current) return
        const lottie = mod.default ?? mod
        const animationData = data.default ?? data
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData,
        })
        anim.setSpeed(BALL_SPEED)
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setFallback(true)
      })

    return () => {
      cancelled = true
      if (anim) anim.destroy()
    }
  }, [])

  return (
    <span className="pl-ball-lottie" aria-hidden="true">
      {fallback ? (
        <StaticFallback />
      ) : (
        <>
          <span
            ref={containerRef}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              visibility: ready ? 'visible' : 'hidden',
            }}
          />
          {!ready && (
            <span style={{ position: 'absolute', inset: 0, display: 'block' }}>
              <StaticFallback />
            </span>
          )}
        </>
      )}
    </span>
  )
}
