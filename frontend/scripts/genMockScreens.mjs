#!/usr/bin/env node
/**
 * 새 화면용 Mock 생성기 — 홈(대회 현황) · 알림 · AI 어시스턴트
 *
 * 생성:
 *   src/mocks/overview.js       홈 화면 — 6개 대회 현황 + 라이브 펄스
 *   src/mocks/notifications.js  알림 목록 (design-briefs/07)
 *   src/mocks/assistant.js      AI 샘플 대화 (design-briefs/08)
 *
 * 실행: node scripts/genMockScreens.mjs
 */
import { writeFileSync } from 'fs'
import { pathToFileURL } from 'url'
import { resolve } from 'path'

const SRC = resolve('src/mocks')
const { MATCHES } = await import(pathToFileURL(`${SRC}/matches.js`))
const { STANDINGS } = await import(pathToFileURL(`${SRC}/standings.js`))
const { COMPETITIONS } = await import(pathToFileURL(`${SRC}/competitions.js`))
const { COMPETITION_SCORERS } = await import(pathToFileURL(`${SRC}/players.js`))
const { MATCH_TEAM_STATS } = await import(pathToFileURL(`${SRC}/matchStats.js`))

const NOW = '2026-11-23T14:42:00Z'

// ── 1. 홈 — 대회 현황 ─────────────────────────────────────────
const COMPETITION_OVERVIEW = COMPETITIONS.map(c => {
  const table = STANDINGS[c.slug]
  const mine  = MATCHES.filter(m => m.competitionSlug === c.slug)
  const live  = mine.filter(m => ['live','halftime'].includes(m.displayState))
  const upcoming = mine.filter(m => m.displayState === 'scheduled')
    .sort((a,b) => new Date(a.date) - new Date(b.date))
  const lead = table?.entries?.[0] ?? null
  const topScorer = (COMPETITION_SCORERS?.[c.slug] ?? [])[0] ?? null

  return {
    slug: c.slug, id: c.id, name: c.name, shortName: c.shortName,
    stage: table?.stage ?? null,
    liveCount: live.length,
    upcomingCount: upcoming.length,
    nextKickoff: upcoming[0]?.date ?? null,
    // UCL 은 순위표 대신 진행 중인 경기 스코어를 보여준다
    leader: lead ? {
      teamId: lead.teamId, teamSlug: lead.teamSlug, teamName: lead.teamName,
      teamInitials: lead.teamInitials, teamColor: lead.teamColor, points: lead.points,
    } : null,
    topScorer: topScorer ? {
      playerSlug: topScorer.playerSlug, playerName: topScorer.playerName, value: topScorer.value,
    } : null,
    updatedAt: table?.updatedAt ?? NOW,
  }
})

/** 히어로 라이브 펄스 — 경기 카드가 아니라 얇은 스코어 줄 (design-briefs/03-home) */
const LIVE_PULSE = MATCHES
  .filter(m => ['live','halftime'].includes(m.displayState))
  .map(m => ({
    matchId: m.id, competitionSlug: m.competitionSlug,
    home: { name: m.homeTeam.name, initials: m.homeTeam.initials, color: m.homeTeam.color, score: m.score.home },
    away: { name: m.awayTeam.name, initials: m.awayTeam.initials, color: m.awayTeam.color, score: m.score.away },
    minute: m.minute ?? null, displayState: m.displayState,
  }))

/** 진행 중 경기가 0건일 때 대체 — 다음 킥오프 (브리프가 요구한 빈 상태) */
const NEXT_KICKOFF = MATCHES
  .filter(m => m.displayState === 'scheduled')
  .sort((a,b) => new Date(a.date) - new Date(b.date))[0] ?? null

writeFileSync(`${SRC}/overview.js`, `/**
 * Mock 홈 화면 데이터
 * ⚠ scripts/genMockScreens.mjs 가 생성한다. 직접 수정하지 않는다.
 *
 * 홈은 제품 앞장이다 — 경기 탭의 요약이 아니다 (docs/IA_HOME_RESTRUCTURE.md).
 * 라이브 펄스는 경기 카드가 아니라 얇은 스코어 줄이다 (design-briefs/03-home.md).
 */

export const COMPETITION_OVERVIEW = ${JSON.stringify(COMPETITION_OVERVIEW, null, 2)}

export const LIVE_PULSE = ${JSON.stringify(LIVE_PULSE, null, 2)}

/** 진행 중 경기가 0건일 때 히어로 오른쪽을 채운다 — 비어 보이면 안 된다 */
export const NEXT_KICKOFF = ${JSON.stringify(NEXT_KICKOFF ? {
  matchId: NEXT_KICKOFF.id, competitionSlug: NEXT_KICKOFF.competitionSlug,
  homeName: NEXT_KICKOFF.homeTeam.name, awayName: NEXT_KICKOFF.awayTeam.name,
  date: NEXT_KICKOFF.date,
} : null, null, 2)}

export const DATA_AS_OF = '${NOW}'
`)

console.log(`overview.js  대회 ${COMPETITION_OVERVIEW.length}건 · 라이브 펄스 ${LIVE_PULSE.length}건`)

// ── 2. 알림 (design-briefs/07-notifications.md) ────────────────
const liveM = MATCHES.filter(m => ['live','halftime'].includes(m.displayState))
const doneM = MATCHES.filter(m => m.displayState === 'confirmed')
const recheckM = MATCHES.filter(m => m.displayState === 'recheck')

const ago = min => new Date(Date.parse(NOW) - min*60000).toISOString()

const NOTIFICATIONS = [
  // 확정 알림 — 이 서비스만의 것. 경기 종료 몇 시간 뒤에 온다
  { id:'n01', type:'confirmed', read:false, at: ago(6),
    matchId: recheckM[0]?.id ?? null, competitionSlug: recheckM[0]?.competitionSlug ?? 'premier-league',
    title:'기록이 확정됐습니다',
    body: recheckM[0] ? `${recheckM[0].homeTeam.name} ${recheckM[0].score.home}-${recheckM[0].score.away} ${recheckM[0].awayTeam.name}` : '',
    detail:'어시스트 1건이 정정됐습니다' },

  { id:'n02', type:'goal', read:false, at: ago(9),
    matchId:'m010', competitionSlug:'champions-league',
    title:'골!', body:'바이에른 뮌헨 3 - 2 파리 생제르맹', detail:"78' 사네" },

  { id:'n03', type:'goal', read:false, at: ago(14),
    matchId:'m001', competitionSlug:'premier-league',
    title:'골!', body:'맨체스터 시티 2 - 1 아스날', detail:"62' 홀란" },

  { id:'n04', type:'kickoff', read:true, at: ago(38),
    matchId:'m023', competitionSlug:'ligue-1',
    title:'경기가 시작됐습니다', body:'올랭피크 리옹 vs AS 모나코', detail:'리그 1' },

  { id:'n05', type:'fulltime', read:true, at: ago(95),
    matchId: doneM[0]?.id ?? null, competitionSlug: doneM[0]?.competitionSlug ?? 'premier-league',
    title:'경기 종료', body: doneM[0] ? `${doneM[0].homeTeam.name} ${doneM[0].score.home}-${doneM[0].score.away} ${doneM[0].awayTeam.name}` : '',
    detail:'공식 기록 확정까지 시간이 걸립니다' },

  { id:'n06', type:'kickoff', read:true, at: ago(160),
    matchId:'m009', competitionSlug:'la-liga',
    title:'경기가 시작됐습니다', body:'레알 마드리드 vs FC 바르셀로나', detail:'라리가' },
]

/** 알림 설정 — 로그인이 없으므로 브라우저 단위다 */
const NOTIFICATION_SETTINGS = {
  permission: 'default',          // 'default' | 'granted' | 'denied' — 세 상태 모두 화면이 필요하다
  pushEnabled: false,
  teams: ['mancity', 'spurs'],
  competitions: ['premier-league', 'champions-league'],
  events: { kickoff: true, goal: true, fulltime: true, confirmed: true },
  deviceNote: '이 브라우저에서만 적용됩니다',
}

writeFileSync(`${SRC}/notifications.js`, `/**
 * Mock 알림
 * ⚠ scripts/genMockScreens.mjs 가 생성한다. 직접 수정하지 않는다.
 *
 * 종류 4가지 — kickoff · goal · fulltime · confirmed.
 * confirmed(기록 확정)가 이 서비스만의 알림이다. 경기 종료 몇 시간 뒤에 오므로
 * 골 알림과 시각적으로 구분해야 한다 (design-briefs/07-notifications.md).
 *
 * 로그인이 없어 설정은 브라우저 단위다. permission 세 상태
 * (default·granted·denied)를 화면이 모두 처리해야 한다.
 */

export const NOTIFICATIONS = ${JSON.stringify(NOTIFICATIONS, null, 2)}

export const NOTIFICATION_SETTINGS = ${JSON.stringify(NOTIFICATION_SETTINGS, null, 2)}

export function getUnreadCount() { return NOTIFICATIONS.filter(n => !n.read).length }
`)

console.log(`notifications.js  ${NOTIFICATIONS.length}건 (안 읽음 ${NOTIFICATIONS.filter(n=>!n.read).length})`)

// ── 3. AI 어시스턴트 (design-briefs/08-assistant.md) ───────────
// 원칙: AI는 숫자를 만들지 않는다. 답변에는 근거 카드·기준 시각·신뢰도 표기가 붙고
//       숫자는 문장이 아니라 데이터 카드로 렌더링한다.

const eplTop = STANDINGS['premier-league'].entries.slice(0, 5)
const m001 = MATCHES.find(m => m.id === 'm001')
const m001s = MATCH_TEAM_STATS['m001']
const rc = recheckM[0]

const SUGGESTED_QUESTIONS = [
  '손흥민 이번 시즌 기록 알려줘',
  '리버풀 다음 경기 언제야?',
  'EPL 상위 4팀 최근 5경기 비교해줘',
  '챔피언스리그 16강 올라간 팀은?',
]

const ASSISTANT_SAMPLES = [
  {
    id:'c1', question:'EPL 순위 알려줘',
    thinking:'순위표를 조회하는 중',
    answer:'프리미어리그 13라운드 진행 중입니다. 상위 5팀입니다.',
    cards:[{ type:'standings', competitionSlug:'premier-league',
      rows: eplTop.map(e => ({ rank:e.rank, teamName:e.teamName, teamInitials:e.teamInitials,
                               teamColor:e.teamColor, points:e.points, zone:e.zone })) }],
    evidence:{ tool:'순위 조회', args:'competition=premier-league, season=2026-27',
               asOf: STANDINGS['premier-league'].updatedAt, source:'API-Football → PitchLog DB' },
    dataStatus:'confirmed',
  },
  {
    id:'c2', question:'맨시티 아스날 경기 어때?',
    thinking:'경기 통계를 조회하는 중',
    answer:`현재 ${m001.score.home}-${m001.score.away}로 맨체스터 시티가 앞서고 있습니다. 다만 기대 득점은 아스날이 더 높습니다.`,
    cards:[
      { type:'match', matchId:'m001', homeName:m001.homeTeam.name, awayName:m001.awayTeam.name,
        homeScore:m001.score.home, awayScore:m001.score.away, minute:m001.minute, displayState:'live' },
      { type:'stats', rows:[
        ['점유율', `${m001s.home.ballPossession}%`, `${m001s.away.ballPossession}%`],
        ['슈팅', m001s.home.totalShots, m001s.away.totalShots],
        ['유효 슈팅', m001s.home.shotsOnGoal, m001s.away.shotsOnGoal],
        ['기대 득점 (xG)', m001s.home.expectedGoals, m001s.away.expectedGoals],
      ]},
    ],
    evidence:{ tool:'경기 통계 조회', args:'fixture=m001', asOf: NOW, source:'API-Football → PitchLog DB' },
    dataStatus:'live',
    note:'진행 중인 경기입니다. 숫자는 계속 바뀝니다.',
  },
  {
    // ★ 이 서비스의 존재 이유를 보여주는 답변
    id:'c3', question: rc ? `${rc.homeTeam.name} 어제 경기 결과는?` : '어제 경기 결과는?',
    thinking:'경기 기록을 조회하는 중',
    answer: rc
      ? `${rc.homeTeam.name} ${rc.score.home} - ${rc.score.away} ${rc.awayTeam.name} 입니다. 다만 이 경기는 공식 기록이 아직 확정되지 않았습니다.`
      : '',
    cards: rc ? [{ type:'match', matchId:rc.id, homeName:rc.homeTeam.name, awayName:rc.awayTeam.name,
                   homeScore:rc.score.home, awayScore:rc.score.away, displayState:'recheck' }] : [],
    evidence:{ tool:'경기 조회', args:`fixture=${rc?.id ?? ''}`, asOf: NOW, source:'API-Football → PitchLog DB' },
    dataStatus:'recheck',
    note:'재검증 중인 값이 포함돼 있습니다. 공식 기록이 확정되면 바뀔 수 있습니다.',
  },
  {
    id:'c4', question:'다음 시즌 우승 누가 할 것 같아?',
    thinking:null,
    answer:'예측은 하지 않습니다. 이 서비스는 조회된 기록만 다루고, 없는 숫자를 만들지 않습니다.',
    cards:[],
    evidence:null,
    dataStatus:'unanswerable',
    suggestions:['현재 순위 보기', '최근 5경기 폼 비교', '득점 순위 보기'],
  },
]

writeFileSync(`${SRC}/assistant.js`, `/**
 * Mock AI 어시스턴트 샘플 대화
 * ⚠ scripts/genMockScreens.mjs 가 생성한다. 직접 수정하지 않는다.
 *
 * 원칙 (V2_DESIGN 5-8 · design-briefs/08-assistant.md):
 *   AI는 숫자를 만들지 않는다. 답변에는 근거 카드·데이터 기준 시각·신뢰도 표기가
 *   반드시 붙고, 숫자는 문장이 아니라 데이터 카드로 렌더링한다.
 *
 * 샘플 4건이 각각 다른 상태를 보여준다:
 *   c1 confirmed    확정된 데이터
 *   c2 live         진행 중 — 숫자가 계속 바뀐다
 *   c3 recheck      재검증 중 ★ 이 서비스의 존재 이유를 보여주는 화면
 *   c4 unanswerable 조회 도구로 답할 수 없는 질문 — 예측하지 않는다
 */

export const SUGGESTED_QUESTIONS = ${JSON.stringify(SUGGESTED_QUESTIONS, null, 2)}

export const ASSISTANT_SAMPLES = ${JSON.stringify(ASSISTANT_SAMPLES, null, 2)}

export function getSample(id) { return ASSISTANT_SAMPLES.find(s => s.id === id) ?? null }
`)

console.log(`assistant.js  샘플 ${ASSISTANT_SAMPLES.length}건 · 예시 질문 ${SUGGESTED_QUESTIONS.length}개`)
