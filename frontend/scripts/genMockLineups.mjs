#!/usr/bin/env node
/**
 * Mock 라인업 + 선수 경기 통계 생성기
 *
 * LIVE 6경기에만 라인업을 넣는다. 나머지는 없다 — 이것도 현실이다.
 * 라인업은 킥오프 1시간 전 공개되고 과거 경기는 백필이 필요하다
 * (BACKEND_FEATURES #38). 화면은 "라인업 미공개"를 처리해야 한다.
 *
 * 생성: src/mocks/lineups.js
 * 실행: node scripts/genMockLineups.mjs
 */
import { writeFileSync } from 'fs'
import { pathToFileURL } from 'url'
import { resolve } from 'path'

const SRC = resolve('src/mocks')
const { MATCHES } = await import(pathToFileURL(`${SRC}/matches.js`))
const { MATCH_TEAM_STATS } = await import(pathToFileURL(`${SRC}/matchStats.js`))

function rng(seed) {
  let h = 2166136261
  for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000 }
}
const pick = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1))

// 형식: [등번호, 짧은 이름, 포지션]
const SQUADS = {
  mancity:{formation:'4-3-3',xi:[[31,'Ederson','GK'],[2,'Walker','DEF'],[3,'Rúben Dias','DEF'],[5,'Stones','DEF'],[24,'Gvardiol','DEF'],[16,'Rodri','MID'],[20,'Bernardo','MID'],[17,'De Bruyne','MID'],[47,'Foden','FWD'],[9,'Haaland','FWD'],[11,'Doku','FWD']],bench:[[18,'Ortega','GK'],[25,'Akanji','DEF'],[8,'Kovačić','MID'],[19,'Marmoush','FWD'],[52,'Bobb','MID']]},
  arsenal:{formation:'4-3-3',xi:[[22,'Raya','GK'],[4,'White','DEF'],[6,'Gabriel','DEF'],[2,'Saliba','DEF'],[35,'Zinchenko','DEF'],[5,'Partey','MID'],[8,'Ødegaard','MID'],[41,'Rice','MID'],[7,'Saka','FWD'],[29,'Havertz','FWD'],[11,'Martinelli','FWD']],bench:[[32,'Setford','GK'],[15,'Kiwior','DEF'],[20,'Jorginho','MID'],[19,'Trossard','FWD'],[24,'Nelson','FWD']]},
  realmadrid:{formation:'4-3-1-2',xi:[[1,'Courtois','GK'],[2,'Carvajal','DEF'],[3,'Militão','DEF'],[22,'Rüdiger','DEF'],[23,'Mendy','DEF'],[8,'Valverde','MID'],[18,'Tchouaméni','MID'],[6,'Camavinga','MID'],[10,'Bellingham','MID'],[7,'Vinícius Jr','FWD'],[9,'Mbappé','FWD']],bench:[[13,'Lunin','GK'],[4,'Alaba','DEF'],[15,'Güler','MID'],[11,'Rodrygo','FWD'],[16,'Endrick','FWD']]},
  barca:{formation:'4-3-3',xi:[[1,'Ter Stegen','GK'],[23,'Koundé','DEF'],[4,'Araújo','DEF'],[5,'Íñigo','DEF'],[3,'Balde','DEF'],[21,'De Jong','MID'],[8,'Pedri','MID'],[6,'Gavi','MID'],[27,'Yamal','FWD'],[9,'Lewandowski','FWD'],[11,'Raphinha','FWD']],bench:[[13,'Peña','GK'],[15,'Christensen','DEF'],[20,'Olmo','MID'],[7,'Ferran','FWD'],[16,'Fermín','MID']]},
  dortmund:{formation:'4-2-3-1',xi:[[1,'Kobel','GK'],[26,'Ryerson','DEF'],[4,'Schlotterbeck','DEF'],[25,'Süle','DEF'],[5,'Bensebaini','DEF'],[23,'Emre Can','MID'],[20,'Sabitzer','MID'],[19,'Brandt','MID'],[7,'Adeyemi','MID'],[43,'Gittens','FWD'],[14,'Guirassy','FWD']],bench:[[33,'Meyer','GK'],[2,'Wolf','DEF'],[27,'Beier','FWD'],[10,'Reyna','MID'],[24,'Duranville','FWD']]},
  leverkusen:{formation:'3-4-3',xi:[[1,'Hrádecký','GK'],[12,'Tapsoba','DEF'],[4,'Tah','DEF'],[3,'Hincapié','DEF'],[30,'Frimpong','MID'],[8,'Andrich','MID'],[25,'Palacios','MID'],[20,'Grimaldo','MID'],[10,'Wirtz','FWD'],[14,'Schick','FWD'],[22,'Boniface','FWD']],bench:[[17,'Kovář','GK'],[2,'Arthur','DEF'],[19,'Adli','MID'],[7,'Hofmann','FWD'],[11,'Tella','FWD']]},
  napoli:{formation:'4-3-3',xi:[[1,'Meret','GK'],[22,'Di Lorenzo','DEF'],[13,'Rrahmani','DEF'],[5,'Juan Jesus','DEF'],[17,'Olivera','DEF'],[99,'Anguissa','MID'],[68,'Lobotka','MID'],[8,'McTominay','MID'],[21,'Politano','FWD'],[11,'Lukaku','FWD'],[81,'Raspadori','FWD']],bench:[[16,'Contini','GK'],[6,'Mazzocchi','DEF'],[70,'Gaetano','MID'],[18,'Simeone','FWD'],[7,'Neres','FWD']]},
  roma:{formation:'3-5-2',xi:[[99,'Svilar','GK'],[23,'Mancini','DEF'],[5,'Ndicka','DEF'],[14,'Hermoso','DEF'],[59,'Zalewski','MID'],[7,'Pellegrini','MID'],[4,'Cristante','MID'],[61,'Pisilli','MID'],[37,'Spinazzola','MID'],[21,'Dybala','FWD'],[11,'Dovbyk','FWD']],bench:[[1,'Ryan','GK'],[19,'Çelik','DEF'],[52,'Bove','MID'],[92,'El Shaarawy','FWD'],[64,'Baldanzi','FWD']]},
  lyon:{formation:'4-2-3-1',xi:[[1,'Perri','GK'],[27,'Maitland-Niles','DEF'],[3,'Mata','DEF'],[5,'Caleta-Car','DEF'],[21,'Tagliafico','DEF'],[6,'Matić','MID'],[8,'Tolisso','MID'],[18,'Cherki','MID'],[24,'Nuamah','MID'],[11,'Fofana','FWD'],[10,'Lacazette','FWD']],bench:[[30,'Descamps','GK'],[12,'Kumbedi','DEF'],[17,'Veretout','MID'],[9,'Mikautadze','FWD'],[7,'Benrahma','FWD']]},
  monaco:{formation:'4-4-2',xi:[[16,'Köhn','GK'],[2,'Vanderson','DEF'],[5,'Salisu','DEF'],[4,'Kehrer','DEF'],[26,'Caio Henrique','DEF'],[17,'Akliouche','MID'],[8,'Camara','MID'],[22,'Zakaria','MID'],[7,'Golovin','MID'],[77,'Embolo','FWD'],[9,'Ben Yedder','FWD']],bench:[[1,'Majecki','GK'],[3,'Singo','DEF'],[18,'Minamino','MID'],[11,'Balogun','FWD'],[27,'Ilenikhena','FWD']]},
  bayern:{formation:'4-2-3-1',xi:[[1,'Neuer','GK'],[27,'Laimer','DEF'],[2,'Upamecano','DEF'],[3,'Kim','DEF'],[19,'Davies','DEF'],[6,'Kimmich','MID'],[45,'Pavlović','MID'],[42,'Musiala','MID'],[7,'Gnabry','MID'],[17,'Olise','FWD'],[9,'Kane','FWD']],bench:[[26,'Ulreich','GK'],[44,'Stanišić','DEF'],[8,'Goretzka','MID'],[11,'Coman','FWD'],[39,'Tel','FWD']]},
  psg:{formation:'4-3-3',xi:[[99,'Donnarumma','GK'],[2,'Hakimi','DEF'],[5,'Marquinhos','DEF'],[51,'Pacho','DEF'],[25,'Mendes','DEF'],[8,'Fabián Ruiz','MID'],[87,'João Neves','MID'],[17,'Vitinha','MID'],[10,'Dembélé','FWD'],[9,'Ramos','FWD'],[29,'Barcola','FWD']],bench:[[80,'Safonov','GK'],[35,'Beraldo','DEF'],[33,'Zaïre-Emery','MID'],[23,'Kolo Muani','FWD'],[14,'Doué','FWD']]},
}

const TEAM_KEY = {
  'Manchester City':'mancity','Arsenal':'arsenal','Real Madrid':'realmadrid','FC Barcelona':'barca',
  'Borussia Dortmund':'dortmund','Bayer Leverkusen':'leverkusen','SSC Napoli':'napoli','AS Roma':'roma',
  'Olympique Lyonnais':'lyon','AS Monaco':'monaco','FC Bayern München':'bayern','Paris Saint-Germain':'psg',
}

/** 포지션별 통계 성향 — GK와 FWD 지표가 같으면 안 된다 */
function playerStats(r, pos, minute, goalCount, assistCount) {
  const played = Math.min(90, minute)
  const s = {
    games:{ minutes:played, number:null, position:pos, rating:null, captain:false, substitute:false },
    offsides:null,
    shots:{ total:0, on:0 },
    goals:{ total:goalCount, conceded:0, assists:assistCount, saves:null },
    passes:{ total:pick(r,18,72), key:0, accuracy:pick(r,66,94) },
    tackles:{ total:pick(r,0,5), blocks:pick(r,0,2), interceptions:pick(r,0,4) },
    duels:{ total:pick(r,4,22), won:0 },
    dribbles:{ attempts:pick(r,0,8), success:0, past:pick(r,0,3) },
    fouls:{ drawn:pick(r,0,4), committed:pick(r,0,4) },
    cards:{ yellow:r()>0.85?1:0, red:0 },
    penalty:{ won:0, commited:0, scored:0, missed:0, saved:0 },
  }
  s.duels.won = Math.round(s.duels.total * (0.35 + r()*0.35))
  s.dribbles.success = Math.round(s.dribbles.attempts * (0.3 + r()*0.5))
  if (pos === 'GK') {
    s.goals.saves = pick(r,1,7); s.passes.total = pick(r,20,45)
    s.duels.total = pick(r,0,3); s.duels.won = pick(r,0,s.duels.total)
    s.dribbles = { attempts:0, success:0, past:0 }
  } else if (pos === 'FWD') {
    s.shots.total = pick(r, goalCount ? goalCount+1 : 0, 7)
    s.shots.on = Math.max(goalCount, Math.round(s.shots.total*(0.3+r()*0.4)))
    s.passes.key = pick(r,0,5)
  } else if (pos === 'MID') {
    s.shots.total = pick(r,0,4); s.shots.on = Math.round(s.shots.total*(0.2+r()*0.5))
    s.passes.key = pick(r,0,4); s.passes.total = pick(r,35,95)
  } else {
    s.shots.total = pick(r,0,2); s.shots.on = Math.min(s.shots.total, pick(r,0,1))
    s.passes.key = pick(r,0,2); s.passes.total = pick(r,30,85)
  }
  // 골은 유효 슈팅의 부분집합이다 — 포지션과 무관하게 보장한다
  if (goalCount > 0) {
    s.shots.total = Math.max(s.shots.total, goalCount + 1)
    s.shots.on    = Math.max(s.shots.on, goalCount)
    if (s.shots.on > s.shots.total) s.shots.total = s.shots.on
  }
  s.passes.accuracy = Math.min(99, s.passes.accuracy)
  const rt = 6.4 + goalCount*1.1 + assistCount*0.5
    + (s.duels.total ? (s.duels.won/s.duels.total - 0.5) : 0)
    + (s.passes.key * 0.08) + (r()*0.6 - 0.3)
  s.games.rating = Math.round(Math.min(9.3, Math.max(5.4, rt)) * 10) / 10
  return s
}

const LINEUPS = {}, MATCH_PLAYER_STATS = {}
let n = 0

for (const m of MATCHES) {
  if (!['live','halftime'].includes(m.displayState)) continue
  const lu = {}, ps = []
  let ok = true
  for (const [side, team] of [['home', m.homeTeam], ['away', m.awayTeam]]) {
    const sq = SQUADS[TEAM_KEY[team.name]]
    if (!sq) { ok = false; break }
    const ev = (m.events||[]).filter(e => e.type==='goal' && e.team===side)
    const goalsBy = {}, assistsBy = {}
    for (const e of ev) {
      goalsBy[e.playerName] = (goalsBy[e.playerName] ?? 0) + 1
      if (e.assistName) assistsBy[e.assistName] = (assistsBy[e.assistName] ?? 0) + 1
    }
    // 경기 이벤트에 나온 선수는 반드시 선발에 있어야 한다.
    // 스쿼드 명단에 없으면 같은 성향의 자리를 내준다 (득점자→FWD, 도움→MID).
    const xi = sq.xi.map(([num,name,pos]) => [num, name, pos])
    const involved = [...new Set([...Object.keys(goalsBy), ...Object.keys(assistsBy)])]
    // 이미 쓰인 번호를 피해서 배정한다
    const usedNums = new Set([...sq.xi, ...sq.bench].map(([n2]) => n2))
    const nextNum = () => { let v = 60; while (usedNums.has(v)) v++; usedNums.add(v); return v }
    for (const who of involved) {
      if (xi.some(([, n2]) => n2 === who)) continue
      const wantPos = goalsBy[who] ? 'FWD' : 'MID'
      // 이벤트에 안 나온 같은 포지션 선수를 찾아 교체
      let idx = xi.findIndex(([, n2, p2]) => p2 === wantPos && !involved.includes(n2))
      if (idx < 0) idx = xi.findIndex(([, n2, p2]) => p2 !== 'GK' && !involved.includes(n2))
      if (idx < 0) continue
      xi[idx] = [nextNum(), who, wantPos]
    }
    lu[side] = {
      teamId: team.id, teamName: team.name, formation: sq.formation,
      startingXI: xi.map(([num,name,pos],i)=>({ number:num, name, position:pos, isCaptain:i===9 })),
      substitutes: sq.bench.map(([num,name,pos])=>({ number:num, name, position:pos })),
    }
    for (const [num,name,pos] of xi) {
      const st = playerStats(rng(m.id+side+name), pos, m.minute ?? 90,
                             goalsBy[name] ?? 0, assistsBy[name] ?? 0)
      st.games.number = num
      st.games.captain = xi[9][1] === name
      ps.push({ matchId:m.id, teamId:team.id, side, name, position:pos, statistics:st })
    }
  }
  // GK 선방·실점을 팀 통계와 맞춘다 — 두 소스가 어긋나면 안 된다
  const ts = MATCH_TEAM_STATS[m.id]
  if (ts) {
    for (const p of ps) {
      if (p.position !== 'GK') continue
      const opp = p.side === 'home' ? 'away' : 'home'
      p.statistics.goals.saves    = ts[p.side].goalkeeperSaves
      p.statistics.goals.conceded = m.score?.[opp] ?? 0
    }
  }
  if (!ok) continue
  LINEUPS[m.id] = lu
  MATCH_PLAYER_STATS[m.id] = ps
  n++
}

const head = `/**
 * Mock 라인업 + 선수 경기 통계
 * ⚠ scripts/genMockLineups.mjs 가 생성한다. 직접 수정하지 않는다.
 *
 * LIVE 경기에만 라인업이 있다. 나머지는 없다 — 이것도 현실이다.
 * 라인업은 킥오프 1시간 전 공개되고 과거 경기는 백필이 필요하다
 * (BACKEND_FEATURES #38). 화면은 "라인업 미공개"를 처리해야 한다.
 *
 * 선수 통계는 docs/API_FIELDS.md 2장(/fixtures/players) 구조를 따른다.
 * ⚠ offsides 와 GK 외 saves 는 null 이다 — 실제 API 동작.
 */

`

writeFileSync(`${SRC}/lineups.js`, head +
`export const LINEUPS = ${JSON.stringify(LINEUPS, null, 2)}

export const MATCH_PLAYER_STATS = ${JSON.stringify(MATCH_PLAYER_STATS, null, 2)}

/** 경기 라인업. 없으면 null — 화면은 "라인업 미공개"를 표시한다 */
export function getLineup(matchId) { return LINEUPS[matchId] ?? null }

/** 경기별 선수 통계. 없으면 빈 배열 */
export function getMatchPlayerStats(matchId) { return MATCH_PLAYER_STATS[matchId] ?? [] }

/** 평점 상위 N명 — 경기 상세의 "이 경기 최고 선수" */
export function getTopRated(matchId, limit = 3) {
  return getMatchPlayerStats(matchId).slice()
    .sort((a, b) => (b.statistics.games.rating ?? 0) - (a.statistics.games.rating ?? 0))
    .slice(0, limit)
}
`)

console.log(`lineups.js  경기 ${n}건 · 선수 ${Object.values(MATCH_PLAYER_STATS).flat().length}명`)
