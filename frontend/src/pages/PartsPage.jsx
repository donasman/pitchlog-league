/**
 * 부품 시트 — /dev/parts
 * 1단계 완료 조건 확인용 임시 라우트.
 * 모든 공통 부품을 전 상태로 나란히 렌더링한다.
 */

import MatchStatusBadge from '@/components/ui/MatchStatusBadge'
import FormBadge from '@/components/ui/FormBadge'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import FilterBar from '@/components/ui/FilterBar'
import TeamBadge from '@/components/ui/TeamBadge'
import MatchCard from '@/components/ui/MatchCard'
import StandingsTable from '@/components/ui/StandingsTable'
import { useState } from 'react'

/* ── 샘플 데이터 ── */
const BADGE_STATES = ['scheduled', 'live', 'halftime', 'final', 'recheck', 'confirmed', 'postponed', 'cancelled']

const FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'ucl', label: 'UCL' },
  { value: 'epl', label: 'EPL' },
  { value: 'lal', label: '라리가' },
]

const LONG_NAMES = [
  { name: '브라이턴 앤 호브 알비온', initials: 'BHA', color: '#0057B8' },
  { name: 'Borussia Mönchengladbach', initials: 'BMG', color: '#000000' },
  { name: '파리 생제르맹', initials: 'PSG', color: '#004170' },
  { name: 'Atlético de Madrid', initials: 'ATM', color: '#CB3524' },
]

const MOCK_MATCH = {
  id: 'demo-1',
  round: '28라운드',
  stage: '28R',
  displayState: 'live',
  score: { home: 2, away: 1 },
  homeTeam: { name: '리버풀', shortName: '리버풀', initials: 'LIV', color: '#C8102E' },
  awayTeam: { name: '첼시', shortName: '첼시', initials: 'CHE', color: '#034694' },
  date: new Date().toISOString(),
  venue: '안필드',
}

const MOCK_MATCH_SCHED = {
  id: 'demo-2',
  round: '29라운드',
  displayState: 'scheduled',
  score: { home: null, away: null },
  homeTeam: { name: '브라이턴 앤 호브 알비온', shortName: '브라이턴', initials: 'BHA', color: '#0057B8' },
  awayTeam: { name: 'Manchester City', shortName: 'Man City', initials: 'MCI', color: '#6CABDD' },
  date: new Date(Date.now() + 86400000 * 2).toISOString(),
}

const MOCK_STANDINGS = [
  { teamId: 1, teamName: '리버풀', teamSlug: 'liverpool', teamInitials: 'LIV', teamColor: '#C8102E', rank: 1, played: 28, won: 21, drawn: 4, lost: 3, goalsFor: 68, goalsAgainst: 28, goalDifference: 40, points: 67, form: ['W','W','D','W','W'], zone: 'champions_league' },
  { teamId: 2, teamName: '맨체스터 시티', teamSlug: 'man-city', teamInitials: 'MCI', teamColor: '#6CABDD', rank: 2, played: 28, won: 18, drawn: 5, lost: 5, goalsFor: 62, goalsAgainst: 34, goalDifference: 28, points: 59, form: ['W','L','W','W','D'], zone: 'champions_league' },
  { teamId: 3, teamName: '아스널', teamSlug: 'arsenal', teamInitials: 'ARS', teamColor: '#EF0107', rank: 3, played: 28, won: 17, drawn: 5, lost: 6, goalsFor: 58, goalsAgainst: 32, goalDifference: 26, points: 56, form: ['W','W','W','D','L'], zone: 'champions_league' },
  { teamId: 4, teamName: '아스톤 빌라', teamSlug: 'aston-villa', teamInitials: 'AVL', teamColor: '#95BFE5', rank: 4, played: 28, won: 16, drawn: 3, lost: 9, goalsFor: 55, goalsAgainst: 42, goalDifference: 13, points: 51, form: ['L','W','W','L','W'], zone: 'champions_league' },
  { teamId: 5, teamName: '토트넘', teamSlug: 'tottenham', teamInitials: 'TOT', teamColor: '#132257', rank: 5, played: 28, won: 13, drawn: 6, lost: 9, goalsFor: 49, goalsAgainst: 45, goalDifference: 4, points: 45, form: ['D','W','D','W','L'], zone: 'champions_league_playoff' },
  { teamId: 6, teamName: '첼시', teamSlug: 'chelsea', teamInitials: 'CHE', teamColor: '#034694', rank: 6, played: 28, won: 12, drawn: 6, lost: 10, goalsFor: 44, goalsAgainst: 42, goalDifference: 2, points: 42, form: ['L','D','W','W','D'], zone: 'europa_league' },
  { teamId: 17, teamName: '번리', teamSlug: 'burnley', teamInitials: 'BUR', teamColor: '#6C1D45', rank: 17, played: 28, won: 4, drawn: 4, lost: 20, goalsFor: 24, goalsAgainst: 65, goalDifference: -41, points: 16, form: ['L','L','D','L','L'], zone: 'relegation_playoff' },
  { teamId: 18, teamName: '루턴 타운', teamSlug: 'luton', teamInitials: 'LUT', teamColor: '#F78F1E', rank: 18, played: 28, won: 5, drawn: 3, lost: 20, goalsFor: 28, goalsAgainst: 63, goalDifference: -35, points: 18, form: ['L','L','L','D','L'], zone: 'relegation' },
  { teamId: 19, teamName: '브라이턴 앤 호브 알비온', teamSlug: 'brighton', teamInitials: 'BHA', teamColor: '#0057B8', rank: 19, played: 28, won: 4, drawn: 2, lost: 22, goalsFor: 22, goalsAgainst: 70, goalDifference: -48, points: 14, form: ['L','L','L','L','D'], zone: 'relegation' },
]

function Section({ title, children }) {
  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <h2 className="t-sec" style={{ margin: 0 }}>{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {label && <span className="t-cap" style={{ display: 'block' }}>{label}</span>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
        {children}
      </div>
    </div>
  )
}

export default function PartsPage() {
  const [filterVal, setFilterVal] = useState('all')

  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '40px 24px',
        display: 'grid',
        gap: 48,
      }}
    >
      <div>
        <h1 className="t-page" style={{ margin: '0 0 8px' }}>부품 시트</h1>
        <p className="t-sub" style={{ margin: 0 }}>
          1단계 파운데이션 — 공통 컴포넌트 전 상태 확인용. 프로덕션 화면이 아님.
        </p>
      </div>

      {/* ── 1. 경기 상태 배지 8종 ── */}
      <Section title="경기 상태 배지 8종">
        <p className="t-sub" style={{ margin: 0 }}>
          종료·재검증 중·확정은 각기 다른 상태다. 한 줄을 유지해야 한다.
        </p>
        <Row label="전 상태 나란히">
          {BADGE_STATES.map(state => (
            <MatchStatusBadge key={state} state={state} />
          ))}
        </Row>
        <Row label="설명 포함">
          {['live', 'recheck', 'confirmed'].map(state => (
            <MatchStatusBadge key={state} state={state} showDescription />
          ))}
        </Row>
      </Section>

      {/* ── 2. 폼 배지 ── */}
      <Section title="폼 배지">
        <Row label="단독">
          <FormBadge result="W" />
          <FormBadge result="D" />
          <FormBadge result="L" />
        </Row>
        <Row label="시퀀스 (pl-form 래퍼)">
          <span className="pl-form">
            {['W','W','D','L','W'].map((r, i) => <FormBadge key={i} result={r} />)}
          </span>
          <span className="pl-form">
            {['L','L','L','D','W'].map((r, i) => <FormBadge key={i} result={r} />)}
          </span>
        </Row>
      </Section>

      {/* ── 3. 팀 배지 (긴 이름 포함) ── */}
      <Section title="팀 배지 / 엠블럼">
        <Row label="크기별">
          <TeamBadge initials="LIV" color="#C8102E" size="xs" name="리버풀" />
          <TeamBadge initials="LIV" color="#C8102E" size="sm" name="리버풀" />
          <TeamBadge initials="LIV" color="#C8102E" size="md" name="리버풀" />
          <TeamBadge initials="LIV" color="#C8102E" size="lg" name="리버풀" />
        </Row>
        <Row label="긴 팀명 — 390px에서 말줄임 확인">
          {LONG_NAMES.map(t => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 200, minWidth: 0 }}>
              <TeamBadge initials={t.initials} color={t.color} size="sm" name={t.name} />
              <span className="tname t-body" style={{ fontWeight: 600 }} title={t.name}>{t.name}</span>
            </div>
          ))}
        </Row>
      </Section>

      {/* ── 4. 필터 칩 ── */}
      <Section title="필터 칩 (FilterBar)">
        <p className="t-sub" style={{ margin: 0 }}>
          활성 칩은 틴트가 아니라 브랜드 블루로 채운다 (PRD 9-2).
        </p>
        <FilterBar options={FILTER_OPTIONS} value={filterVal} onChange={setFilterVal} label="대회 필터" />
        <Row label="직접 .pl-chip (aria-pressed 상태)">
          <button className="pl-chip" aria-pressed="false">비활성</button>
          <button className="pl-chip" aria-pressed="true">활성 — 채움</button>
          <button className="pl-chip pl-chip-m" aria-pressed="false">모바일 크기</button>
        </Row>
      </Section>

      {/* ── 5. 버튼 ── */}
      <Section title="버튼">
        <Row label="기본">
          <button className="pl-btn">기본 버튼</button>
          <button className="pl-btn pl-btn-ghost">고스트</button>
          <button className="pl-btn pl-btn-sm">소형</button>
          <button className="pl-btn pl-btn-sm pl-btn-ghost">소형 고스트</button>
        </Row>
        <Row label="비활성">
          <button className="pl-btn" disabled style={{ opacity: .45, cursor: 'not-allowed' }}>비활성</button>
        </Row>
      </Section>

      {/* ── 6. 스켈레톤 ── */}
      <Section title="로딩 스켈레톤">
        <Row label="row (순위표·목록)">
          <div style={{ width: '100%', maxWidth: 480 }}>
            <LoadingSkeleton rows={4} variant="row" />
          </div>
        </Row>
        <Row label="card">
          <div style={{ width: '100%' }}>
            <LoadingSkeleton rows={3} variant="card" />
          </div>
        </Row>
        <Row label="text">
          <div style={{ width: '100%', maxWidth: 400 }}>
            <LoadingSkeleton rows={5} variant="text" />
          </div>
        </Row>
      </Section>

      {/* ── 7. 화면 상태 4종 ── */}
      <Section title="화면 상태 4종">
        <p className="t-sub" style={{ margin: 0 }}>
          오류를 빈 데이터로 바꾸지 않는다. 오류·빈 결과는 시각적으로 구분된다.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div className="pl-card" style={{ overflow: 'hidden' }}>
            <div className="t-cap" style={{ padding: '12px 16px', borderBottom: '1px solid var(--pl-line)' }}>로딩</div>
            <LoadingSkeleton rows={3} />
          </div>
          <div className="pl-card" style={{ overflow: 'hidden' }}>
            <div className="t-cap" style={{ padding: '12px 16px', borderBottom: '1px solid var(--pl-line)' }}>오류</div>
            <ErrorState onRetry={() => {}} />
          </div>
          <div className="pl-card" style={{ overflow: 'hidden' }}>
            <div className="t-cap" style={{ padding: '12px 16px', borderBottom: '1px solid var(--pl-line)' }}>빈 결과</div>
            <EmptyState />
          </div>
          <div className="pl-card" style={{ padding: 16 }}>
            <div className="t-cap" style={{ marginBottom: 12 }}>정상</div>
            <MatchStatusBadge state="confirmed" />
          </div>
        </div>
      </Section>

      {/* ── 8. 경기 카드 ── */}
      <Section title="경기 카드">
        <Row label="기본 (LIVE)">
          <div style={{ width: 300 }}>
            <MatchCard match={MOCK_MATCH} />
          </div>
        </Row>
        <Row label="예정">
          <div style={{ width: 300 }}>
            <MatchCard match={MOCK_MATCH_SCHED} />
          </div>
        </Row>
        <Row label="컴팩트">
          <div style={{ width: 220 }}>
            <MatchCard match={MOCK_MATCH} compact />
          </div>
          <div style={{ width: 220 }}>
            <MatchCard match={MOCK_MATCH_SCHED} compact />
          </div>
        </Row>
      </Section>

      {/* ── 9. 순위표 구역 표기 ── */}
      <Section title="순위표 — 구역 표기">
        <p className="t-sub" style={{ margin: 0 }}>
          좌측 2px 표시선 + 4% 틴트 + 범례. 색을 빼고 봐도 구역이 구분되어야 한다.
        </p>
        <div className="pl-card" style={{ overflow: 'hidden' }}>
          <StandingsTable entries={MOCK_STANDINGS} />
        </div>
        <div>
          <p className="t-cap" style={{ margin: '0 0 8px' }}>컴팩트 (홈 사이드바)</p>
          <div className="pl-card" style={{ overflow: 'hidden', maxWidth: 320 }}>
            <StandingsTable entries={MOCK_STANDINGS} compact maxRows={5} />
          </div>
        </div>
      </Section>

      {/* ── 10. 색 팔레트 ── */}
      <Section title="색 팔레트 — CSS 토큰">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {[
            ['--pl-primary', '브랜드 블루'],
            ['--pl-primary-hover', 'hover'],
            ['--pl-primary-pressed', 'pressed'],
            ['--pl-bg', '페이지 배경'],
            ['--pl-card', '카드'],
            ['--pl-text', '본문'],
            ['--pl-sub', '보조 텍스트'],
            ['--pl-line', '구분선'],
            ['--pl-fill', '채움 1'],
            ['--pl-fill-2', '채움 2'],
            ['--z-ucl', 'UCL 직행'],
            ['--z-uclpo', 'UCL 플레이오프'],
            ['--z-uel', '유로파'],
            ['--z-uecl', '컨퍼런스'],
            ['--z-relpo', '강등 플레이오프'],
            ['--z-rel', '강등'],
            ['--st-pos', '정상/승리'],
            ['--st-warn', '주의'],
            ['--st-neg', '오류/LIVE'],
            ['--form-draw', '폼 무승부'],
          ].map(([v, label]) => (
            <div key={v} style={{ display: 'grid', gap: 4 }}>
              <div
                style={{
                  height: 32,
                  borderRadius: 6,
                  background: `var(${v})`,
                  boxShadow: 'inset 0 0 0 1px var(--pl-line)',
                }}
              />
              <span className="t-cap" style={{ display: 'block' }}>{label}</span>
              <span className="t-cap" style={{ display: 'block', color: 'var(--pl-sub)' }}>{v}</span>
            </div>
          ))}
        </div>
      </Section>

      <p className="t-cap" style={{ textAlign: 'center', marginTop: 24 }}>
        /dev/parts — 1단계 파운데이션 부품 시트
      </p>
    </div>
  )
}
