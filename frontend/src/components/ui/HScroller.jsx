/**
 * HScroller — 공용 가로 슬라이드.
 *
 * 렌더 구조:
 *   <div class="pl-hscroller">
 *     [header (선택)]            ← 컨트롤(prev·next·pause) 은 헤더에 위치. 트랙 위 절대 배치 제거.
 *     <div class="pl-hscroller-track"> children </div>
 *   </div>
 *
 * 2줄(rows=2) 순서 = **행 우선**:
 *   cols = ceil(n/rows), grid-auto-flow:row, grid-template-columns:repeat(cols, W).
 *   윗줄 1..cols, 아랫줄 cols+1..n. 두 줄이 함께 좌우 스크롤.
 *   rows=1 은 grid-auto-flow:column 그대로 유지.
 *
 * 자동 슬라이드 (props: autoPlay, intervalMs=5000, startDelayMs=0):
 *   - 넘칠 때만, IO ≥50% 보일 때만 동작
 *   - 한 번에 clientWidth × 90% 이동 (수동 화살표와 동일)
 *   - 끝 도달 시 다음 틱에 처음으로 smooth 복귀
 *   - hover · focus-within · pointerdown(터치) 시 일시정지, 떠나면 재개(터치는 5초 후 재개)
 *   - document.hidden 이면 정지, prefers-reduced-motion 이면 autoPlay 무시
 *   - 헤더 pause 버튼 눌러 사용자가 명시적으로 정지하면 세션 동안 재개하지 않음
 *
 * @param {{
 *   rows?: number,
 *   gap?: number,
 *   ariaLabel: string,
 *   autoPlay?: boolean,
 *   intervalMs?: number,
 *   startDelayMs?: number,
 *   showPauseToggle?: boolean,
 *   header?: (ctrl: HScrollerControl) => import('react').ReactNode,
 *   children: import('react').ReactNode
 * }} props
 */

import { Children, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

/** 아이템 개수와 rows 로부터 행 우선 배치의 열 수 계산 (순수) */
export function computeCols(count, rows) {
  const r = Math.max(1, Math.floor(rows) || 1)
  const n = Math.max(0, Math.floor(count) || 0)
  return Math.max(1, Math.ceil(n / r))
}

/** 자동 슬라이드 실행 여부 결정 (순수) */
export function shouldAutoTick({
  autoPlay,
  overflow,
  reducedMotion,
  pausedByUser,
  pausedByInteraction,
  visible,
  documentVisible,
}) {
  return !!(
    autoPlay &&
    overflow &&
    !reducedMotion &&
    !pausedByUser &&
    !pausedByInteraction &&
    visible &&
    documentVisible
  )
}

/**
 * 다음 자동 스크롤 대상 계산 (순수).
 * 끝에 도달했으면 처음으로 복귀, 아니면 clientWidth 의 90% 만큼 우측 이동.
 */
export function computeAutoScrollTarget({ scrollLeft, clientWidth, scrollWidth }) {
  const atEnd = scrollLeft + clientWidth >= scrollWidth - 1
  if (atEnd) return { type: 'wrap', delta: scrollLeft === 0 ? 0 : -scrollLeft }
  return { type: 'step', delta: clientWidth * 0.9 }
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

export default function HScroller({
  rows = 1,
  gap = 12,
  ariaLabel,
  autoPlay = false,
  intervalMs = 5000,
  startDelayMs = 0,
  showPauseToggle = false,
  header,
  children,
}) {
  const { t } = useTranslation()
  const trackRef = useRef(null)
  const [atStart, setAtStart]   = useState(true)
  const [atEnd, setAtEnd]       = useState(true)
  const [overflow, setOverflow] = useState(false)

  const [pausedByUser, setPausedByUser]               = useState(false)
  const [pausedByInteraction, setPausedByInteraction] = useState(false)
  const [visible, setVisible]                         = useState(true)
  const [documentVisible, setDocumentVisible]         = useState(
    typeof document === 'undefined' ? true : !document.hidden,
  )
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion)

  const count = Children.count(children)
  const cols = useMemo(() => computeCols(count, rows), [count, rows])

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
  }, [updateEdges, count, rows])

  /* reduced-motion 매체 쿼리 변화 반영 */
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  /* document.hidden 반영 */
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVis = () => setDocumentVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  /* IntersectionObserver — 화면에 50% 이상 보일 때만 자동 슬라이드 */
  useEffect(() => {
    const el = trackRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) setVisible(e.isIntersecting && e.intersectionRatio >= 0.5)
      },
      { threshold: [0, 0.5, 1] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const scrollByDir = useCallback((dir) => {
    const el = trackRef.current
    if (!el) return
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior })
  }, [])

  const autoTick = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const target = computeAutoScrollTarget({
      scrollLeft: el.scrollLeft,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
    })
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
    el.scrollBy({ left: target.delta, behavior })
  }, [])

  /* 자동 슬라이드 타이머 — 조건 만족 시 startDelay 후 첫 틱, 이후 intervalMs 마다 반복 */
  useEffect(() => {
    const run = shouldAutoTick({
      autoPlay, overflow, reducedMotion,
      pausedByUser, pausedByInteraction,
      visible, documentVisible,
    })
    if (!run) return
    let intervalId = 0
    const startId = setTimeout(() => {
      autoTick()
      intervalId = setInterval(autoTick, Math.max(1000, intervalMs))
    }, Math.max(0, startDelayMs))
    return () => {
      clearTimeout(startId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [
    autoPlay, overflow, reducedMotion,
    pausedByUser, pausedByInteraction,
    visible, documentVisible,
    intervalMs, startDelayMs, autoTick,
  ])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollByDir(-1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollByDir(1)  }
  }

  /* hover · focus · touch 일시정지 */
  const touchResumeTimer = useRef(0)
  const onPointerEnter = (e) => {
    if (e.pointerType === 'touch') return
    setPausedByInteraction(true)
  }
  const onPointerLeave = (e) => {
    if (e.pointerType === 'touch') return
    setPausedByInteraction(false)
  }
  const onPointerDown = (e) => {
    if (e.pointerType !== 'touch') return
    setPausedByInteraction(true)
    if (touchResumeTimer.current) clearTimeout(touchResumeTimer.current)
    touchResumeTimer.current = setTimeout(() => setPausedByInteraction(false), 5000)
  }
  const onFocusIn  = () => setPausedByInteraction(true)
  const onFocusOut = () => setPausedByInteraction(false)

  useEffect(() => () => {
    if (touchResumeTimer.current) clearTimeout(touchResumeTimer.current)
  }, [])

  const togglePause = useCallback(() => setPausedByUser(v => !v), [])

  const ctrl = {
    scrollPrev: () => scrollByDir(-1),
    scrollNext: () => scrollByDir(1),
    atStart, atEnd, overflow,
    paused: pausedByUser,
    togglePause,
    showPauseToggle: showPauseToggle && autoPlay && !reducedMotion,
    autoPlayActive: autoPlay && !reducedMotion,
    labels: {
      prev: t('common.scrollPrev'),
      next: t('common.scrollNext'),
      pause: t('common.pause'),
      play:  t('common.play'),
    },
  }

  const trackStyle = { '--pl-hs-rows': rows, '--pl-hs-gap': `${gap}px` }
  if (rows > 1) trackStyle['--pl-hs-cols'] = cols

  return (
    <div className="pl-hscroller">
      {header ? header(ctrl) : null}
      <div
        ref={trackRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onFocus={onFocusIn}
        onBlur={onFocusOut}
        className="pl-hscroller-track"
        data-flow={rows > 1 ? 'row' : 'column'}
        data-fade-l={overflow && !atStart ? '1' : undefined}
        data-fade-r={overflow && !atEnd   ? '1' : undefined}
        style={trackStyle}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * 헤더 컨트롤 바 — HScroller 의 header 렌더 프롭 안에서 쓴다.
 * 넘치지 않으면(overflow=false) 자체적으로 아무것도 렌더하지 않는다.
 */
export function HScrollerHeaderControls({
  scrollPrev,
  scrollNext,
  atStart,
  atEnd,
  overflow,
  paused,
  togglePause,
  showPauseToggle,
  labels,
}) {
  if (!overflow) return null
  return (
    <div className="pl-hs-controls" role="group" aria-label={labels.prev + ' / ' + labels.next}>
      {showPauseToggle && (
        <button
          type="button"
          aria-label={paused ? labels.play : labels.pause}
          onClick={togglePause}
          className="pl-hs-ctrl-btn"
        >
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>
      )}
      <button
        type="button"
        aria-label={labels.prev}
        onClick={scrollPrev}
        disabled={atStart}
        className="pl-hs-ctrl-btn"
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={labels.next}
        onClick={scrollNext}
        disabled={atEnd}
        className="pl-hs-ctrl-btn"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  )
}
