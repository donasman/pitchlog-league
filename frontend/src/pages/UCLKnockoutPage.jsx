/**
 * UCL 녹아웃 대진 /competitions/champions-league/knockout
 * 데스크톱: 5열 (PO → R16 → QF → SF → Final)
 * 모바일: 라운드별 아코디언
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TeamBadge from '@/components/ui/TeamBadge'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { useData } from '@/hooks/useData'
import { fetchUCLKnockout } from '@/services/api'

const STAGE_ORDER = ['round_of_16', 'quarter_final', 'semi_final', 'final']
const STAGE_LABEL_KEYS = {
  round_of_16:   'knockout.roundOf16',
  quarter_final: 'knockout.quarterFinal',
  semi_final:    'knockout.semiFinal',
  final:         'knockout.final',
}

/* ── TieCard ── */
function TieCard({ tie, t }) {
  const isTBD = tie.status === 'tbd' || !tie.homeTeam

  if (isTBD) {
    return (
      <div className="pl-card" style={{ padding: 12, minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
        <span className="t-sub">{t('knockout.tbd')}</span>
      </div>
    )
  }

  const agg = tie.aggregateScore
  const legDone = tie.leg2Score != null
  const inProgress = tie.status === 'in_progress'

  return (
    <div
      className="pl-card"
      style={{
        padding: 12,
        display: 'grid',
        gap: 8,
        boxShadow: inProgress
          ? `inset 0 0 0 1.5px var(--z-ucl), var(--sh-card)`
          : `inset 0 0 0 1px var(--pl-line), var(--sh-card)`,
      }}
    >
      {/* 상태 + 합산 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {legDone && agg && (
          <span className="pl-badge b-final">
            {t('match.aggregate')} {agg.home}–{agg.away}
          </span>
        )}
        {inProgress && !legDone && (
          <span className="pl-badge b-recheck">{t('knockout.leg2Pending')}</span>
        )}
        {!legDone && !inProgress && (
          <span className="pl-badge b-sched">{t('match.scheduled')}</span>
        )}
      </div>

      {/* 홈팀 */}
      {[
        { team: tie.homeTeam, l1: tie.leg1Score?.home, l2: tie.leg2Score?.home },
        { team: tie.awayTeam, l1: tie.leg1Score?.away, l2: tie.leg2Score?.away },
      ].map(({ team, l1, l2 }, idx) => {
        if (!team) return null
        const isWinner = tie.winner === team.name
        return (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 24px 24px', gap: 8, alignItems: 'center' }}>
            <Link
              to={`/teams/${team.slug}`}
              style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, textDecoration: 'none' }}
            >
              <TeamBadge initials={team.initials} color={team.color} size="xs" name={team.name} />
              <span
                className="tname"
                style={{ fontWeight: isWinner ? 700 : 500, fontSize: 13, color: 'var(--pl-text)' }}
                title={team.name}
              >
                {team.shortName || team.name}
              </span>
              {isWinner && (
                <span className="pl-badge b-final" style={{ flexShrink: 0 }}>{t('knockout.through')}</span>
              )}
            </Link>
            <span className="num t-sub" style={{ textAlign: 'center', color: 'var(--pl-text)', fontWeight: 700 }}>
              {l1 ?? '–'}
            </span>
            <span className="num t-sub" style={{ textAlign: 'center', color: 'var(--pl-text)', fontWeight: 700 }}>
              {l2 ?? '–'}
            </span>
          </div>
        )
      })}

      {/* 차전 레이블 */}
      <div className="t-cap" style={{ display: 'grid', gridTemplateColumns: '1fr 24px 24px', gap: 8 }}>
        <span />
        <span style={{ textAlign: 'center' }}>1</span>
        <span style={{ textAlign: 'center' }}>2</span>
      </div>
    </div>
  )
}

/* ── 라운드 섹션 (데스크톱 열 내부) ── */
function RoundColumn({ stage, ties, t }) {
  return (
    <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span className="t-card">{t(STAGE_LABEL_KEYS[stage])}</span>
        <span className="t-cap num" style={{ color: 'var(--pl-sub)' }}>{ties.length}</span>
      </div>
      {ties.map(tie => <TieCard key={tie.id} tie={tie} t={t} />)}
    </div>
  )
}

/* ── 아코디언 (모바일) ── */
function RoundAccordion({ stage, ties, t, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="pl-card" style={{ overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          minHeight: 52,
          padding: '0 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font)',
          borderBottom: open ? '1px solid var(--pl-line)' : 'none',
        }}
        aria-expanded={open}
      >
        <span className="t-card" style={{ flex: 1, textAlign: 'left' }}>{t(STAGE_LABEL_KEYS[stage])}</span>
        <span className="t-cap num" style={{ color: 'var(--pl-sub)' }}>{ties.length}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
          style={{ color: 'var(--pl-sub)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}
        >
          <path d="m5 8 5 5 5-5" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: 12, display: 'grid', gap: 10 }}>
          {ties.map(tie => <TieCard key={tie.id} tie={tie} t={t} />)}
        </div>
      )}
    </div>
  )
}

/* ── UCLKnockoutPage ── */
export default function UCLKnockoutPage() {
  const { t } = useTranslation()
  const { data: ties, loading, error } = useData(fetchUCLKnockout, [])

  const stageMap = {}
  STAGE_ORDER.forEach(s => { stageMap[s] = [] })
  if (ties) {
    ties.forEach(tie => {
      if (stageMap[tie.stage]) stageMap[tie.stage].push(tie)
    })
  }

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '20px 16px 48px' }} className="lg:px-8">

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <h1 className="t-page" style={{ margin: 0, fontSize: 24 }}>{t('knockout.pageTitle')}</h1>
          <span className="t-sub">2026-27 · {t('knockout.pageSubtitle')}</span>
          <Link to="/competitions/champions-league" className="pl-link" style={{ marginLeft: 'auto', fontSize: 13 }}>
            {t('standings.hubLink')}
          </Link>
        </div>

        {/* 범례 */}
        <div className="pl-card" style={{ padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <span className="t-cap">{t('knockout.legendAgg')}</span>
          <span className="t-sub">{t('knockout.legendInProgress')}</span>
          <span className="t-sub">{t('knockout.legendConfirmed')}</span>
          <span className="t-sub">{t('knockout.legendTbd')}</span>
        </div>

        {loading && <LoadingSkeleton rows={6} variant="card" />}
        {!loading && error && <ErrorState title={t('knockout.errorTitle')} description={error} />}

        {!loading && !error && ties && (
          <>
            {/* 데스크톱: 5열 */}
            <div className="hidden lg:block">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 14, alignItems: 'start' }}>
                {/* 플레이오프는 데이터에 없으면 스킵 */}
                {STAGE_ORDER.map(stage => (
                  <RoundColumn key={stage} stage={stage} ties={stageMap[stage]} t={t} />
                ))}
              </div>
            </div>

            {/* 모바일: 아코디언 */}
            <div className="lg:hidden" style={{ display: 'grid', gap: 8 }}>
              {STAGE_ORDER.map((stage, i) => (
                <RoundAccordion
                  key={stage}
                  stage={stage}
                  ties={stageMap[stage]}
                  t={t}
                  defaultOpen={i < 2}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
