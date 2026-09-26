/**
 * PitchLog 브랜드 마크 — 헤더·기타 자리표시에 쓰는 정사각 로고.
 * size ≥ 24: pitchlog-mark.svg 모양 (얇은 선 + 중앙 점)
 * size < 24: favicon.svg 모양 (굵은 선, 중앙 점 없음)
 * 배경은 var(--pl-primary) — 다크 모드에서 자동으로 라이트한 파랑으로 바뀐다.
 * 옆에 텍스트가 함께 오는 자리에서 쓴다 → aria-hidden.
 */

export default function BrandMark({ size = 28, className }) {
  const isSmall = size < 24

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {isSmall ? (
        <>
          <rect x="2" y="2" width="60" height="60" rx="14" fill="var(--pl-primary)" />
          <g fill="none" stroke="#FFFFFF" strokeWidth="5">
            <rect x="11" y="13" width="42" height="38" rx="4" />
            <line x1="32" y1="13" x2="32" y2="51" />
            <circle cx="32" cy="32" r="8.5" />
          </g>
        </>
      ) : (
        <>
          <rect x="2" y="2" width="60" height="60" rx="15" fill="var(--pl-primary)" />
          <g fill="none" stroke="#FFFFFF" strokeWidth="3.2">
            <rect x="12" y="14" width="40" height="36" rx="3" />
            <line x1="32" y1="14" x2="32" y2="50" />
            <circle cx="32" cy="32" r="7.5" />
          </g>
          <circle cx="32" cy="32" r="2" fill="#FFFFFF" />
        </>
      )}
    </svg>
  )
}
