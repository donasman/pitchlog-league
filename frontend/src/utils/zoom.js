/**
 * 화면 비율 (zoom) 컨트롤러.
 *
 * 목적: 1440px 이상에서 갑작스러운 25% 점프(기존 CSS 미디어쿼리) 대신
 * 1280→1600 사이를 선형으로 부드럽게 확대한다.
 *   - 1280 미만: z=1 (모바일·태블릿 영향 없음)
 *   - 1280~1600: z=1 + 0.25 × (w − 1280) / 320 (소수 둘째 자리 반올림)
 *   - 1600 이상: z=1.25 (기존과 동일 상한)
 *
 * document.documentElement.style.zoom 을 설정하고 CSS 변수 --pl-zoom 도 같이 갱신한다.
 * index.css 의 --pl-page-min-h 는 calc(100dvh / var(--pl-zoom, 1)) 로 이 값을 소비한다.
 *
 * 첫 페인트 깜빡임 방지는 index.html <head> 의 인라인 script 가 담당한다 —
 * 이 모듈은 그 위에 리사이즈 반응까지 얹는다 (rAF throttle · 값이 바뀔 때만 적용).
 */

/**
 * @param {number} width  window.innerWidth (물리 픽셀 기준으로 브라우저가 보고하는 CSS 폭)
 * @returns {number} 1 ~ 1.25 사이의 zoom 배율 (소수 둘째 자리)
 */
export function computeZoom(width) {
  if (!Number.isFinite(width) || width < 1280) return 1
  if (width >= 1600) return 1.25
  const t = (width - 1280) / (1600 - 1280)
  const raw = 1 + 0.25 * t
  return Math.round(raw * 100) / 100
}

let lastZoom = null

function applyZoom(z) {
  if (typeof document === 'undefined') return
  if (z === lastZoom) return
  lastZoom = z
  document.documentElement.style.zoom = z
  document.documentElement.style.setProperty('--pl-zoom', String(z))
}

/**
 * 첫 페인트 직후 1회 호출. 인라인 script 가 이미 적용했더라도 값이 같으면 no-op.
 */
export function applyInitialZoom() {
  if (typeof window === 'undefined') return
  applyZoom(computeZoom(window.innerWidth))
}

/**
 * resize 리스너를 붙이고 rAF 로 throttle 한다. 값이 바뀔 때만 style 을 건드린다.
 * @returns {() => void} teardown
 */
export function startZoomController() {
  if (typeof window === 'undefined') return () => {}
  applyInitialZoom()
  let raf = 0
  function onResize() {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      applyZoom(computeZoom(window.innerWidth))
    })
  }
  window.addEventListener('resize', onResize, { passive: true })
  return () => {
    window.removeEventListener('resize', onResize)
    if (raf) cancelAnimationFrame(raf)
  }
}
