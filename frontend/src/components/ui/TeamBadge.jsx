/**
 * 팀 엠블럼 / 로고
 * 실제 로고 이미지가 없을 때 이니셜 기반 배지를 렌더링.
 * logoUrl이 제공되면 이미지를 우선 시도하고, 로딩 실패 시 이니셜로 폴백.
 *
 * @param {{ initials:string, color:string, size?:'xs'|'sm'|'md'|'lg', name?:string, logoUrl?:string }} props
 */

import { useState } from 'react'

const SIZE_PX = { xs: 28, sm: 36, md: 44, lg: 56 }
const FONT_PX = { xs: 10, sm: 12, md: 14, lg: 16 }

/** WCAG 2.1 상대 휘도 → 흰(#fff) vs 짙은 검정(#111827) 중 대비가 큰 쪽 선택 */
function getTextColor(hex) {
  const toLinear = c => {
    const n = parseInt(hex.slice(c, c + 2), 16) / 255
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
  }
  const L = 0.2126 * toLinear(1) + 0.7152 * toLinear(3) + 0.0722 * toLinear(5)
  // 상대 휘도: 흰(1.0) vs #111827(0.0154)
  const onWhite = 1.05 / (L + 0.05)
  const onDark  = (L + 0.05) / 0.0654
  return onWhite >= onDark ? '#ffffff' : '#111827'
}

export default function TeamBadge({ initials, color, size = 'md', name, logoUrl }) {
  const [imgFailed, setImgFailed] = useState(false)
  const px = SIZE_PX[size] ?? SIZE_PX.md
  const fs = FONT_PX[size] ?? FONT_PX.md
  const displayInitials = (initials ?? '?').slice(0, 3)

  if (logoUrl && !imgFailed) {
    return (
      <img
        src={logoUrl}
        alt={name ?? initials}
        width={px}
        height={px}
        loading="lazy"
        onError={() => setImgFailed(true)}
        className="pl-emblem"
        style={{ width: px, height: px }}
      />
    )
  }

  const textColor = getTextColor(color ?? '#2d4060')

  return (
    <span
      className="pl-emblem"
      style={{
        width: px,
        height: px,
        fontSize: fs,
        backgroundColor: color ?? '#2d4060',
        color: textColor,
      }}
      role="img"
      aria-label={name ?? initials}
      title={name ?? initials}
    >
      {displayInitials}
    </span>
  )
}
