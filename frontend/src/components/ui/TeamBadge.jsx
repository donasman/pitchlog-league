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

/** 배경색 밝기에 따라 텍스트 색상 결정 */
function getTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#111827' : '#ffffff'
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
