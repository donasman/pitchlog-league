/**
 * 선수 아바타 자리표시자
 * 포지션 색상 기반 이니셜 배지. 실제 선수 사진 URL이 없을 때 사용.
 *
 * @param {{ name:string, position:'GK'|'DEF'|'MID'|'FWD', size?:'sm'|'md'|'lg' }} props
 */

import { useTranslation } from 'react-i18next'
import { parsePositionLabel } from '@/utils/positionLabel'

const POSITION_COLOR = { GK: '#f59e0b', DEF: '#3b82f6', MID: '#22c55e', FWD: '#ef4444', ATT: '#ef4444' }
const SIZE_MAP = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-16 h-16 text-base' }
const BADGE_SIZE = { sm: 'text-[7px] px-0.5', md: 'text-[9px] px-1', lg: 'text-xs px-1' }

/**
 * 원문 · 코드 두 표기 모두 처리:
 *   'GK'/'FWD' → common.position.gk 등 (배지에 3~4자 · 색상 매핑용).
 *   'Attacker' 등 → common.position.attacker (배지엔 앞 3자 대문자 · 색상은 근사 매핑).
 */
const LONG_TO_CODE = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', attacker: 'FWD', forward: 'FWD', striker: 'FWD' }
function positionCode(raw) {
  if (!raw) return null
  const upper = String(raw).toUpperCase()
  if (POSITION_COLOR[upper]) return upper
  return LONG_TO_CODE[String(raw).toLowerCase()] ?? null
}

export default function PlayerAvatar({ name, position, size = 'md' }) {
  const { t } = useTranslation()
  const initials = (name ?? '?')
    .split(' ')
    .map(n => n[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const code = positionCode(position)
  const color = POSITION_COLOR[code] ?? '#64748b'
  const parsed = parsePositionLabel(position)
  /* 짧은 배지: 언제나 코드형(t('common.position.gk') 등 · 로케일 관계없이 대문자 3자) */
  const shortKey = code ? `common.position.${code.toLowerCase()}` : ''
  const badgeText = shortKey ? t(shortKey) : (position ?? '')
  /* aria-label 은 긴 이름 (parsed.key 가 있으면 그것 · 없으면 원문) */
  const posText = parsed.matched ? t(parsed.key) : (position ?? '')

  return (
    <div className="relative inline-flex flex-shrink-0">
      <div
        className={`${SIZE_MAP[size] ?? SIZE_MAP.md} rounded-full flex items-center justify-center font-bold text-white`}
        style={{ backgroundColor: `${color}33`, border: `2px solid ${color}` }}
        role="img"
        aria-label={`${name ?? '?'} (${posText})`}
      >
        {initials}
      </div>
      <span
        className={`absolute -bottom-1 -right-1 ${BADGE_SIZE[size] ?? BADGE_SIZE.md} rounded font-bold text-white`}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      >
        {badgeText}
      </span>
    </div>
  )
}
