/**
 * 최근 경기 폼 배지 (W/D/L)
 * 단독 렌더링용. 여러 개를 나열할 때는 .pl-form wrapper 안에 배치한다.
 *
 * @param {{ result:'W'|'D'|'L' }} props
 */

import { useTranslation } from 'react-i18next'

const CLS = { W: 'f-w', D: 'f-d', L: 'f-l' }
const LABEL_KEY = {
  W: 'standings.won',
  D: 'standings.drawn',
  L: 'standings.lost',
}

export default function FormBadge({ result }) {
  const { t } = useTranslation()
  const cls   = CLS[result] ?? 'f-d'
  const label = t(LABEL_KEY[result] ?? LABEL_KEY.D)

  return (
    <i
      className={`pl-form-badge ${cls}`}
      aria-label={label}
      title={label}
    >
      {result}
    </i>
  )
}
