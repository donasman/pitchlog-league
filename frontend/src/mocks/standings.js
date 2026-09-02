/**
 * Mock 순위 데이터
 * 백엔드 연결 전 화면 검증용. 실제 서비스 데이터가 아닙니다.
 * 기준 시점: 2026-11-23 (발표용 고정 기준일)
 * 승점 = 승×3 + 무 / 득실차 = 득점 - 실점 / 승점·득실차 기준 정렬
 */

export const STANDINGS = {
  // ──────────────────────────────────────────────────────────────
  // Premier League — Matchweek 13 진행 중 (MW12까지 완료)
  // ──────────────────────────────────────────────────────────────
  'premier-league': {
    competitionId: 'epl',
    seasonId: '2026-27',
    stage: { label: 'Matchweek 13', status: 'ongoing' },
    updatedAt: '2026-11-10T23:15:00Z',
    entries: [
      { rank:1,  teamId:'mancity',      teamSlug:'manchester-city',   teamName:'Manchester City',    teamInitials:'MC',  teamColor:'#6CABDD', played:12, won:9, drawn:2, lost:1, goalsFor:32, goalsAgainst:14, goalDifference:18,  points:29, form:['W','W','D','W','W'], zone:'champions_league' },
      { rank:2,  teamId:'arsenal',      teamSlug:'arsenal',           teamName:'Arsenal',            teamInitials:'ARS', teamColor:'#EF0107', played:12, won:8, drawn:3, lost:1, goalsFor:27, goalsAgainst:12, goalDifference:15,  points:27, form:['W','D','W','W','D'], zone:'champions_league' },
      { rank:3,  teamId:'liverpool',    teamSlug:'liverpool',         teamName:'Liverpool',          teamInitials:'LIV', teamColor:'#C8102E', played:12, won:8, drawn:2, lost:2, goalsFor:29, goalsAgainst:16, goalDifference:13,  points:26, form:['W','W','L','W','W'], zone:'champions_league' },
      { rank:4,  teamId:'chelsea',      teamSlug:'chelsea',           teamName:'Chelsea',            teamInitials:'CHE', teamColor:'#034694', played:12, won:7, drawn:3, lost:2, goalsFor:24, goalsAgainst:15, goalDifference:9,   points:24, form:['D','W','W','D','W'], zone:'champions_league' },
      { rank:5,  teamId:'newcastle',    teamSlug:'newcastle',         teamName:'Newcastle United',   teamInitials:'NEW', teamColor:'#241F20', played:12, won:6, drawn:4, lost:2, goalsFor:22, goalsAgainst:14, goalDifference:8,   points:22, form:['W','D','W','D','W'], zone:'europa_league' },
      { rank:6,  teamId:'spurs',        teamSlug:'tottenham',         teamName:'Tottenham Hotspur',  teamInitials:'TOT', teamColor:'#132257', played:12, won:6, drawn:3, lost:3, goalsFor:20, goalsAgainst:17, goalDifference:3,   points:21, form:['W','L','W','W','D'], zone:'europa_league' },
      { rank:7,  teamId:'astonvilla',   teamSlug:'aston-villa',       teamName:'Aston Villa',        teamInitials:'AVL', teamColor:'#670E36', played:12, won:5, drawn:4, lost:3, goalsFor:18, goalsAgainst:16, goalDifference:2,   points:19, form:['D','W','D','L','W'], zone:'europa_conference' },
      { rank:8,  teamId:'nottmforest',  teamSlug:'nottm-forest',      teamName:"Nottingham Forest",  teamInitials:'NFO', teamColor:'#DD0000', played:12, won:5, drawn:3, lost:4, goalsFor:16, goalsAgainst:16, goalDifference:0,   points:18, form:['W','L','D','W','L'], zone:'none' },
      { rank:9,  teamId:'brighton',     teamSlug:'brighton',          teamName:'Brighton',           teamInitials:'BHA', teamColor:'#0057B8', played:12, won:5, drawn:2, lost:5, goalsFor:19, goalsAgainst:20, goalDifference:-1,  points:17, form:['L','W','W','D','L'], zone:'none' },
      { rank:10, teamId:'fulham',       teamSlug:'fulham',            teamName:'Fulham',             teamInitials:'FUL', teamColor:'#CC0000', played:12, won:4, drawn:4, lost:4, goalsFor:14, goalsAgainst:17, goalDifference:-3,  points:16, form:['D','D','L','W','W'], zone:'none' },
      { rank:11, teamId:'manutd',       teamSlug:'manchester-united', teamName:'Manchester United',  teamInitials:'MU',  teamColor:'#DA291C', played:12, won:4, drawn:3, lost:5, goalsFor:15, goalsAgainst:19, goalDifference:-4,  points:15, form:['L','W','D','L','W'], zone:'none' },
      { rank:12, teamId:'westham',      teamSlug:'west-ham',          teamName:'West Ham United',    teamInitials:'WHU', teamColor:'#7A263A', played:12, won:4, drawn:2, lost:6, goalsFor:14, goalsAgainst:22, goalDifference:-8,  points:14, form:['L','W','L','W','L'], zone:'none' },
      { rank:13, teamId:'bournemouth',  teamSlug:'bournemouth',       teamName:'AFC Bournemouth',    teamInitials:'BOU', teamColor:'#DA291C', played:12, won:4, drawn:2, lost:6, goalsFor:13, goalsAgainst:21, goalDifference:-8,  points:14, form:['L','D','L','W','L'], zone:'none' },
      { rank:14, teamId:'wolves',       teamSlug:'wolverhampton',     teamName:'Wolverhampton',      teamInitials:'WOL', teamColor:'#FDB913', played:12, won:3, drawn:4, lost:5, goalsFor:12, goalsAgainst:19, goalDifference:-7,  points:13, form:['D','D','L','W','D'], zone:'none' },
      { rank:15, teamId:'crystalpalace',teamSlug:'crystal-palace',    teamName:'Crystal Palace',     teamInitials:'CRY', teamColor:'#1B458F', played:12, won:3, drawn:3, lost:6, goalsFor:12, goalsAgainst:21, goalDifference:-9,  points:12, form:['L','W','D','L','L'], zone:'none' },
      { rank:16, teamId:'brentford',    teamSlug:'brentford',         teamName:'Brentford',          teamInitials:'BRE', teamColor:'#D20000', played:12, won:3, drawn:3, lost:6, goalsFor:11, goalsAgainst:20, goalDifference:-9,  points:12, form:['L','D','L','W','L'], zone:'none' },
      { rank:17, teamId:'everton',      teamSlug:'everton',           teamName:'Everton',            teamInitials:'EVE', teamColor:'#003399', played:12, won:3, drawn:2, lost:7, goalsFor:10, goalsAgainst:23, goalDifference:-13, points:11, form:['L','L','W','D','L'], zone:'relegation_playoff' },
      { rank:18, teamId:'leicester',    teamSlug:'leicester',         teamName:'Leicester City',     teamInitials:'LEI', teamColor:'#003090', played:12, won:2, drawn:3, lost:7, goalsFor:12, goalsAgainst:26, goalDifference:-14, points:9,  form:['L','D','L','L','W'], zone:'relegation' },
      { rank:19, teamId:'ipswich',      teamSlug:'ipswich',           teamName:'Ipswich Town',       teamInitials:'IPS', teamColor:'#3A64A3', played:12, won:1, drawn:3, lost:8, goalsFor:9,  goalsAgainst:28, goalDifference:-19, points:6,  form:['L','L','D','L','L'], zone:'relegation' },
      { rank:20, teamId:'southampton',  teamSlug:'southampton',       teamName:'Southampton',        teamInitials:'SOU', teamColor:'#D71920', played:12, won:1, drawn:2, lost:9, goalsFor:8,  goalsAgainst:30, goalDifference:-22, points:5,  form:['L','L','L','D','L'], zone:'relegation' },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // UEFA Champions League — League Phase MD4 완료
  // UCL 구역: 1~8위 16강 직행, 9~24위 플레이오프, 25위~ 탈락
  // ──────────────────────────────────────────────────────────────
  'champions-league': {
    competitionId: 'ucl',
    seasonId: '2026-27',
    stage: { label: 'League Phase — Matchday 4', status: 'completed' },
    updatedAt: '2026-11-23T22:00:00Z',
    entries: [
      { rank:1,  teamId:'mancity',     teamSlug:'manchester-city',    teamName:'Man City',   teamInitials:'MC',  teamColor:'#6CABDD', played:4, won:4, drawn:0, lost:0, goalsFor:12, goalsAgainst:3,  goalDifference:9,  points:12, form:['W','W','W','W'], zone:'ucl_direct' },
      { rank:2,  teamId:'realmadrid',  teamSlug:'real-madrid',        teamName:'Real Madrid',teamInitials:'RMA', teamColor:'#FEBE10', played:4, won:3, drawn:1, lost:0, goalsFor:9,  goalsAgainst:4,  goalDifference:5,  points:10, form:['W','D','W','W'], zone:'ucl_direct' },
      { rank:3,  teamId:'arsenal',     teamSlug:'arsenal',            teamName:'Arsenal',    teamInitials:'ARS', teamColor:'#EF0107', played:4, won:3, drawn:0, lost:1, goalsFor:8,  goalsAgainst:5,  goalDifference:3,  points:9,  form:['W','W','L','W'], zone:'ucl_direct' },
      { rank:4,  teamId:'barca',       teamSlug:'barcelona',          teamName:'Barcelona',  teamInitials:'FCB', teamColor:'#004D98', played:4, won:3, drawn:0, lost:1, goalsFor:7,  goalsAgainst:4,  goalDifference:3,  points:9,  form:['W','L','W','W'], zone:'ucl_direct' },
      { rank:5,  teamId:'bayernmunich',teamSlug:'bayern-munich',      teamName:'Bayern',     teamInitials:'BAY', teamColor:'#DC052D', played:4, won:2, drawn:2, lost:0, goalsFor:7,  goalsAgainst:4,  goalDifference:3,  points:8,  form:['D','W','W','D'], zone:'ucl_direct' },
      { rank:6,  teamId:'liverpool',   teamSlug:'liverpool',          teamName:'Liverpool',  teamInitials:'LIV', teamColor:'#C8102E', played:4, won:2, drawn:1, lost:1, goalsFor:6,  goalsAgainst:5,  goalDifference:1,  points:7,  form:['W','D','W','L'], zone:'ucl_direct' },
      { rank:7,  teamId:'chelsea',     teamSlug:'chelsea',            teamName:'Chelsea',    teamInitials:'CHE', teamColor:'#034694', played:4, won:2, drawn:1, lost:1, goalsFor:5,  goalsAgainst:4,  goalDifference:1,  points:7,  form:['W','L','D','W'], zone:'ucl_direct' },
      { rank:8,  teamId:'dortmund',    teamSlug:'borussia-dortmund',  teamName:'Dortmund',   teamInitials:'BVB', teamColor:'#FDE100', played:4, won:2, drawn:0, lost:2, goalsFor:6,  goalsAgainst:7,  goalDifference:-1, points:6,  form:['W','L','W','L'], zone:'ucl_direct' },
      { rank:9,  teamId:'inter',       teamSlug:'inter-milan',        teamName:'Inter Milan',teamInitials:'INT', teamColor:'#0068A8', played:4, won:1, drawn:2, lost:1, goalsFor:5,  goalsAgainst:6,  goalDifference:-1, points:5,  form:['D','W','L','D'], zone:'ucl_playoff' },
      { rank:10, teamId:'psg',         teamSlug:'paris-saint-germain',teamName:'PSG',        teamInitials:'PSG', teamColor:'#004170', played:4, won:1, drawn:1, lost:2, goalsFor:5,  goalsAgainst:7,  goalDifference:-2, points:4,  form:['L','W','D','L'], zone:'ucl_playoff' },
      { rank:11, teamId:'atletico',    teamSlug:'atletico-madrid',    teamName:'Atlético',   teamInitials:'ATM', teamColor:'#CB3524', played:4, won:1, drawn:1, lost:2, goalsFor:4,  goalsAgainst:6,  goalDifference:-2, points:4,  form:['L','D','W','L'], zone:'ucl_playoff' },
      { rank:12, teamId:'juventus',    teamSlug:'juventus',           teamName:'Juventus',   teamInitials:'JUV', teamColor:'#111827', played:4, won:1, drawn:0, lost:3, goalsFor:3,  goalsAgainst:7,  goalDifference:-4, points:3,  form:['L','W','L','L'], zone:'ucl_eliminated' },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // La Liga — Jornada 13 진행 중
  // ──────────────────────────────────────────────────────────────
  'la-liga': {
    competitionId:'laliga', seasonId:'2026-27', stage:{ label:'Jornada 13', status:'ongoing' }, updatedAt:'2026-11-09T23:00:00Z',
    entries:[
      { rank:1, teamId:'realmadrid', teamSlug:'real-madrid',         teamName:'Real Madrid',    teamInitials:'RMA', teamColor:'#FEBE10', played:12, won:10, drawn:2, lost:0, goalsFor:34, goalsAgainst:10, goalDifference:24, points:32, form:['W','W','D','W','W'], zone:'champions_league' },
      { rank:2, teamId:'barca',      teamSlug:'barcelona',           teamName:'FC Barcelona',   teamInitials:'FCB', teamColor:'#004D98', played:12, won:9,  drawn:2, lost:1, goalsFor:31, goalsAgainst:12, goalDifference:19, points:29, form:['W','D','W','W','L'], zone:'champions_league' },
      { rank:3, teamId:'atletico',   teamSlug:'atletico-madrid',     teamName:'Atlético Madrid',teamInitials:'ATM', teamColor:'#CB3524', played:12, won:8,  drawn:3, lost:1, goalsFor:22, goalsAgainst:11, goalDifference:11, points:27, form:['W','W','D','W','D'], zone:'champions_league' },
      { rank:4, teamId:'bilbao',     teamSlug:'athletic-bilbao',     teamName:'Athletic Club',  teamInitials:'ATH', teamColor:'#EE2523', played:12, won:5,  drawn:4, lost:3, goalsFor:17, goalsAgainst:16, goalDifference:1,  points:19, form:['D','L','W','D','W'], zone:'europa_league'      },
      { rank:5, teamId:'villarreal', teamSlug:'villarreal',          teamName:'Villarreal CF',  teamInitials:'VIL', teamColor:'#F5E642', played:12, won:5,  drawn:3, lost:4, goalsFor:15, goalsAgainst:18, goalDifference:-3, points:18, form:['L','W','D','L','W'], zone:'none'               },
      { rank:6, teamId:'girona',     teamSlug:'girona',              teamName:'Girona FC',      teamInitials:'GIR', teamColor:'#9B1414', played:12, won:5,  drawn:2, lost:5, goalsFor:16, goalsAgainst:19, goalDifference:-3, points:17, form:['W','L','W','D','L'], zone:'none'               },
      { rank:7, teamId:'betis',      teamSlug:'real-betis',          teamName:'Real Betis',     teamInitials:'BET', teamColor:'#00A550', played:12, won:4,  drawn:4, lost:4, goalsFor:14, goalsAgainst:17, goalDifference:-3, points:16, form:['D','W','D','L','W'], zone:'none'               },
      { rank:8, teamId:'sociedad',   teamSlug:'real-sociedad',       teamName:'Real Sociedad',  teamInitials:'RSO', teamColor:'#003F91', played:12, won:4,  drawn:3, lost:5, goalsFor:12, goalsAgainst:19, goalDifference:-7, points:15, form:['L','D','W','L','D'], zone:'none'               },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Bundesliga — Spieltag 11 완료
  // ──────────────────────────────────────────────────────────────
  'bundesliga': {
    competitionId:'bundesliga', seasonId:'2026-27', stage:{ label:'Spieltag 11', status:'completed' }, updatedAt:'2026-11-09T22:00:00Z',
    entries:[
      { rank:1, teamId:'bayernmunich',teamSlug:'bayern-munich',      teamName:'Bayern München', teamInitials:'BAY', teamColor:'#DC052D', played:11, won:8, drawn:2, lost:1, goalsFor:30, goalsAgainst:10, goalDifference:20, points:26, form:['W','D','W','W','W'], zone:'champions_league' },
      { rank:2, teamId:'dortmund',    teamSlug:'borussia-dortmund',  teamName:'B. Dortmund',    teamInitials:'BVB', teamColor:'#FDE100', played:11, won:7, drawn:2, lost:2, goalsFor:24, goalsAgainst:14, goalDifference:10, points:23, form:['W','W','L','W','D'], zone:'champions_league' },
      { rank:3, teamId:'leverkusen',  teamSlug:'bayer-leverkusen',   teamName:'Bayer Leverkusen',teamInitials:'LEV',teamColor:'#E32221', played:11, won:6, drawn:3, lost:2, goalsFor:22, goalsAgainst:13, goalDifference:9,  points:21, form:['D','W','W','D','W'], zone:'champions_league' },
      { rank:4, teamId:'frankfurt',   teamSlug:'eintracht-frankfurt',teamName:'E. Frankfurt',   teamInitials:'SGE', teamColor:'#000000', played:11, won:5, drawn:2, lost:4, goalsFor:17, goalsAgainst:18, goalDifference:-1, points:17, form:['L','W','D','L','W'], zone:'europa_league'      },
      { rank:5, teamId:'freiburg',    teamSlug:'freiburg',           teamName:'SC Freiburg',    teamInitials:'SCF', teamColor:'#CC0000', played:11, won:4, drawn:3, lost:4, goalsFor:14, goalsAgainst:15, goalDifference:-1, points:15, form:['D','D','L','W','W'], zone:'none'               },
      { rank:6, teamId:'leipzig',     teamSlug:'rb-leipzig',         teamName:'RB Leipzig',     teamInitials:'RBL', teamColor:'#DD0741', played:11, won:4, drawn:2, lost:5, goalsFor:15, goalsAgainst:18, goalDifference:-3, points:14, form:['L','W','D','L','W'], zone:'none'               },
      { rank:7, teamId:'stuttgart',   teamSlug:'vfb-stuttgart',      teamName:'VfB Stuttgart',  teamInitials:'VFB', teamColor:'#E32221', played:11, won:4, drawn:1, lost:6, goalsFor:13, goalsAgainst:18, goalDifference:-5, points:13, form:['L','W','L','D','W'], zone:'none'               },
      { rank:8, teamId:'wolfsburg',   teamSlug:'wolfsburg',          teamName:'VfL Wolfsburg',  teamInitials:'WOB', teamColor:'#65B32E', played:11, won:3, drawn:3, lost:5, goalsFor:10, goalsAgainst:17, goalDifference:-7, points:12, form:['D','L','W','D','L'], zone:'none'               },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Serie A — Giornata 12 완료
  // ──────────────────────────────────────────────────────────────
  'serie-a': {
    competitionId:'seriea', seasonId:'2026-27', stage:{ label:'Giornata 12', status:'completed' }, updatedAt:'2026-11-09T22:30:00Z',
    entries:[
      { rank:1, teamId:'inter',       teamSlug:'inter-milan',        teamName:'Inter Milan',    teamInitials:'INT', teamColor:'#0068A8', played:12, won:9, drawn:2, lost:1, goalsFor:28, goalsAgainst:9,  goalDifference:19, points:29, form:['W','W','D','W','W'], zone:'champions_league' },
      { rank:2, teamId:'napoli',      teamSlug:'napoli',             teamName:'SSC Napoli',     teamInitials:'NAP', teamColor:'#12A0D7', played:12, won:8, drawn:2, lost:2, goalsFor:24, goalsAgainst:11, goalDifference:13, points:26, form:['W','D','W','W','W'], zone:'champions_league' },
      { rank:3, teamId:'juventus',    teamSlug:'juventus',           teamName:'Juventus',       teamInitials:'JUV', teamColor:'#111827', played:12, won:7, drawn:3, lost:2, goalsFor:20, goalsAgainst:10, goalDifference:10, points:24, form:['W','W','D','W','D'], zone:'champions_league' },
      { rank:4, teamId:'milan',       teamSlug:'ac-milan',           teamName:'AC Milan',       teamInitials:'MIL', teamColor:'#FB090B', played:12, won:6, drawn:2, lost:4, goalsFor:18, goalsAgainst:16, goalDifference:2,  points:20, form:['L','L','W','W','D'], zone:'europa_league'      },
      { rank:5, teamId:'roma',        teamSlug:'as-roma',            teamName:'AS Roma',        teamInitials:'ROM', teamColor:'#8B0000', played:12, won:5, drawn:3, lost:4, goalsFor:16, goalsAgainst:17, goalDifference:-1, points:18, form:['D','W','L','D','W'], zone:'none'               },
      { rank:6, teamId:'lazio',       teamSlug:'ss-lazio',           teamName:'SS Lazio',       teamInitials:'LAZ', teamColor:'#87CEEB', played:12, won:5, drawn:2, lost:5, goalsFor:17, goalsAgainst:18, goalDifference:-1, points:17, form:['W','D','L','W','L'], zone:'none'               },
      { rank:7, teamId:'atalanta',    teamSlug:'atalanta',           teamName:'Atalanta BC',    teamInitials:'ATA', teamColor:'#1E3A5F', played:12, won:4, drawn:4, lost:4, goalsFor:16, goalsAgainst:18, goalDifference:-2, points:16, form:['D','W','D','L','W'], zone:'none'               },
      { rank:8, teamId:'fiorentina',  teamSlug:'fiorentina',         teamName:'Fiorentina',     teamInitials:'FIO', teamColor:'#6B0DA0', played:12, won:4, drawn:3, lost:5, goalsFor:14, goalsAgainst:17, goalDifference:-3, points:15, form:['L','W','D','L','W'], zone:'none'               },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Ligue 1 — Journée 12 완료
  // ──────────────────────────────────────────────────────────────
  'ligue-1': {
    competitionId:'ligue1', seasonId:'2026-27', stage:{ label:'Journée 12', status:'completed' }, updatedAt:'2026-11-09T23:00:00Z',
    entries:[
      { rank:1, teamId:'psg',         teamSlug:'paris-saint-germain',teamName:'PSG',            teamInitials:'PSG', teamColor:'#004170', played:12, won:10,drawn:1, lost:1, goalsFor:32, goalsAgainst:8,  goalDifference:24, points:31, form:['W','W','W','D','W'], zone:'champions_league' },
      { rank:2, teamId:'marseille',   teamSlug:'marseille',          teamName:'O. Marseille',   teamInitials:'OM',  teamColor:'#2FAEE0', played:12, won:7, drawn:2, lost:3, goalsFor:20, goalsAgainst:14, goalDifference:6,  points:23, form:['W','L','W','D','W'], zone:'champions_league' },
      { rank:3, teamId:'nice',        teamSlug:'nice',               teamName:'OGC Nice',       teamInitials:'OGC', teamColor:'#DC1414', played:12, won:6, drawn:2, lost:4, goalsFor:18, goalsAgainst:16, goalDifference:2,  points:20, form:['D','W','L','W','W'], zone:'europa_league'      },
      { rank:4, teamId:'lens',        teamSlug:'lens',               teamName:'RC Lens',        teamInitials:'RCL', teamColor:'#D8AF2C', played:12, won:5, drawn:3, lost:4, goalsFor:15, goalsAgainst:15, goalDifference:0,  points:18, form:['W','D','D','L','W'], zone:'none'               },
      { rank:5, teamId:'monaco',      teamSlug:'monaco',             teamName:'AS Monaco',      teamInitials:'MON', teamColor:'#CF3731', played:12, won:5, drawn:2, lost:5, goalsFor:17, goalsAgainst:18, goalDifference:-1, points:17, form:['L','W','W','L','D'], zone:'none'               },
      { rank:6, teamId:'lyon',        teamSlug:'olympique-lyonnais', teamName:'O. Lyon',        teamInitials:'OL',  teamColor:'#CC0033', played:12, won:5, drawn:1, lost:6, goalsFor:16, goalsAgainst:20, goalDifference:-4, points:16, form:['W','L','D','W','L'], zone:'none'               },
      { rank:7, teamId:'rennes',      teamSlug:'stade-rennais',      teamName:'Stade Rennais',  teamInitials:'STA', teamColor:'#CC0000', played:12, won:4, drawn:3, lost:5, goalsFor:14, goalsAgainst:17, goalDifference:-3, points:15, form:['D','L','W','W','D'], zone:'none'               },
      { rank:8, teamId:'lille',       teamSlug:'losc-lille',         teamName:'LOSC Lille',     teamInitials:'LOS', teamColor:'#D9222A', played:12, won:4, drawn:2, lost:6, goalsFor:13, goalsAgainst:19, goalDifference:-6, points:14, form:['L','W','D','L','W'], zone:'none'               },
    ],
  },
}

/**
 * 대회 slug로 순위 조회
 * @param {string} competitionSlug
 */
export function getStandings(competitionSlug) {
  return STANDINGS[competitionSlug] ?? null
}
