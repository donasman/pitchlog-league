/**
 * 선수 아바타 자리표시자
 * 포지션 색상 기반 이니셜 배지. 실제 선수 사진 URL이 없을 때 사용.
 *
 * @param {{ name:string, position:'GK'|'DEF'|'MID'|'FWD', size?:'sm'|'md'|'lg' }} props
 */

const POSITION_COLOR = { GK: '#f59e0b', DEF: '#3b82f6', MID: '#22c55e', FWD: '#ef4444' }
const POSITION_LABEL = { GK: 'GK', DEF: 'DEF', MID: 'MID', FWD: 'FWD' }
const SIZE_MAP = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-16 h-16 text-base' }
const BADGE_SIZE = { sm: 'text-[7px] px-0.5', md: 'text-[9px] px-1', lg: 'text-xs px-1' }

export default function PlayerAvatar({ name, position, size = 'md' }) {
  const initials = (name ?? '?')
    .split(' ')
    .map(n => n[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const color = POSITION_COLOR[position] ?? '#64748b'

  return (
    <div className="relative inline-flex flex-shrink-0">
      <div
        className={`${SIZE_MAP[size] ?? SIZE_MAP.md} rounded-full flex items-center justify-center font-bold text-white`}
        style={{ backgroundColor: `${color}33`, border: `2px solid ${color}` }}
        role="img"
        aria-label={`${name ?? '?'} (${POSITION_LABEL[position] ?? position})`}
      >
        {initials}
      </div>
      <span
        className={`absolute -bottom-1 -right-1 ${BADGE_SIZE[size] ?? BADGE_SIZE.md} rounded font-bold text-white`}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      >
        {POSITION_LABEL[position] ?? position}
      </span>
    </div>
  )
}
