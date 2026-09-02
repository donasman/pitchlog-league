/**
 * 팀 로고 자리표시자
 * 실제 로고 이미지가 없을 때 이니셜 기반 배지를 렌더링.
 * 로고 URL이 제공되면 이미지를 우선 시도하고, 로딩 실패 시 이니셜로 폴백.
 *
 * @param {{ initials:string, color:string, size?:'xs'|'sm'|'md'|'lg', name?:string, logoUrl?:string }} props
 */

import { useState } from 'react'

const SIZE_MAP = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
}

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
  const sizeClass = SIZE_MAP[size] ?? SIZE_MAP.md
  const textColor = getTextColor(color ?? '#2d4060')
  const displayInitials = (initials ?? '?').slice(0, 3)

  if (logoUrl && !imgFailed) {
    return (
      <img
        src={logoUrl}
        alt={name ?? initials}
        width={48}
        height={48}
        loading="lazy"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-lg object-contain flex-shrink-0`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-lg flex items-center justify-center flex-shrink-0 font-bold leading-none`}
      style={{ backgroundColor: color ?? '#2d4060', color: textColor }}
      role="img"
      aria-label={name ?? initials}
      title={name ?? initials}
    >
      {displayInitials}
    </div>
  )
}
