/**
 * UCL 녹아웃 대진 (/competitions/champions-league/knockout)
 * 데이터: services/api.js → fetchUCLKnockout
 */

import { Link } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import TeamBadge from '@/components/ui/TeamBadge'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { useData } from '@/hooks/useData'
import { fetchUCLKnockout } from '@/services/api'

const STAGE_LABEL_KEYS = {
  round_of_16:   'knockout.roundOf16',
  quarter_final: 'knockout.quarterFinal',
  semi_final:    'knockout.semiFinal',
  final:         'knockout.final',
}

function TieCard({ tie }) {
  const { t } = useTranslation()
  const isTBD = tie.status === 'tbd' || !tie.homeTeam

  if (isTBD) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 min-h-[80px] flex items-center justify-center">
        <span className="text-xs text-muted-foreground">{t('knockout.tieTbd')}</span>
      </div>
    )
  }

  return (
    <div className={`bg-card rounded-xl p-4 border ${
      tie.status === 'in_progress' ? 'border-primary/50' : 'border-border'
    }`}>
      <div className="flex justify-end mb-2">
        {tie.status === 'in_progress' && (
          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
            {t('knockout.inProgress')}
          </span>
        )}
        {tie.status === 'completed' && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
            {t('knockout.tieComplete')}
          </span>
        )}
      </div>

      <TeamRow team={tie.homeTeam} leg1={tie.leg1Score?.home} leg2={tie.leg2Score?.home}
        agg={tie.aggregateScore?.home} isWinner={tie.winner === tie.homeTeam?.name}
        showScore={tie.status !== 'tbd'} />
      {tie.awayTeam
        ? <TeamRow team={tie.awayTeam} leg1={tie.leg1Score?.away} leg2={tie.leg2Score?.away}
            agg={tie.aggregateScore?.away} isWinner={tie.winner === tie.awayTeam?.name}
            showScore={tie.status !== 'tbd'} />
        : <TBDRow />
      }

      {tie.winner && (
        <div className="mt-3 pt-2 border-t border-border flex items-center gap-1.5">
          <Trophy size={11} className="text-yellow-500" aria-hidden="true" />
          <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
            {tie.winner}
          </span>
        </div>
      )}
    </div>
  )
}

function TBDRow() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 mt-3 opacity-40">
      <div className="w-6 h-6 rounded bg-muted flex-shrink-0" />
      <span className="text-xs text-muted-foreground">{t('knockout.noTeam')}</span>
    </div>
  )
}

function TeamRow({ team, leg1, leg2, agg, isWinner, showScore }) {
  return (
    <Link
      to={`/teams/${team.slug}`}
      className={`flex items-center gap-2 py-1.5 rounded group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1 ${isWinner ? '' : 'opacity-60'}`}
    >
      <TeamBadge initials={team.initials} color={team.color} size="xs" name={team.name} />
      <span className={`text-sm flex-1 min-w-0 truncate group-hover:text-primary transition-colors ${isWinner ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
        {team.name}
      </span>
      {showScore && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto flex-shrink-0">
          {leg1 !== undefined && leg1 !== null && <span>{leg1}</span>}
          {leg2 !== undefined && leg2 !== null && <><span>·</span><span>{leg2}</span></>}
          {agg !== undefined && agg !== null && <span className="font-bold text-foreground ml-1">({agg})</span>}
        </div>
      )}
    </Link>
  )
}

export default function UCLKnockoutPage() {
  const { t } = useTranslation()
  const { data: ties, loading, error } = useData(fetchUCLKnockout, [])

  const stages = ['round_of_16', 'quarter_final', 'semi_final', 'final']

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-8">
      <div className="flex items-center gap-3">
        <Link
          to="/competitions/champions-league"
          className="text-muted-foreground hover:text-foreground p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={t('knockout.backLink')}
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('knockout.pageTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('knockout.pageSubtitle')}</p>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground bg-card border border-border rounded-xl px-4 py-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary/50" aria-hidden="true" />
          {t('knockout.legendInProgress')}
        </span>
        <span className="flex items-center gap-1.5">
          <Trophy size={11} className="text-yellow-500" aria-hidden="true" />
          {t('knockout.legendConfirmed')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40" aria-hidden="true" />
          {t('knockout.legendTbd')}
        </span>
        <span className="ml-auto text-muted-foreground/60">{t('knockout.legendAgg')}</span>
      </div>

      {loading && <LoadingSkeleton rows={4} variant="card" />}

      {!loading && error && (
        <ErrorState title={t('knockout.errorTitle')} description={error} />
      )}

      {!loading && !error && ties && stages.map(stage => {
        const stageTies = ties.filter(t2 => t2.stage === stage)
        const colClass = stage === 'round_of_16'   ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          : stage === 'quarter_final' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          : stage === 'semi_final'   ? 'grid-cols-1 sm:grid-cols-2'
          : 'grid-cols-1 sm:grid-cols-1 max-w-xs'

        return (
          <section key={stage}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {t(STAGE_LABEL_KEYS[stage])}
            </h2>
            <div className={`grid gap-3 ${colClass}`}>
              {stageTies.map(tie => <TieCard key={tie.id} tie={tie} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}
