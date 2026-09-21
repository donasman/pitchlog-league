/**
 * ScheduleSections — 대회 페이지 일정 탭 본문.
 *
 * 세 섹션 (`진행 중` · `예정` · `결과`) 을 순서대로 그린다. 빈 섹션은 헤더째 생략.
 * `groupByRound=true` (컵) 이면 각 섹션 안에서 라운드별 그룹 (1개면 헤더 생략).
 * 리그·UCL 은 `groupByRound=false` — 한 그리드로 나열.
 *
 * `splitSchedule` 결과가 A 판(라운드 네비게이션) 에서도 그대로 재사용되도록
 * 페이지에 인라인으로 두지 않고 컴포넌트로 뽑았다.
 */

import { useTranslation } from 'react-i18next'
import MatchCard from '@/components/ui/MatchCard'
import { splitSchedule, groupCupMatchesByRound } from '@/utils/schedule'

const GRID_STYLE = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }

function MatchGrid({ list }) {
  return (
    <div style={GRID_STYLE}>
      {list.map(m => <MatchCard key={m.id} match={m} />)}
    </div>
  )
}

function Section({ title, list, groupByRound }) {
  if (list.length === 0) return null

  if (groupByRound) {
    const groups = groupCupMatchesByRound(list)
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <h2 className="t-card" style={{ margin: 0 }}>{title}</h2>
        {groups.length <= 1
          ? <MatchGrid list={list} />
          : groups.map(([roundName, roundMatches]) => (
              <div key={roundName || '__blank'} style={{ display: 'grid', gap: 8 }}>
                {roundName && <h3 className="t-card" style={{ margin: '4px 0 0' }}>{roundName}</h3>}
                <MatchGrid list={roundMatches} />
              </div>
            ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <h2 className="t-card" style={{ margin: 0 }}>{title}</h2>
      <MatchGrid list={list} />
    </div>
  )
}

export default function ScheduleSections({ matches, nowMs, groupByRound = false }) {
  const { t } = useTranslation()
  const { live, upcoming, results } = splitSchedule(matches, nowMs)
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Section title={t('competition.schedule.live')}     list={live}     groupByRound={groupByRound} />
      <Section title={t('competition.schedule.upcoming')} list={upcoming} groupByRound={groupByRound} />
      <Section title={t('competition.schedule.results')}  list={results}  groupByRound={groupByRound} />
    </div>
  )
}
