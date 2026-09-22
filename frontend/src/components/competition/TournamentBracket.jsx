/**
 * TournamentBracket — 녹아웃 대진표 (feat/tournament-bracket · B 계열)
 *
 * `bracketRounds(ties, format)` 결과를 소비. 두 영역:
 *   1) 트리 (isBracket=true 라운드 · R16·QF·SF·F 4열 고정) — 가로 스크롤
 *   2) 접힌 리스트 (isEarly=true · UCL R32 · 컵 R64/R128) — details/summary
 * isQualifier 라운드 (UCL 예선·Play-offs) 는 표시 안 함 (D4).
 */

import { useTranslation } from 'react-i18next'
import TieCard from './TieCard'
import EmptyState from '@/components/ui/EmptyState'

function TreeColumn({ round, locale }) {
  return (
    <div style={{ display: 'grid', gap: 8, alignContent: 'start', minWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="t-card" style={{ margin: 0 }}>{round.roundName}</span>
        <span className="t-cap" style={{ color: 'var(--pl-sub)' }}>{round.ties.length}</span>
      </div>
      {round.ties.map(tie => {
        const homeBye = !!round.byeSlots?.some(s => s.slug === tie.home.slug)
        const awayBye = !!round.byeSlots?.some(s => s.slug === tie.away.slug)
        return (
          <TieCard
            key={tie.tieId}
            tie={tie}
            locale={locale}
            homeBye={homeBye}
            awayBye={awayBye}
          />
        )
      })}
    </div>
  )
}

function EarlyRound({ round, locale }) {
  return (
    <details style={{ border: '1px solid var(--pl-line)', borderRadius: 8, padding: '8px 12px' }}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, minHeight: 32 }}>
        <span className="t-card" style={{ margin: 0 }}>{round.roundName}</span>
        <span className="t-cap" style={{ color: 'var(--pl-sub)' }}>{round.ties.length}</span>
      </summary>
      <div style={{ display: 'grid', gap: 8, padding: '12px 0 4px' }}>
        {round.ties.map(tie => <TieCard key={tie.tieId} tie={tie} locale={locale} />)}
      </div>
    </details>
  )
}

/**
 * @param {{ rounds:Array<import('@/utils/ties').BracketRound>, locale:string }} props
 */
export default function TournamentBracket({ rounds, locale }) {
  const { t } = useTranslation()
  const list = Array.isArray(rounds) ? rounds : []
  const trees = list.filter(r => r.isBracket)
  const earlies = list.filter(r => r.isEarly)

  const hasAnything = trees.length > 0 || earlies.length > 0
  const hasAnyTies = list.some(r => r.ties && r.ties.length > 0)

  if (!hasAnything && !hasAnyTies) {
    return (
      <div className="pl-card" style={{ padding: 24 }}>
        <EmptyState description={t('bracket.emptyRound')} />
      </div>
    )
  }

  // 빈 트리 안내 — trees 0 · earlies 있음 (예: DFB 2026 R64·R32 · R16 미도래).
  // ties.js:383 bracketRounds 는 roundOrdinal asc 정렬이라 earlies[last] 가 최대 ordinal (R64 > R32).
  const latestEarly = earlies.length > 0 ? earlies[earlies.length - 1].roundName : null

  return (
    <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
      {trees.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: 'minmax(240px, 1fr)',
            gap: 14,
            overflowX: 'auto',
            paddingBottom: 8,
            minWidth: 0,
          }}
        >
          {trees.map(round => <TreeColumn key={round.roundName} round={round} locale={locale} />)}
        </div>
      )}
      {trees.length === 0 && latestEarly && (
        <div className="t-cap" style={{ color: 'var(--pl-sub)' }}>
          {t('bracket.treeFromR16', { round: latestEarly })}
        </div>
      )}
      {earlies.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {earlies.map(round => <EarlyRound key={round.roundName} round={round} locale={locale} />)}
        </div>
      )}
      {/* isQualifier 라운드는 렌더 안 함 (D4) */}
    </div>
  )
}
