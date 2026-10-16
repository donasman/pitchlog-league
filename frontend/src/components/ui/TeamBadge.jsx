/**
 * 팀 엠블럼 / 로고
 *
 * 배경·이니셜 표시 규칙 (2026-09-24 · 투명화):
 *   - loading: 배경 transparent, 이니셜은 visibility:hidden 로 자리만 잡는다 (레이아웃 흔들림 없음).
 *   - loaded : 배경 transparent, 이미지가 opacity 페이드로 채워진다 (150ms · reduced-motion 시 없음).
 *   - failed : 팀 색(color ?? 기본색) 배경 + 이니셜 표시 (onError · 6초 타임아웃 시).
 *   - logoUrl 없음: 상태와 무관하게 failed 시각 (팀 색 + 이니셜).
 *
 * 회색 빈칸 방지 규칙:
 *   1) 이니셜을 항상 밑에 깔고, <img> 는 absolute 로 덮어씌운다.
 *   2) 상태 3종은 순수함수 `nextBadgeState` 로 전이한다.
 *   3) 캐시 히트로 onLoad 가 안 오는 경우: 마운트 직후 img.complete && naturalWidth > 0 이면 즉시 loaded.
 *   4) 6초 안전장치: loading 이 지속되면 failed 로 강제 전이.
 *
 * `loading` 기본값은 'lazy'. 첫 화면 위(above-the-fold) 배지 · 가로 슬라이드 안 배지는
 * 호출부에서 'eager' 로 넘긴다 (TeamsPage · MyTeamCard).
 *
 * `sizePx` 는 `size` 프리셋 밖의 픽셀 값이 필요할 때 오버라이드 (홈 shortcut 20/24px 등).
 * 지정하면 `size` 는 무시되고, 폰트는 sizePx * 0.4 로 비례 축소된다.
 *
 * @param {{ initials:string, color:string, size?:'xs'|'sm'|'md'|'lg',
 *           sizePx?:number, name?:string, logoUrl?:string, loading?:'lazy'|'eager' }} props
 */

import { useEffect, useReducer, useRef } from 'react'

const SIZE_PX = { xs: 28, sm: 36, md: 44, lg: 56 }
const FONT_PX = { xs: 10, sm: 12, md: 14, lg: 16 }
export const BADGE_LOAD_TIMEOUT_MS = 6000

/**
 * 상태 전이 — 순수 함수.
 *   'loading' + load    → 'loaded'
 *   'loading' + error   → 'failed'
 *   'loading' + timeout → 'failed'
 *   'loaded' | 'failed' 상태에서 들어오는 이벤트는 그대로 유지 (실패는 래치).
 */
export function nextBadgeState(state, action) {
  if (action === 'load')    return state === 'loading' ? 'loaded' : state
  if (action === 'error')   return 'failed'
  if (action === 'timeout') return state === 'loading' ? 'failed' : state
  return state
}

/**
 * 시각 결정 — 순수 함수. showInitials / background 를 상태·logoUrl·팀색 조합으로 계산한다.
 * failed 이거나 로고가 아예 없으면 이니셜 + 팀색, 그 외(loading·loaded) 는 이니셜 숨김 + 투명 배경.
 */
export function badgeVisual(state, hasLogo, teamColor) {
  const isFailed = !hasLogo || state === 'failed'
  return {
    showInitials: isFailed,
    background: isFailed ? teamColor : 'transparent',
  }
}

/** WCAG 2.1 상대 휘도 → 흰(#fff) vs 짙은 검정(#111827) 중 대비가 큰 쪽 선택 */
function getTextColor(hex) {
  const toLinear = c => {
    const n = parseInt(hex.slice(c, c + 2), 16) / 255
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
  }
  const L = 0.2126 * toLinear(1) + 0.7152 * toLinear(3) + 0.0722 * toLinear(5)
  const onWhite = 1.05 / (L + 0.05)
  const onDark  = (L + 0.05) / 0.0654
  return onWhite >= onDark ? '#ffffff' : '#111827'
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

export default function TeamBadge({ initials, color, size = 'md', sizePx, name, logoUrl, loading = 'lazy' }) {
  const [state, dispatch] = useReducer(nextBadgeState, 'loading')
  const imgRef = useRef(null)

  const px = sizePx ?? SIZE_PX[size] ?? SIZE_PX.md
  const fs = sizePx ? Math.max(8, Math.round(sizePx * 0.4)) : (FONT_PX[size] ?? FONT_PX.md)
  const displayInitials = (initials ?? '?').slice(0, 3)
  const teamColor = color ?? '#2d4060'
  const textColor = getTextColor(teamColor)

  useEffect(() => {
    if (!logoUrl) return
    const el = imgRef.current
    if (el && el.complete && el.naturalWidth > 0) dispatch('load')
  }, [logoUrl])

  useEffect(() => {
    if (!logoUrl) return
    if (state !== 'loading') return
    const id = setTimeout(() => dispatch('timeout'), BADGE_LOAD_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [logoUrl, state])

  const { showInitials, background } = badgeVisual(state, !!logoUrl, teamColor)
  const showImg = !!logoUrl && state !== 'failed'
  const reduced = prefersReducedMotion()

  return (
    <span
      className="pl-emblem"
      style={{
        position: 'relative',
        width: px,
        height: px,
        fontSize: fs,
        backgroundColor: background,
        color: textColor,
      }}
      role="img"
      aria-label={name ?? initials}
      title={name ?? initials}
    >
      {/* 이니셜 — failed 에서만 표시. loading·loaded 는 visibility:hidden 으로 자리만 유지 */}
      <span
        aria-hidden={showInitials ? undefined : 'true'}
        style={{ visibility: showInitials ? 'visible' : 'hidden' }}
      >
        {displayInitials}
      </span>
      {/* 이미지 — 로드되면 opacity 페이드로 채움, 실패 시 제거 */}
      {showImg && (
        <img
          ref={imgRef}
          src={logoUrl}
          alt=""
          width={px}
          height={px}
          loading={loading}
          decoding="async"
          onLoad={() => dispatch('load')}
          onError={() => dispatch('error')}
          style={{
            position: 'absolute',
            inset: 0,
            width: px,
            height: px,
            objectFit: 'contain',
            background: 'transparent',
            opacity: state === 'loaded' ? 1 : 0,
            transition: reduced ? 'none' : 'opacity 150ms',
            pointerEvents: 'none',
          }}
        />
      )}
    </span>
  )
}
