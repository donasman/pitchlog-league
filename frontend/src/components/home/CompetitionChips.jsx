/**
 * 대회 다중 선택 필터 칩
 * URL ?competitions=premier-league,la-liga 에 선택 상태를 보존.
 * "전체 대회" 칩 선택 시 나머지 해제.
 *
 * @param {{ competitions:Array<Object>, label?:string }} props
 */

import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLocalizedCompetitionShortName } from '@/utils/localization'

const ALL_VALUE = 'all'

export default function CompetitionChips({ competitions = [] }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const [searchParams, setSearchParams] = useSearchParams()

  /** 현재 선택된 slug 목록 */
  const raw = searchParams.get('competitions') ?? ALL_VALUE
  const selected = raw === ALL_VALUE ? [ALL_VALUE] : raw.split(',').filter(Boolean)
  const isAll = selected.includes(ALL_VALUE)

  function toggle(slug) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (slug === ALL_VALUE) {
        next.set('competitions', ALL_VALUE)
        return next
      }
      const cur = (prev.get('competitions') ?? ALL_VALUE)
        .split(',').filter(s => s && s !== ALL_VALUE)
      const idx = cur.indexOf(slug)
      const updated = idx >= 0 ? cur.filter(s => s !== slug) : [...cur, slug]
      next.set('competitions', updated.length ? updated.join(',') : ALL_VALUE)
      return next
    })
  }

  const totalLabel = t('competition.allCompetitionsChip', { count: competitions.length })

  const chipBase = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap'
  const chipSelected = 'bg-primary/10 text-primary border-primary/30 font-bold'
  const chipUnselected = 'bg-transparent text-muted-foreground border-border hover:border-ring hover:text-foreground'

  return (
    <nav
      className="flex items-center gap-2 overflow-x-auto pb-0.5 -mx-4 px-4 lg:mx-0 lg:px-0"
      aria-label={t('header.competitionSelect')}
    >
      <button
        onClick={() => toggle(ALL_VALUE)}
        aria-pressed={isAll}
        className={`${chipBase} ${isAll ? chipSelected : chipUnselected}`}
      >
        {totalLabel}
      </button>
      {competitions.map(comp => {
        const isActive = !isAll && selected.includes(comp.slug)
        return (
          <button
            key={comp.slug}
            onClick={() => toggle(comp.slug)}
            aria-pressed={isActive}
            className={`${chipBase} ${isActive ? chipSelected : chipUnselected}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: COMP_COLOR[comp.slug] ?? '#64748b' }}
              aria-hidden="true"
            />
            {getLocalizedCompetitionShortName(comp, locale) || comp.shortName}
            {comp.currentStageLabel && (
              <span className="text-muted-foreground font-normal">· {comp.currentStageLabel}</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

/** 대회별 포인트 컬러 (칩 도트용) */
const COMP_COLOR = {
  'premier-league':  '#22c55e',
  'la-liga':         '#f59e0b',
  'bundesliga':      '#a855f7',
  'serie-a':         '#14b8a6',
  'ligue-1':         '#3b82f6',
  'champions-league':'#1e3a8a',
}
