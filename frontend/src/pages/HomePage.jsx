/**
 * 홈 / — 제품 앞장
 * 경기 탭의 요약이 아니다. 서비스가 무엇인지, 지금 살아있는지, 어디로 갈지를 알린다.
 *
 * 구성 (위→아래):
 *  ① 히어로: 헤드라인 + LiveTicker (경기 카드 아님, 얇은 스코어 줄)
 *  ② 6개 대회 현황 (3×2 그리드)
 *  ③ 바로 가기 (순위·통계·팀, 3행 미리보기)
 *  ④ 차별점 3개 (실제 UI 조각 사용 — 아이콘 아님)
 *  ⑤ 푸터
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useData } from '@/hooks/useData'
import { fetchOverview } from '@/services/api'
import TeamBadge from '@/components/ui/TeamBadge'
import MatchStatusBadge from '@/components/ui/MatchStatusBadge'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { toKSTTime } from '@/utils/dateFormat'

/* ── 구역 색 (tokens.css --z-* 와 동일) ── */
const ZONE_COLORS = ['#3B82F6','#EAB308','#F97316','#16A34A','#F87171','#DC2626']

/* ─────────────────────────────────────────────────────────────
   LiveTicker — 히어로 오른쪽 패널
   경기 카드 금지. 얇은 스코어 줄(ticker)로 표현.
───────────────────────────────────────────────────────────── */
function LiveTicker({ livePulse, nextKickoff, dataAsOf, t, locale }) {
  const count = livePulse?.length ?? 0
  const empty = count === 0

  return (
    <div className="pl-card" style={{ overflow: 'hidden', display: 'grid', alignContent: 'start' }}>
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '14px 18px',
          borderBottom: '1px solid var(--pl-line)',
        }}
      >
        {empty ? (
          <span className="t-card">{t('home.noLiveNow')}</span>
        ) : (
          <>
            <span className="pl-dot pl-dot-pulse" style={{ background: 'var(--st-neg)', width: 8, height: 8 }} aria-hidden="true" />
            <span className="t-card">{t('home.liveNow', { count })}</span>
          </>
        )}
        {dataAsOf && (
          <span className="t-cap num" style={{ marginLeft: 'auto' }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" style={{ display: 'inline', marginRight: 4 }}>
              <circle cx="6" cy="6" r="4.6" /><path d="M6 3.4V6l1.8 1.2" />
            </svg>
            {toKSTTime(dataAsOf, locale)}
          </span>
        )}
      </div>

      {/* 빈 상태 — 다음 킥오프 */}
      {empty && nextKickoff ? (
        <div style={{ padding: '18px 18px 14px', display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <span className="t-cap">{t('home.nextKickoffLabel')}</span>
            <span className="t-sec">{toKSTTime(nextKickoff.date, locale)} KST</span>
            <span className="t-body">{nextKickoff.homeName} vs {nextKickoff.awayName}</span>
          </div>
          <Link to="/matches" className="pl-link" style={{ justifySelf: 'start' }}>
            {t('home.viewSchedule')}
          </Link>
        </div>
      ) : null}

      {/* LIVE 스코어 줄 */}
      {!empty && (
        <div style={{ display: 'grid', gap: 1, background: 'var(--pl-line)' }}>
          {(livePulse ?? []).map((line, i) => (
            <div
              key={line.matchId ?? i}
              style={{
                background: 'var(--pl-card)',
                display: 'grid',
                gridTemplateColumns: '44px 1fr 56px 1fr 44px',
                alignItems: 'center',
                gap: 8,
                padding: '11px 18px',
              }}
            >
              <span className="t-cap" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {line.competitionSlug?.replace('premier-league','EPL').replace('la-liga','LaLiga').replace('bundesliga','BL').replace('serie-a','SA').replace('ligue-1','L1').replace('champions-league','UCL')}
              </span>
              <span
                className="t-body"
                style={{ textAlign: 'right', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {line.home?.name}
              </span>
              <span
                className="num"
                style={{ textAlign: 'center', fontSize: 17, fontWeight: 700 }}
              >
                {line.home?.score} - {line.away?.score}
              </span>
              <span
                className="t-body"
                style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {line.away?.name}
              </span>
              <span
                className="t-cap num"
                style={{ textAlign: 'right', color: 'var(--st-neg-text)', fontWeight: 700 }}
              >
                {line.displayState === 'halftime' ? 'HT' : `${line.minute}′`}
              </span>
            </div>
          ))}
          <div style={{ background: 'var(--pl-card)', padding: '10px 18px' }}>
            <Link to="/matches?status=live" className="pl-link" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
              {t('home.viewAllLive')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Hero — 헤드라인(왼쪽) + LiveTicker(오른쪽)
───────────────────────────────────────────────────────────── */
function Hero({ livePulse, nextKickoff, dataAsOf, t, locale }) {
  return (
    <div
      className="grid gap-6 lg:gap-10"
      style={{ gridTemplateColumns: 'minmax(0,1fr)', alignItems: 'start' }}
    >
      <style>{`@media(min-width:1024px){.hero-grid{grid-template-columns:minmax(0,1fr) minmax(0,1.05fr)!important}}`}</style>
      <div className="hero-grid grid gap-6 lg:gap-10" style={{ alignItems: 'start' }}>
        {/* 왼쪽 — 말 */}
        <div style={{ display: 'grid', gap: 16, paddingTop: 8 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(28px, 4vw, 44px)',
              lineHeight: 1.22,
              fontWeight: 700,
              letterSpacing: '-.028em',
              color: 'var(--pl-text)',
            }}
          >
            {t('home.heroHeadline')}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 'clamp(15px, 1.2vw, 17px)',
              lineHeight: 1.65,
              color: 'var(--pl-sub)',
              maxWidth: 520,
            }}
          >
            {t('home.heroSubtitle')}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/matches" className="pl-btn">{t('home.btnTodayMatches')}</Link>
            <Link to="/standings" className="pl-btn pl-btn-ghost">{t('home.standingsLabel')}</Link>
          </div>
        </div>

        {/* 오른쪽 — 살아있음의 증거 */}
        <LiveTicker livePulse={livePulse} nextKickoff={nextKickoff} dataAsOf={dataAsOf} t={t} locale={locale} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   CompetitionCard — 6개 대회 각 카드
───────────────────────────────────────────────────────────── */
function CompetitionCard({ comp, t, locale }) {
  const liveCount     = comp.liveCount ?? 0
  const upcomingCount = comp.upcomingCount ?? 0
  const hasLive       = liveCount > 0
  const compName      = locale === 'ko' ? comp.name : comp.name

  return (
    <Link
      to={`/competitions/${comp.slug}`}
      style={{
        display: 'grid',
        gap: 12,
        padding: 16,
        textDecoration: 'none',
        color: 'inherit',
      }}
      className="pl-card"
    >
      {/* 헤더: 엠블럼 + 이름 + 상태 배지 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* 대회 이니셜 배지 */}
        <span
          className="pl-emblem"
          style={{
            width: 36,
            height: 36,
            fontSize: 11,
            fontWeight: 700,
            background: 'var(--pl-fill-2)',
            color: 'var(--pl-sub)',
            borderRadius: 8,
            flexShrink: 0,
          }}
        >
          {comp.shortName}
        </span>
        <div style={{ display: 'grid', minWidth: 0, flex: 1 }}>
          <span className="t-card tname" style={{ fontWeight: 600 }}>{compName}</span>
          <span className="t-cap">{comp.shortName}</span>
        </div>
        <span style={{ flexShrink: 0 }}>
          {hasLive ? (
            <span className="pl-badge b-live">
              <span className="pl-dot pl-dot-pulse" aria-hidden="true" />
              {t('home.liveMatchBadge', { count: liveCount })}
            </span>
          ) : (
            <span className="pl-badge b-sched">
              {t('home.upcomingBadge', { count: upcomingCount })}
            </span>
          )}
        </span>
      </div>

      {/* 라운드/스테이지 */}
      <span className="t-sub">{comp.stage?.label}</span>

      {/* 구분선 + 선두 */}
      <div
        style={{
          borderTop: '1px solid var(--pl-line)',
          paddingTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span className="t-cap">{t('home.leaderLabel')}</span>
        {comp.leader && (
          <>
            <TeamBadge
              initials={comp.leader.teamInitials}
              color={comp.leader.teamColor}
              size="xs"
              name={comp.leader.teamName}
            />
            <span
              className="tname t-body"
              style={{ fontWeight: 600, flex: 1 }}
            >
              {comp.leader.teamName}
            </span>
            {comp.leader.points != null && (
              <span className="num t-body" style={{ fontWeight: 700, marginLeft: 'auto', flexShrink: 0 }}>
                {t('home.ptsUnit', { pts: comp.leader.points })}
              </span>
            )}
          </>
        )}
      </div>
    </Link>
  )
}

/* ─────────────────────────────────────────────────────────────
   CompetitionSection — 6개 대회 3×2 그리드
───────────────────────────────────────────────────────────── */
function CompetitionSection({ competitions, t, locale }) {
  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h2 className="t-sec" style={{ margin: 0, fontSize: 22 }}>{t('home.competitionSection')}</h2>
        <span className="t-sub">{t('home.competitionSectionDesc')}</span>
        <Link to="/competitions" className="pl-link" style={{ marginLeft: 'auto' }}>
          {t('home.viewAllComps')}
        </Link>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
        className="sm:grid-cols-3"
      >
        <style>{`@media(min-width:640px){.comp-grid{grid-template-columns:repeat(3,1fr)!important}}`}</style>
        <div
          className="comp-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            gridColumn: '1 / -1',
          }}
        >
          {(competitions ?? []).map(comp => (
            <CompetitionCard key={comp.slug} comp={comp} t={t} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────
   ShortcutCard — 바로 가기 카드 (3행 미리보기)
───────────────────────────────────────────────────────────── */
function ShortcutCard({ title, sub, head, rows, to, zoneFirst, t }) {
  return (
    <Link
      to={to}
      style={{ display: 'grid', overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}
      className="pl-card"
    >
      {/* 카드 헤더 */}
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="t-sec" style={{ fontSize: 18, color: 'var(--pl-text)' }}>{title}</span>
        <span className="t-sub">{sub}</span>
        <span style={{ marginLeft: 'auto' }}>
          <span className="pl-link" style={{ fontSize: 12 }}>{t('home.openAll')}</span>
        </span>
      </div>
      <div style={{ padding: '0 16px 6px' }}>
        <span className="t-cap">{head}</span>
      </div>

      {/* 미리보기 3행 */}
      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '20px 1fr auto',
            gap: 10,
            alignItems: 'center',
            padding: '9px 16px',
            borderTop: '1px solid var(--pl-line)',
            position: 'relative',
          }}
        >
          {/* UCL 구역 표시선 (순위 카드만) */}
          {zoneFirst && i === 0 && (
            <span
              style={{
                position: 'absolute',
                left: 0, top: 0, bottom: 0,
                width: 2,
                background: 'var(--z-ucl)',
              }}
              aria-hidden="true"
            />
          )}
          <span className="num t-sub" style={{ fontWeight: 700 }}>{row.rank}</span>
          <span
            className="t-body tname"
            style={{ fontWeight: 600 }}
          >
            {row.label}
          </span>
          <span className="num t-sub" style={{ fontWeight: 700, color: 'var(--pl-text)' }}>{row.value}</span>
        </div>
      ))}

      <div style={{ padding: '10px 16px 14px', borderTop: '1px solid var(--pl-line)' }}>
        <span className="t-cap">{t('home.openInTab', { tab: title })}</span>
      </div>
    </Link>
  )
}

/* ─────────────────────────────────────────────────────────────
   ShortcutsSection — 3열 바로 가기
───────────────────────────────────────────────────────────── */
function ShortcutsSection({ eplTop3, topScorers, competitions, t }) {
  const standingsRows = (eplTop3 ?? []).map(e => ({
    rank: e.rank,
    label: e.teamName,
    value: t('home.ptsUnit', { pts: e.points }),
  }))

  const scorerRows = (topScorers ?? []).map(s => ({
    rank: s.rank,
    label: `${s.playerName} · ${s.teamName}`,
    value: t('home.goalsCountUnit', { goals: s.value }),
  }))

  const leaderRows = (competitions ?? []).slice(0, 3).map(c => ({
    rank: '',
    label: c.leader?.teamName ?? '-',
    value: c.shortName,
  }))

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <h2 className="t-sec" style={{ margin: 0, fontSize: 22 }}>{t('home.shortcutsSection')}</h2>
      <div
        className="shortcuts-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}
      >
        <style>{`@media(min-width:768px){.shortcuts-grid{grid-template-columns:repeat(3,1fr)!important}}`}</style>
        <ShortcutCard
          title={t('home.standingsLabel')}
          sub={t('home.epl3Label')}
          head="EPL Top 3"
          rows={standingsRows}
          to="/standings?competition=premier-league"
          zoneFirst
          t={t}
        />
        <ShortcutCard
          title={t('home.statsLabel')}
          sub={t('home.allScorerLabel')}
          head={t('home.allScorerLabel')}
          rows={scorerRows}
          to="/stats"
          t={t}
        />
        <ShortcutCard
          title={t('home.teamsLabel')}
          sub={t('home.topTeamsLabel')}
          head={t('home.topTeamsLabel')}
          rows={leaderRows}
          to="/teams"
          t={t}
        />
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────
   DiffCard — 차별점 카드 (실제 UI 조각 사용)
───────────────────────────────────────────────────────────── */
function DiffCard({ visual, title, desc }) {
  return (
    <div
      className="pl-card"
      style={{ padding: 20, display: 'grid', gap: 12, alignContent: 'start' }}
    >
      {/* 실제 UI 조각 */}
      <div style={{ minHeight: 32, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        {visual}
      </div>
      <span className="t-sec" style={{ fontSize: 18, margin: 0 }}>{title}</span>
      <span className="t-sub" style={{ lineHeight: 1.7 }}>{desc}</span>
    </div>
  )
}

function DiffsSection({ t }) {
  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <h2 className="t-sec" style={{ margin: 0, fontSize: 22 }}>{t('home.diffSection')}</h2>
      <div
        className="diffs-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}
      >
        <style>{`@media(min-width:768px){.diffs-grid{grid-template-columns:repeat(3,1fr)!important}}`}</style>

        {/* 차별점 1: 배지 3종 실물 */}
        <DiffCard
          visual={
            <>
              <MatchStatusBadge state="live" />
              <MatchStatusBadge state="recheck" />
              <MatchStatusBadge state="confirmed" />
            </>
          }
          title={t('home.diff1Title')}
          desc={t('home.diff1Desc')}
        />

        {/* 차별점 2: 순위 구역 색 막대 6칸 */}
        <DiffCard
          visual={
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {ZONE_COLORS.map((c, i) => (
                <span
                  key={i}
                  style={{
                    width: 24,
                    height: 8,
                    borderRadius: 2,
                    background: c,
                    display: 'block',
                  }}
                  aria-hidden="true"
                />
              ))}
            </div>
          }
          title={t('home.diff2Title')}
          desc={t('home.diff2Desc')}
        />

        {/* 차별점 3: 한/영 이름 칩 */}
        <DiffCard
          visual={
            <>
              {[t('home.diff3KoreanName'), t('home.diff3EnglishName')].map(name => (
                <span
                  key={name}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    background: 'var(--pl-fill)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--pl-text)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {name}
                </span>
              ))}
            </>
          }
          title={t('home.diff3Title')}
          desc={t('home.diff3Desc')}
        />
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────
   FooterSection
───────────────────────────────────────────────────────────── */
function FooterSection({ dataAsOf, t, locale }) {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--pl-line)',
        padding: '20px 0 32px',
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <span className="t-card">PitchLog</span>
      <span className="t-sub">{t('home.dataSource')}</span>
      <span className="t-sub">2026-27</span>
      {dataAsOf && (
        <span className="t-cap num" style={{ marginLeft: 'auto' }}>
          {toKSTTime(dataAsOf, locale)} KST
        </span>
      )}
    </footer>
  )
}

/* ─────────────────────────────────────────────────────────────
   HomePage — 메인
───────────────────────────────────────────────────────────── */
export default function HomePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  const { data: overview, loading, error } = useData(fetchOverview, [])

  if (loading) {
    return (
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '40px 24px' }}>
        <LoadingSkeleton rows={8} variant="card" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '40px 24px' }}>
        <ErrorState description={error} />
      </div>
    )
  }

  const { competitions, livePulse, nextKickoff, dataAsOf, topScorers, eplTop3 } = overview ?? {}

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: '100dvh' }}>
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: 'clamp(20px,3vw,36px) clamp(16px,6vw,80px) 0',
          display: 'grid',
          gap: 'clamp(28px,4vw,40px)',
        }}
      >
        {/* ① 히어로 */}
        <Hero
          livePulse={livePulse}
          nextKickoff={nextKickoff}
          dataAsOf={dataAsOf}
          t={t}
          locale={locale}
        />

        {/* ② 6개 대회 현황 */}
        <CompetitionSection competitions={competitions} t={t} locale={locale} />

        {/* ③ 바로 가기 */}
        <ShortcutsSection
          eplTop3={eplTop3}
          topScorers={topScorers}
          competitions={competitions}
          t={t}
        />

        {/* ④ 차별점 3개 */}
        <DiffsSection t={t} />

        {/* ⑤ 푸터 */}
        <FooterSection dataAsOf={dataAsOf} t={t} locale={locale} />
      </div>
    </div>
  )
}
