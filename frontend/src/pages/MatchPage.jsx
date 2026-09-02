/**
 * 경기 상세 (/matches/:fixtureId)
 * 스코어, 상태, 이벤트 타임라인, 라인업, H2H, 예측
 * UCL 경기는 1·2차전 leg 및 합산 점수 표시
 * 데이터: services/api.js → fetchMatch
 */

import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, Zap, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MatchStatusBadge from '@/components/ui/MatchStatusBadge'
import TeamBadge from '@/components/ui/TeamBadge'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { useData } from '@/hooks/useData'
import { fetchMatch } from '@/services/api'

const EVENT_ICON = {
  goal: '⚽',
  yellow_card: '🟨',
  red_card: '🟥',
  substitution: '🔄',
  var: '📺',
}

function EventTimeline({ events = [] }) {
  const { t } = useTranslation()
  if (!events.length) return <p className="text-sm text-muted-foreground py-4 text-center">{t('match.noEvents')}</p>
  return (
    <div className="space-y-2">
      {events.map((e, i) => (
        <div key={i} className={`flex items-center gap-3 text-sm ${e.team === 'home' ? 'flex-row' : 'flex-row-reverse'}`}>
          <span className="text-xs text-muted-foreground w-8 text-center flex-shrink-0">{e.minute}&apos;</span>
          <span className="text-base flex-shrink-0">{EVENT_ICON[e.type] ?? '•'}</span>
          <div className={`flex-1 min-w-0 ${e.team === 'away' ? 'text-right' : ''}`}>
            <span className="font-medium text-foreground">{e.playerName}</span>
            {e.assistName && <span className="text-muted-foreground ml-1 text-xs">(A: {e.assistName})</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function LineupList({ lineup, teamName }) {
  const { t } = useTranslation()
  if (!lineup) return <p className="text-sm text-muted-foreground">{t('match.lineupTbd')}</p>
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase">{teamName}</span>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{lineup.formation}</span>
      </div>
      <div className="space-y-1">
        {lineup.startingXI.map(p => (
          <div key={p.number} className="flex items-center gap-2 text-xs py-1">
            <span className="w-5 text-right text-muted-foreground flex-shrink-0">{p.number}</span>
            <span className={`px-1.5 py-0.5 rounded text-white text-[10px] font-medium flex-shrink-0 ${
              { GK:'bg-amber-700', DEF:'bg-blue-800', MID:'bg-green-800', FWD:'bg-red-800' }[p.position] ?? 'bg-muted'
            }`}>{p.position}</span>
            <span className="text-foreground">{p.name}</span>
            {p.isCaptain && <span className="text-xs text-yellow-500">{t('common.captain')}</span>}
          </div>
        ))}
      </div>
      {lineup.substitutes?.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground mt-3 mb-2 font-medium">{t('match.substitutes')}</p>
          <div className="space-y-1">
            {lineup.substitutes.map(p => (
              <div key={p.number} className="flex items-center gap-2 text-xs py-1 opacity-60">
                <span className="w-5 text-right text-muted-foreground">{p.number}</span>
                <span className="text-muted-foreground">{p.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// 탭 상태: 영문 id (언어 전환 시 탭이 풀리지 않음)
const TABS = [
  { id: 'overview', labelKey: 'match.tabs.overview' },
  { id: 'lineup',   labelKey: 'match.tabs.lineup' },
  { id: 'h2h',      labelKey: 'match.tabs.h2h' },
]

export default function MatchPage() {
  const { fixtureId } = useParams()
  const [tab, setTab] = useState('overview')
  const { t } = useTranslation()

  const { data: match, loading, error } = useData(() => fetchMatch(fixtureId), [fixtureId])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <LoadingSkeleton rows={8} variant="text" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <ErrorState title={t('common.errorTitle')} description={error} />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState />
      </div>
    )
  }

  const isLive     = match.displayState === 'live' || match.displayState === 'halftime'
  const isFinished = ['final','recheck','confirmed'].includes(match.displayState)
  const hasScore   = match.score?.home !== null && match.score?.away !== null

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-5">
      {/* 뒤로 */}
      <Link
        to={`/competitions/${match.competitionSlug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
      >
        <ArrowLeft size={16} />
        {match.competitionName}
      </Link>

      {/* 스코어 카드 */}
      <div className={`bg-card border rounded-xl p-6 ${isLive ? 'border-destructive' : 'border-border'}`}>
        <div className="flex items-center justify-between mb-4 text-xs">
          <span className="text-muted-foreground">{match.round ?? match.stage}</span>
          <div className="flex items-center gap-2">
            <MatchStatusBadge state={match.displayState} showDescription />
          </div>
          <span className="text-muted-foreground text-right truncate max-w-[150px]">{match.venue}</span>
        </div>

        {match.leg && (
          <div className="text-center text-xs text-blue-500 dark:text-blue-400 mb-2">
            {match.leg === 1 ? t('match.leg1') : t('match.leg2')}
          </div>
        )}

        <div className="flex items-center gap-4 justify-center">
          <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
            <TeamBadge initials={match.homeTeam.initials} color={match.homeTeam.color} size="lg" name={match.homeTeam.name} />
            <span className="text-sm font-medium text-center text-foreground truncate max-w-full">{match.homeTeam.name}</span>
          </div>

          <div className="text-center flex-shrink-0 min-w-[80px]">
            {hasScore ? (
              <div className={`text-4xl font-bold tabular-nums ${isLive ? 'text-destructive' : 'text-foreground'}`}>
                {match.score.home} – {match.score.away}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{t('match.scheduled')}</div>
            )}
            {isLive && (
              <div className="flex items-center justify-center gap-1.5 mt-1 text-xs text-destructive">
                <Zap size={11} aria-hidden="true" />
                {match.minute}&apos;
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
            <TeamBadge initials={match.awayTeam.initials} color={match.awayTeam.color} size="lg" name={match.awayTeam.name} />
            <span className="text-sm font-medium text-center text-foreground truncate max-w-full">{match.awayTeam.name}</span>
          </div>
        </div>

        {/* UCL 합산 점수 */}
        {match.aggregateScore && (
          <div className="mt-4 text-center">
            <span className="text-sm text-muted-foreground">{t('match.aggregate')} {match.aggregateScore.home} – {match.aggregateScore.away}</span>
            {match.qualifier && (
              <div className="mt-1 text-sm font-medium text-primary">{match.qualifier}</div>
            )}
          </div>
        )}

        {/* 재검증 안내 */}
        {match.displayState === 'recheck' && (
          <div className="mt-4 flex items-start gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
            <Info size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="text-xs text-amber-700 dark:text-amber-300">{t('match.recheckNotice')}</p>
          </div>
        )}

        {isFinished && match.displayState === 'confirmed' && (
          <p className="mt-3 text-xs text-primary text-center">{t('match.officialConfirmed')}</p>
        )}
      </div>

      {/* 예측 */}
      {match.prediction && !isFinished && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('match.predictionTitle')}</h2>
          <div className="flex items-center gap-2 text-sm text-center">
            <div className="flex-1">
              <div className="font-bold text-foreground">{match.prediction.homeWin}%</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t('match.homeWin')}</div>
            </div>
            <div className="flex-1">
              <div className="font-bold text-foreground">{match.prediction.draw}%</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t('match.draw')}</div>
            </div>
            <div className="flex-1">
              <div className="font-bold text-foreground">{match.prediction.awayWin}%</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t('match.awayWin')}</div>
            </div>
          </div>
          <div className="mt-3 flex rounded-full overflow-hidden h-2">
            <div className="bg-blue-500" style={{ width: `${match.prediction.homeWin}%` }} aria-hidden="true" />
            <div className="bg-muted" style={{ width: `${match.prediction.draw}%` }} aria-hidden="true" />
            <div className="bg-red-500" style={{ width: `${match.prediction.awayWin}%` }} aria-hidden="true" />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">{t('match.predictionNote')}</p>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 border-b border-border" role="tablist">
        {TABS.map(tabItem => (
          <button
            key={tabItem.id}
            role="tab"
            aria-selected={tab === tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              tab === tabItem.id ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(tabItem.labelKey)}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'overview' && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t('match.mainEvents')}</h2>
            <EventTimeline events={match.events} />
          </div>
        )}

        {tab === 'lineup' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <LineupList lineup={match.homeLineup} teamName={match.homeTeam.shortName} />
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <LineupList lineup={match.awayLineup} teamName={match.awayTeam.shortName} />
            </div>
          </div>
        )}

        {tab === 'h2h' && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t('match.h2hTitle')}</h2>
            {match.headToHead?.length > 0 ? (
              <div className="space-y-2">
                {match.headToHead.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm py-2 border-b border-border/50 last:border-0">
                    <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{h.date}</span>
                    <span className="flex-1 text-right text-foreground truncate">{h.homeTeam}</span>
                    <span className="font-bold text-foreground flex-shrink-0">{h.homeScore} – {h.awayScore}</span>
                    <span className="flex-1 text-foreground truncate">{h.awayTeam}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">{h.competition}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState description={t('match.noH2H')} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
