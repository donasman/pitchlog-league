/**
 * HScroller — 공용 가로 슬라이드.
 *
 * 트랙: CSS grid + grid-auto-flow:column · 자식 폭은 "보이는 칸 수"(--visible) 로 자동 계산.
 *   - 모바일(<640px)     : 1.6칸  (다음 카드가 걸쳐 보임 → 스크롤이 가능함을 알린다)
 *   - 태블릿(640~1023)   : 3칸
 *   - 데스크톱(≥1024)    : 5칸
 *
 * 화살표: ≥768px 에서만 등장. 트랙 양끝 세로 중앙 · 44px 원형.
 *   맨 앞/맨 끝 도달 시 해당 방향 화살표는 숨김 (scroll 이벤트 + ResizeObserver, rAF throttle).
 *   scrollBy 는 clientWidth * 90% · reduced-motion 이면 'auto' 로 즉시.
 *
 * 페이드: 넘칠 때만 · 도달한 쪽 해제.
 * 접근성: role="region" · aria-label · tabIndex=0 (좌우 방향키로 스크롤).
 *
 * @param {{ rows?:number, gap?:number, ariaLabel:string,
 *           children: import('react').ReactNode }} props
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

export default function HScroller({ rows = 1, gap = 12, ariaLabel, children }) {
  const { t } = useTranslation()
  const trackRef = useRef(null)
  const [atStart, setAtStart]     = useState(true)
  const [atEnd, setAtEnd]         = useState(true)
  const [overflow, setOverflow]   = useState(false)

  const updateEdges = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const overflows = el.scrollWidth > el.clientWidth + 1
    setOverflow(overflows)
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(!overflows || el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; updateEdges() })
    }
    updateEdges()
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateEdges) : null
    ro?.observe(el)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro?.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [updateEdges])

  const scrollByDir = useCallback((dir) => {
    const el = trackRef.current
    if (!el) return
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior })
  }, [])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollByDir(-1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollByDir(1)  }
  }

  return (
    <div className="pl-hscroller">
      <div
        ref={trackRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="pl-hscroller-track"
        data-fade-l={overflow && !atStart ? '1' : undefined}
        data-fade-r={overflow && !atEnd   ? '1' : undefined}
        style={{ '--pl-hs-rows': rows, '--pl-hs-gap': `${gap}px` }}
      >
        {children}
      </div>
      {overflow && !atStart && (
        <button
          type="button"
          aria-label={t('common.scrollPrev')}
          onClick={() => scrollByDir(-1)}
          className="pl-hscroller-arrow pl-hscroller-arrow-prev"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
      )}
      {overflow && !atEnd && (
        <button
          type="button"
          aria-label={t('common.scrollNext')}
          onClick={() => scrollByDir(1)}
          className="pl-hscroller-arrow pl-hscroller-arrow-next"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
