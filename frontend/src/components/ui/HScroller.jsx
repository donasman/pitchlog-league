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
 * step ('page' | 'card', default 'page'):
 *   - 'page' — 한 번에 clientWidth * 90% 이동 (기본, 기존 동작 그대로)
 *   - 'card' — 첫 카드 폭 + gap 만큼 이동. rows>1 조합은 이번 판 범위 밖이라
 *     rows>1 이면 page 계산으로 폴백한다.
 *
 * @param {{
 *   rows?: number,
 *   gap?: number,
 *   ariaLabel: string,
 *   autoPlay?: boolean,
 *   intervalMs?: number,
 *   startDelayMs?: number,
 *   step?: 'page'|'card',
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
 * step 별 이동량 계산 (순수).
 *   page: clientWidth * 0.9
 *   card: stridePx (실측된 자식 배치 간격 · children[1].offsetLeft-children[0].offsetLeft) 우선.
 *         stridePx 가 없으면 cardWidth + gap 폴백. 둘 다 없으면 page 폴백.
 *
 * stridePx 우선 이유: 그리드 track 폭이 CSS 로 강제된 상황에서 offsetWidth+gap 을 쓰면
 * 실제 stride(칸 폭+gap) 와 어긋나 카드가 겹치거나 스냅이 어긋난다 (운영 실측 · 1843px zoom 1.25).
 */
export function computeStepDelta({ step, clientWidth, cardWidth = 0, gap = 0, stridePx }) {
  if (step === 'card') {
    if (Number.isFinite(stridePx) && stridePx > 0) return stridePx
    if (Number.isFinite(cardWidth) && cardWidth > 0) return cardWidth + (Number.isFinite(gap) && gap > 0 ? gap : 0)
  }
  return clientWidth * 0.9
}

/**
 * 다음 자동 스크롤 대상 계산 (순수).
 * 끝에 도달했으면 처음으로 복귀, 아니면 step 규칙에 따라 우측 이동.
 */
export function computeAutoScrollTarget({ scrollLeft, clientWidth, scrollWidth, step = 'page', cardWidth = 0, gap = 0 }) {
  const atEnd = scrollLeft + clientWidth >= scrollWidth - 1
  if (atEnd) return { type: 'wrap', delta: scrollLeft === 0 ? 0 : -scrollLeft }
  const delta = computeStepDelta({ step, clientWidth, cardWidth, gap })
  return { type: 'step', delta }
}

/**
 * step='card' 자동재생용 **스냅 위치 기준 절대 좌표** 계산 (순수).
 *
 * scrollBy 로 delta 를 누적하면 smooth 애니메이션 중간 scrollLeft 에 더해져 스냅 격자에서 벗어난다.
 * 현재 스냅 위치(round(scrollLeft / stepDelta))에서 다음 카드로 정확히 옮기려면 절대 좌표가 안전.
 * 끝에 도달했으면 { atEnd:true, left:0 } — 소비자가 wrap 애니메이션을 실행.
 */
export function computeCardStepTarget({ scrollLeft, clientWidth, scrollWidth, cardWidth = 0, gap = 0, stridePx }) {
  const atEnd = scrollLeft + clientWidth >= scrollWidth - 1
  if (atEnd) return { atEnd: true, left: 0 }
  // stridePx 우선 · 없으면 cardWidth+gap 폴백 · 둘 다 없으면 현재 위치 유지
  const stepPx = Number.isFinite(stridePx) && stridePx > 0
    ? stridePx
    : (Number.isFinite(cardWidth) && cardWidth > 0 ? cardWidth + (Number.isFinite(gap) ? gap : 0) : 0)
  if (stepPx <= 0) return { atEnd: false, left: scrollLeft }
  const currentSnap = Math.round(scrollLeft / stepPx) * stepPx
  const maxLeft = Math.max(0, scrollWidth - clientWidth)
  const nextLeft = Math.min(currentSnap + stepPx, maxLeft)
  return { atEnd: false, left: nextLeft }
}

/**
 * 트랙 자식들의 실제 배치 간격을 측정 (순수 · 소비 전 DOM 조회는 소비자 몫).
 * 자식 2개 이상: children[1].offsetLeft - children[0].offsetLeft (grid track 폭 + gap 반영).
 * 자식 1개: offsetWidth + gap (근사).
 * 자식 0개: 0.
 * @param {HTMLElement} el
 * @param {number} gap
 */
export function measureCardStride(el, gap) {
  if (!el) return 0
  const c = el.children
  if (c.length >= 2) return c[1].offsetLeft - c[0].offsetLeft
  if (c.length === 1) return c[0].offsetWidth + (Number.isFinite(gap) ? gap : 0)
  return 0
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/**
 * 트랙의 실제 column-gap 을 픽셀로 잰다 (R4 · CSS var 오버라이드 대응).
 * getComputedStyle 이 없으면 0.
 */
function measureGapPx(el) {
  if (!el || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return 0
  const v = parseFloat(window.getComputedStyle(el).columnGap)
  return Number.isFinite(v) ? v : 0
}

export default function HScroller({
  rows = 1,
  gap = 12,
  ariaLabel,
  autoPlay = false,
  intervalMs = 5000,
  startDelayMs = 0,
  step = 'page',
  /* step='card' 일 때 그리드 track 폭 (px). CSS 가 `grid-auto-columns: var(--pl-hs-card-w, 260px)` 로 소비.
     이 폭이 track visible=5 기준 자동 계산치보다 크면 카드가 서로 겹치지 않는다. */
  cardWidth,
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
    // deps 에 children 을 넣지 않는다 — 스코어만 바뀐 재렌더에서 scrollLeft·타이머 유지
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

  // rows>1 조합은 이번 판 범위 밖 — step='card' 라도 page 계산으로 폴백한다.
  const effectiveStep = step === 'card' && rows === 1 ? 'card' : 'page'

  const scrollByDir = useCallback((dir) => {
    const el = trackRef.current
    if (!el) return
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
    const measured = measureGapPx(el)
    // step='card' 이면 실측 stride 우선 (grid track 폭 + gap 반영)
    const stridePx = effectiveStep === 'card' ? measureCardStride(el, measured > 0 ? measured : gap) : 0
    const measuredCardWidth = effectiveStep === 'card' ? (el.firstElementChild?.offsetWidth ?? 0) : 0
    const stepDelta = computeStepDelta({
      step: effectiveStep,
      clientWidth: el.clientWidth,
      cardWidth: measuredCardWidth,
      gap: measured > 0 ? measured : gap,
      stridePx,
    })
    el.scrollBy({ left: dir * stepDelta, behavior })
  }, [effectiveStep, gap])

  const autoTick = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth'

    if (effectiveStep === 'card') {
      const measured = measureGapPx(el)
      const stridePx = measureCardStride(el, measured > 0 ? measured : gap)
      const measuredCardWidth = el.firstElementChild?.offsetWidth ?? 0
      const t = computeCardStepTarget({
        scrollLeft: el.scrollLeft,
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        cardWidth: measuredCardWidth,
        gap: measured > 0 ? measured : gap,
        stridePx,
      })
      // 절대 좌표로 이동 — scrollBy 로 delta 를 진행 중 애니메이션에 더하지 않는다.
      el.scrollTo({ left: t.left, behavior })
      return
    }

    const measured = measureGapPx(el)
    const target = computeAutoScrollTarget({
      scrollLeft: el.scrollLeft,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      step: effectiveStep,
      cardWidth: 0,
      gap: measured > 0 ? measured : gap,
    })
    el.scrollBy({ left: target.delta, behavior })
  }, [effectiveStep, gap])

  /* 자동 슬라이드 타이머 — 첫 tick 은 startDelayMs + intervalMs 후. 마운트 초 상태 변동(overflow·visible·documentVisible)
     이 반복해 effect 를 재실행해도 setTimeout 이 매번 리셋되므로 "즉시 tick" 이 여러 번 발화하지 않는다.
     이전 판(setTimeout(startDelayMs)+즉시 tick)이 초당 여러 번 발화해 scrollLeft 가 폭주하던 회귀를 잠근다. */
  useEffect(() => {
    const run = shouldAutoTick({
      autoPlay, overflow, reducedMotion,
      pausedByUser, pausedByInteraction,
      visible, documentVisible,
    })
    if (!run) return
    let intervalId = 0
    const firstDelay = Math.max(0, startDelayMs) + Math.max(1000, intervalMs)
    const startId = setTimeout(() => {
      autoTick()
      intervalId = setInterval(autoTick, Math.max(1000, intervalMs))
    }, firstDelay)
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
  if (step === 'card' && Number.isFinite(cardWidth) && cardWidth > 0) {
    trackStyle['--pl-hs-card-w'] = `${cardWidth}px`
  }

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
        data-step={effectiveStep}
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
