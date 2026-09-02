/**
 * 최근 경기 폼 배지 (W/D/L)
 * @param {{ result:'W'|'D'|'L', size?:'sm'|'md' }} props
 */

import { useTranslation } from 'react-i18next'

const STYLE = {
  W: { bg: 'bg-green-700', text: 'text-green-100', labelKey: 'standings.won' },
  D: { bg: 'bg-yellow-700', text: 'text-yellow-100', labelKey: 'standings.drawn' },
  L: { bg: 'bg-red-800', text: 'text-red-100', labelKey: 'standings.lost' },
}

export default function FormBadge({ result, size = 'sm' }) {
  const { t } = useTranslation()
  const { bg, text, labelKey } = STYLE[result] ?? STYLE.D
  const label = t(labelKey)
  const sizeClass = size === 'md' ? 'w-6 h-6 text-xs' : 'w-5 h-5 text-[10px]'

  return (
    <span
      className={`${bg} ${text} ${sizeClass} inline-flex items-center justify-center rounded font-bold`}
      aria-label={label}
      title={label}
    >
      {result}
    </span>
  )
}
