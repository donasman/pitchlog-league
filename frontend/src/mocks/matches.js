/**
 * Mock 경기 데이터
 * 백엔드 연결 전 화면 검증용. 실제 서비스 데이터가 아닙니다.
 * 기준 시점: 2026-11-23 (발표용 고정 기준일 — filterTodayMatches 와 일치)
 * displayState: 'scheduled'|'live'|'halftime'|'final'|'recheck'|'confirmed'|'postponed'|'cancelled'
 */

/** 팀 참조 객체 */
const T = {
  // EPL
  mancity:    { id:'mancity',      slug:'manchester-city',    name:'Manchester City',    shortName:'Man City',    initials:'MC',  color:'#6CABDD' },
  arsenal:    { id:'arsenal',      slug:'arsenal',            name:'Arsenal',            shortName:'Arsenal',     initials:'ARS', color:'#EF0107' },
  liverpool:  { id:'liverpool',    slug:'liverpool',          name:'Liverpool',          shortName:'Liverpool',   initials:'LIV', color:'#C8102E' },
  chelsea:    { id:'chelsea',      slug:'chelsea',            name:'Chelsea',            shortName:'Chelsea',     initials:'CHE', color:'#034694' },
  newcastle:  { id:'newcastle',    slug:'newcastle',          name:'Newcastle United',   shortName:'Newcastle',   initials:'NEW', color:'#241F20' },
  spurs:      { id:'spurs',        slug:'tottenham',          name:'Tottenham Hotspur',  shortName:'Spurs',       initials:'TOT', color:'#132257' },
  manutd:     { id:'manutd',       slug:'manchester-united',  name:'Manchester United',  shortName:'Man Utd',     initials:'MU',  color:'#DA291C' },
  everton:    { id:'everton',      slug:'everton',            name:'Everton',            shortName:'Everton',     initials:'EVE', color:'#003399' },
  brighton:   { id:'brighton',     slug:'brighton',           name:'Brighton',           shortName:'Brighton',    initials:'BHA', color:'#0057B8' },
  // La Liga
  realmadrid: { id:'realmadrid',   slug:'real-madrid',        name:'Real Madrid',        shortName:'Real Madrid', initials:'RMA', color:'#FEBE10' },
  barca:      { id:'barca',        slug:'barcelona',          name:'FC Barcelona',       shortName:'Barcelona',   initials:'FCB', color:'#004D98' },
  atletico:   { id:'atletico',     slug:'atletico-madrid',    name:'Atlético Madrid',    shortName:'Atlético',    initials:'ATM', color:'#CB3524' },
  bilbao:     { id:'bilbao',       slug:'athletic-bilbao',    name:'Athletic Club',      shortName:'Athletic',    initials:'ATH', color:'#EE2523' },
  villarreal: { id:'villarreal',   slug:'villarreal',         name:'Villarreal CF',      shortName:'Villarreal',  initials:'VIL', color:'#F5E642' },
  girona:     { id:'girona',       slug:'girona',             name:'Girona FC',          shortName:'Girona',      initials:'GIR', color:'#9B1414' },
  betis:      { id:'betis',        slug:'real-betis',         name:'Real Betis',         shortName:'Betis',       initials:'BET', color:'#00A550' },
  sociedad:   { id:'sociedad',     slug:'real-sociedad',      name:'Real Sociedad',      shortName:'Sociedad',    initials:'RSO', color:'#003F91' },
  // Bundesliga
  bayernmunich:{ id:'bayernmunich',slug:'bayern-munich',      name:'FC Bayern München',  shortName:'Bayern',      initials:'BAY', color:'#DC052D' },
  dortmund:   { id:'dortmund',     slug:'borussia-dortmund',  name:'Borussia Dortmund',  shortName:'Dortmund',    initials:'BVB', color:'#FDE100' },
  leverkusen: { id:'leverkusen',   slug:'bayer-leverkusen',   name:'Bayer Leverkusen',   shortName:'Leverkusen',  initials:'LEV', color:'#E32221' },
  frankfurt:  { id:'frankfurt',    slug:'eintracht-frankfurt',name:'Eintracht Frankfurt', shortName:'Frankfurt',  initials:'SGE', color:'#000000' },
  freiburg:   { id:'freiburg',     slug:'freiburg',           name:'SC Freiburg',        shortName:'Freiburg',    initials:'SCF', color:'#CC0000' },
  leipzig:    { id:'leipzig',      slug:'rb-leipzig',         name:'RB Leipzig',         shortName:'Leipzig',     initials:'RBL', color:'#DD0741' },
  stuttgart:  { id:'stuttgart',    slug:'vfb-stuttgart',      name:'VfB Stuttgart',      shortName:'Stuttgart',   initials:'VFB', color:'#E32221' },
  // Serie A
  inter:      { id:'inter',        slug:'inter-milan',        name:'Inter Milan',        shortName:'Inter',       initials:'INT', color:'#0068A8' },
  juventus:   { id:'juventus',     slug:'juventus',           name:'Juventus FC',        shortName:'Juventus',    initials:'JUV', color:'#111827' },
  napoli:     { id:'napoli',       slug:'napoli',             name:'SSC Napoli',         shortName:'Napoli',      initials:'NAP', color:'#12A0D7' },
  milan:      { id:'milan',        slug:'ac-milan',           name:'AC Milan',           shortName:'AC Milan',    initials:'MIL', color:'#FB090B' },
  roma:       { id:'roma',         slug:'as-roma',            name:'AS Roma',            shortName:'Roma',        initials:'ROM', color:'#8B0000' },
  lazio:      { id:'lazio',        slug:'ss-lazio',           name:'SS Lazio',           shortName:'Lazio',       initials:'LAZ', color:'#87CEEB' },
  atalanta:   { id:'atalanta',     slug:'atalanta',           name:'Atalanta BC',        shortName:'Atalanta',    initials:'ATA', color:'#1E3A5F' },
  fiorentina: { id:'fiorentina',   slug:'fiorentina',         name:'ACF Fiorentina',     shortName:'Fiorentina',  initials:'FIO', color:'#6B0DA0' },
  // Ligue 1
  psg:        { id:'psg',          slug:'paris-saint-germain',name:'Paris Saint-Germain',shortName:'PSG',         initials:'PSG', color:'#004170' },
  marseille:  { id:'marseille',    slug:'marseille',          name:'O. Marseille',       shortName:'Marseille',   initials:'OM',  color:'#2FAEE0' },
  nice:       { id:'nice',         slug:'nice',               name:'OGC Nice',           shortName:'Nice',        initials:'OGC', color:'#DC1414' },
  lens:       { id:'lens',         slug:'lens',               name:'RC Lens',            shortName:'Lens',        initials:'RCL', color:'#D8AF2C' },
  monaco:     { id:'monaco',       slug:'monaco',             name:'AS Monaco',          shortName:'Monaco',      initials:'MON', color:'#CF3731' },
  lyon:       { id:'lyon',         slug:'olympique-lyonnais', name:'Olympique Lyonnais', shortName:'Lyon',        initials:'OL',  color:'#CC0033' },
  rennes:     { id:'rennes',       slug:'stade-rennais',      name:'Stade Rennais',      shortName:'Rennes',      initials:'STA', color:'#CC0000' },
}

/** @type {Array<Object>} */
export const MATCHES = [

  // ══════════════════════════════════════════════════════════════
  // LIVE 경기 (기준일 2026-11-23)
  // ══════════════════════════════════════════════════════════════

  // EPL LIVE
  {
    id:'m001', competitionId:'epl', competitionName:'Premier League', competitionSlug:'premier-league',
    seasonId:'2026-27', round:'Matchweek 13', date:'2026-11-23T14:00:00Z',
    venue:'Etihad Stadium, Manchester',
    homeTeam:T.mancity, awayTeam:T.arsenal,
    score:{ home:2, away:1 }, statusCode:'2H', displayState:'live', minute:67,
    events:[
      { minute:12, type:'goal',        team:'home', playerName:'Haaland',  assistName:'De Bruyne' },
      { minute:35, type:'goal',        team:'away', playerName:'Saka',     assistName:'Ødegaard'  },
      { minute:58, type:'yellow_card', team:'away', playerName:'Thomas'   },
      { minute:62, type:'goal',        team:'home', playerName:'Haaland'  },
    ],
    homeLineup:{
      formation:'4-3-3',
      startingXI:[
        { number:31, name:'Ederson',    position:'GK' },
        { number:2,  name:'Walker',     position:'DEF' },
        { number:3,  name:'Rúben Dias', position:'DEF' },
        { number:5,  name:'Stones',     position:'DEF' },
        { number:7,  name:'Gvardiol',   position:'DEF' },
        { number:20, name:'Bernardo',   position:'MID' },
        { number:16, name:'Rodri',      position:'MID' },
        { number:17, name:'De Bruyne',  position:'MID' },
        { number:47, name:'Foden',      position:'FWD' },
        { number:9,  name:'Haaland',    position:'FWD', isCaptain:true },
        { number:26, name:'Doku',       position:'FWD' },
      ],
      substitutes:[
        { number:82, name:'S. Carson',  position:'GK'  },
        { number:6,  name:'Akanji',     position:'DEF' },
        { number:24, name:'Bobb',       position:'MID' },
        { number:45, name:'Marmoush',   position:'FWD' },
      ],
    },
    awayLineup:{
      formation:'4-3-3',
      startingXI:[
        { number:1,  name:'Raya',       position:'GK' },
        { number:4,  name:'White',      position:'DEF' },
        { number:6,  name:'Gabriel',    position:'DEF' },
        { number:12, name:'Saliba',     position:'DEF' },
        { number:35, name:'Zinchenko',  position:'DEF' },
        { number:29, name:'Havertz',    position:'MID' },
        { number:5,  name:'Thomas',     position:'MID' },
        { number:8,  name:'Ødegaard',   position:'MID', isCaptain:true },
        { number:7,  name:'Saka',       position:'FWD' },
        { number:9,  name:'Jesus',      position:'FWD' },
        { number:11, name:'Martinelli', position:'FWD' },
      ],
      substitutes:[
        { number:13, name:'Neto',       position:'GK'  },
        { number:2,  name:'Timber',     position:'DEF' },
        { number:19, name:'Trossard',   position:'FWD' },
      ],
    },
    headToHead:[
      { date:'2026-04-12', homeTeam:'Arsenal',  awayTeam:'Man City', homeScore:1, awayScore:0, competition:'Premier League' },
      { date:'2025-11-15', homeTeam:'Man City', awayTeam:'Arsenal',  homeScore:3, awayScore:1, competition:'Premier League' },
    ],
    prediction:{ homeWin:55, draw:24, awayWin:21 },
  },

  // La Liga LIVE — El Clásico
  {
    id:'m009', competitionId:'laliga', competitionName:'La Liga', competitionSlug:'la-liga',
    seasonId:'2026-27', round:'Jornada 13', date:'2026-11-23T13:00:00Z',
    venue:'Santiago Bernabéu, Madrid',
    homeTeam:T.realmadrid, awayTeam:T.barca,
    score:{ home:1, away:1 }, statusCode:'1H', displayState:'live', minute:41,
    events:[
      { minute:14, type:'goal', team:'home', playerName:'Bellingham', assistName:'Vinicius Jr.' },
      { minute:33, type:'goal', team:'away', playerName:'Lewandowski', assistName:'Pedri' },
    ],
    prediction:{ homeWin:45, draw:28, awayWin:27 },
  },

  // Bundesliga LIVE — Dortmund vs Leverkusen
  {
    id:'m011', competitionId:'bundesliga', competitionName:'Bundesliga', competitionSlug:'bundesliga',
    seasonId:'2026-27', round:'Spieltag 12', date:'2026-11-23T13:30:00Z',
    venue:'Signal Iduna Park, Dortmund',
    homeTeam:T.dortmund, awayTeam:T.leverkusen,
    score:{ home:1, away:0 }, statusCode:'2H', displayState:'live', minute:54,
    events:[
      { minute:27, type:'goal',        team:'home', playerName:'Adeyemi',  assistName:'Brandt' },
      { minute:39, type:'yellow_card', team:'away', playerName:'Tella' },
    ],
    prediction:{ homeWin:42, draw:28, awayWin:30 },
  },

  // Serie A LIVE — Napoli vs Roma
  {
    id:'m021', competitionId:'seriea', competitionName:'Serie A', competitionSlug:'serie-a',
    seasonId:'2026-27', round:'Giornata 13', date:'2026-11-23T15:00:00Z',
    venue:'Stadio Diego Armando Maradona, Naples',
    homeTeam:T.napoli, awayTeam:T.roma,
    score:{ home:1, away:0 }, statusCode:'2H', displayState:'live', minute:73,
    events:[
      { minute:31, type:'goal', team:'home', playerName:'Osimhen', assistName:'Kvaratskhelia' },
      { minute:60, type:'yellow_card', team:'away', playerName:'Cristante' },
    ],
    prediction:{ homeWin:52, draw:24, awayWin:24 },
  },

  // Ligue 1 LIVE — Lyon vs Monaco
  {
    id:'m023', competitionId:'ligue1', competitionName:'Ligue 1', competitionSlug:'ligue-1',
    seasonId:'2026-27', round:'Journée 13', date:'2026-11-23T14:00:00Z',
    venue:'Groupama Stadium, Lyon',
    homeTeam:T.lyon, awayTeam:T.monaco,
    score:{ home:0, away:0 }, statusCode:'1H', displayState:'live', minute:38,
    events:[
      { minute:20, type:'yellow_card', team:'home', playerName:'Lacazette' },
    ],
    prediction:{ homeWin:38, draw:30, awayWin:32 },
  },

  // UCL LIVE — Bayern vs PSG (Matchday 4)
  {
    id:'m010', competitionId:'ucl', competitionName:'UEFA Champions League', competitionSlug:'champions-league',
    seasonId:'2026-27', round:'Matchday 4', stage:'League Phase', date:'2026-11-23T17:00:00Z',
    venue:'Allianz Arena, Munich',
    homeTeam:T.bayernmunich, awayTeam:T.psg,
    score:{ home:3, away:2 }, statusCode:'2H', displayState:'live', minute:78,
    events:[
      { minute:8,  type:'goal', team:'home', playerName:'Kane',          assistName:'Müller'  },
      { minute:22, type:'goal', team:'away', playerName:'Dembélé'                              },
      { minute:45, type:'goal', team:'home', playerName:'Müller',        assistName:'Sané'    },
      { minute:61, type:'goal', team:'away', playerName:'Lee Kang-in',   assistName:'Dembélé' },
      { minute:71, type:'goal', team:'home', playerName:'Sané',          assistName:'Kane'    },
    ],
    prediction:{ homeWin:52, draw:22, awayWin:26 },
  },

  // ══════════════════════════════════════════════════════════════
  // 예정 경기 (scheduled)
  // ══════════════════════════════════════════════════════════════

  // EPL 예정
  {
    id:'m002', competitionId:'epl', competitionName:'Premier League', competitionSlug:'premier-league',
    seasonId:'2026-27', round:'Matchweek 13', date:'2026-11-23T16:30:00Z',
    venue:'Anfield, Liverpool',
    homeTeam:T.liverpool, awayTeam:T.chelsea,
    score:{ home:null, away:null }, statusCode:'NS', displayState:'scheduled',
    prediction:{ homeWin:48, draw:26, awayWin:26 },
  },
  {
    id:'m007', competitionId:'epl', competitionName:'Premier League', competitionSlug:'premier-league',
    seasonId:'2026-27', round:'Matchweek 13', date:'2026-11-23T12:00:00Z',
    venue:'Goodison Park, Liverpool',
    homeTeam:T.everton, awayTeam:T.brighton,
    score:{ home:null, away:null }, statusCode:'NS', displayState:'scheduled',
  },
  {
    id:'m008', competitionId:'epl', competitionName:'Premier League', competitionSlug:'premier-league',
    seasonId:'2026-27', round:'Matchweek 13', date:'2026-11-24T20:00:00Z',
    venue:'Old Trafford, Manchester',
    homeTeam:T.manutd, awayTeam:T.newcastle,
    score:{ home:null, away:null }, statusCode:'NS', displayState:'scheduled',
  },

  // La Liga 예정
  {
    id:'m015', competitionId:'laliga', competitionName:'La Liga', competitionSlug:'la-liga',
    seasonId:'2026-27', round:'Jornada 13', date:'2026-11-23T16:00:00Z',
    venue:'Cívitas Metropolitano, Madrid',
    homeTeam:T.atletico, awayTeam:T.villarreal,
    score:{ home:null, away:null }, statusCode:'NS', displayState:'scheduled',
    prediction:{ homeWin:60, draw:22, awayWin:18 },
  },
  {
    id:'m016', competitionId:'laliga', competitionName:'La Liga', competitionSlug:'la-liga',
    seasonId:'2026-27', round:'Jornada 13', date:'2026-11-24T19:00:00Z',
    venue:'San Mamés, Bilbao',
    homeTeam:T.bilbao, awayTeam:T.girona,
    score:{ home:null, away:null }, statusCode:'NS', displayState:'scheduled',
    prediction:{ homeWin:44, draw:28, awayWin:28 },
  },

  // Bundesliga 예정
  {
    id:'m018', competitionId:'bundesliga', competitionName:'Bundesliga', competitionSlug:'bundesliga',
    seasonId:'2026-27', round:'Spieltag 12', date:'2026-11-24T19:30:00Z',
    venue:'Allianz Arena, Munich',
    homeTeam:T.bayernmunich, awayTeam:T.frankfurt,
    score:{ home:null, away:null }, statusCode:'NS', displayState:'scheduled',
    prediction:{ homeWin:62, draw:22, awayWin:16 },
  },
  {
    id:'m019', competitionId:'bundesliga', competitionName:'Bundesliga', competitionSlug:'bundesliga',
    seasonId:'2026-27', round:'Spieltag 12', date:'2026-11-24T17:30:00Z',
    venue:'Red Bull Arena, Leipzig',
    homeTeam:T.leipzig, awayTeam:T.stuttgart,
    score:{ home:null, away:null }, statusCode:'NS', displayState:'scheduled',
    prediction:{ homeWin:48, draw:26, awayWin:26 },
  },

  // Serie A 예정
  {
    id:'m012', competitionId:'seriea', competitionName:'Serie A', competitionSlug:'serie-a',
    seasonId:'2026-27', round:'Giornata 13', date:'2026-11-23T14:00:00Z',
    venue:'San Siro, Milan',
    homeTeam:T.inter, awayTeam:T.juventus,
    score:{ home:null, away:null }, statusCode:'NS', displayState:'scheduled',
    prediction:{ homeWin:44, draw:28, awayWin:28 },
  },
  {
    id:'m022', competitionId:'seriea', competitionName:'Serie A', competitionSlug:'serie-a',
    seasonId:'2026-27', round:'Giornata 13', date:'2026-11-24T19:45:00Z',
    venue:'Allianz Stadium, Turin',
    homeTeam:T.lazio, awayTeam:T.atalanta,
    score:{ home:null, away:null }, statusCode:'NS', displayState:'scheduled',
    prediction:{ homeWin:36, draw:28, awayWin:36 },
  },

  // Ligue 1 예정
  {
    id:'m013', competitionId:'ligue1', competitionName:'Ligue 1', competitionSlug:'ligue-1',
    seasonId:'2026-27', round:'Journée 13', date:'2026-11-24T19:00:00Z',
    venue:'Parc des Princes, Paris',
    homeTeam:T.psg, awayTeam:T.marseille,
    score:{ home:null, away:null }, statusCode:'NS', displayState:'scheduled',
    prediction:{ homeWin:62, draw:19, awayWin:19 },
  },
  {
    id:'m024', competitionId:'ligue1', competitionName:'Ligue 1', competitionSlug:'ligue-1',
    seasonId:'2026-27', round:'Journée 13', date:'2026-11-24T17:00:00Z',
    venue:'Stade Bollaert-Delelis, Lens',
    homeTeam:T.lens, awayTeam:T.rennes,
    score:{ home:null, away:null }, statusCode:'NS', displayState:'scheduled',
    prediction:{ homeWin:44, draw:26, awayWin:30 },
  },

  // UCL 예정
  {
    id:'m026', competitionId:'ucl', competitionName:'UEFA Champions League', competitionSlug:'champions-league',
    seasonId:'2026-27', round:'Matchday 4', stage:'League Phase', date:'2026-11-24T20:00:00Z',
    venue:'Emirates Stadium, London',
    homeTeam:T.arsenal, awayTeam:T.inter,
    score:{ home:null, away:null }, statusCode:'NS', displayState:'scheduled',
    prediction:{ homeWin:48, draw:26, awayWin:26 },
  },

  // ══════════════════════════════════════════════════════════════
  // 확정(CONFIRMED) 경기
  // ══════════════════════════════════════════════════════════════

  // EPL 확정
  {
    id:'m003', competitionId:'epl', competitionName:'Premier League', competitionSlug:'premier-league',
    seasonId:'2026-27', round:'Matchweek 12', date:'2026-11-10T20:00:00Z',
    venue:'Emirates Stadium, London',
    homeTeam:T.arsenal, awayTeam:T.spurs,
    score:{ home:3, away:2 }, statusCode:'FT', displayState:'confirmed',
    events:[
      { minute:8,  type:'goal', team:'home', playerName:'Saka',       assistName:'Ødegaard' },
      { minute:23, type:'goal', team:'away', playerName:'Son'                                },
      { minute:44, type:'goal', team:'home', playerName:'Havertz',    assistName:'Saka'     },
      { minute:55, type:'goal', team:'away', playerName:'Kulusevski', assistName:'Son'      },
      { minute:78, type:'goal', team:'home', playerName:'Martinelli', assistName:'Havertz'  },
    ],
    headToHead:[
      { date:'2026-02-10', homeTeam:'Spurs',   awayTeam:'Arsenal', homeScore:0, awayScore:1, competition:'Premier League' },
      { date:'2025-11-03', homeTeam:'Arsenal', awayTeam:'Spurs',   homeScore:3, awayScore:0, competition:'Premier League' },
    ],
  },

  // La Liga 확정
  {
    id:'m030', competitionId:'laliga', competitionName:'La Liga', competitionSlug:'la-liga',
    seasonId:'2026-27', round:'Jornada 12', date:'2026-11-09T20:00:00Z',
    venue:'Cívitas Metropolitano, Madrid',
    homeTeam:T.atletico, awayTeam:T.barca,
    score:{ home:2, away:0 }, statusCode:'FT', displayState:'confirmed',
    events:[
      { minute:34, type:'goal', team:'home', playerName:'Griezmann', assistName:'Correa' },
      { minute:78, type:'goal', team:'home', playerName:'Morata' },
    ],
  },
  {
    id:'m031', competitionId:'laliga', competitionName:'La Liga', competitionSlug:'la-liga',
    seasonId:'2026-27', round:'Jornada 12', date:'2026-11-09T17:30:00Z',
    venue:'Santiago Bernabéu, Madrid',
    homeTeam:T.realmadrid, awayTeam:T.bilbao,
    score:{ home:2, away:0 }, statusCode:'FT', displayState:'confirmed',
    events:[
      { minute:18, type:'goal', team:'home', playerName:'Bellingham', assistName:'Vinicius Jr.' },
      { minute:65, type:'goal', team:'home', playerName:'Rodrygo' },
    ],
  },

  // Bundesliga 확정
  {
    id:'m033', competitionId:'bundesliga', competitionName:'Bundesliga', competitionSlug:'bundesliga',
    seasonId:'2026-27', round:'Spieltag 11', date:'2026-11-09T15:30:00Z',
    venue:'Allianz Arena, Munich',
    homeTeam:T.bayernmunich, awayTeam:T.freiburg,
    score:{ home:4, away:1 }, statusCode:'FT', displayState:'confirmed',
    events:[
      { minute:12, type:'goal', team:'home', playerName:'Kane',     assistName:'Musiala' },
      { minute:27, type:'goal', team:'home', playerName:'Musiala' },
      { minute:38, type:'goal', team:'away', playerName:'Gregoritsch' },
      { minute:61, type:'goal', team:'home', playerName:'Sané',    assistName:'Kane' },
      { minute:80, type:'goal', team:'home', playerName:'Kane' },
    ],
  },
  {
    id:'m034', competitionId:'bundesliga', competitionName:'Bundesliga', competitionSlug:'bundesliga',
    seasonId:'2026-27', round:'Spieltag 11', date:'2026-11-09T13:30:00Z',
    venue:'BayArena, Leverkusen',
    homeTeam:T.leverkusen, awayTeam:T.frankfurt,
    score:{ home:2, away:1 }, statusCode:'FT', displayState:'confirmed',
    events:[
      { minute:21, type:'goal', team:'home', playerName:'Wirtz',    assistName:'Tella' },
      { minute:45, type:'goal', team:'away', playerName:'Marmoush' },
      { minute:77, type:'goal', team:'home', playerName:'Boniface' },
    ],
  },

  // Serie A 확정
  {
    id:'m014', competitionId:'seriea', competitionName:'Serie A', competitionSlug:'serie-a',
    seasonId:'2026-27', round:'Giornata 12', date:'2026-11-09T17:00:00Z',
    venue:'San Siro, Milan',
    homeTeam:T.milan, awayTeam:T.napoli,
    score:{ home:0, away:2 }, statusCode:'FT', displayState:'confirmed',
    events:[
      { minute:29, type:'goal', team:'away', playerName:'Kvaratskhelia', assistName:'Politano' },
      { minute:72, type:'goal', team:'away', playerName:'Osimhen' },
    ],
  },
  {
    id:'m035', competitionId:'seriea', competitionName:'Serie A', competitionSlug:'serie-a',
    seasonId:'2026-27', round:'Giornata 12', date:'2026-11-09T14:00:00Z',
    venue:'Allianz Stadium, Turin',
    homeTeam:T.juventus, awayTeam:T.inter,
    score:{ home:1, away:2 }, statusCode:'FT', displayState:'confirmed',
    events:[
      { minute:15, type:'goal', team:'away', playerName:'Lautaro',    assistName:'Mkhitaryan' },
      { minute:54, type:'goal', team:'home', playerName:'Vlahović' },
      { minute:84, type:'goal', team:'away', playerName:'Thuram' },
    ],
  },

  // Ligue 1 확정
  {
    id:'m037', competitionId:'ligue1', competitionName:'Ligue 1', competitionSlug:'ligue-1',
    seasonId:'2026-27', round:'Journée 12', date:'2026-11-09T19:00:00Z',
    venue:'Stade Vélodrome, Marseille',
    homeTeam:T.marseille, awayTeam:T.nice,
    score:{ home:2, away:1 }, statusCode:'FT', displayState:'confirmed',
    events:[
      { minute:23, type:'goal', team:'home', playerName:'Aubameyang', assistName:'Harit' },
      { minute:55, type:'goal', team:'away', playerName:'Balogun' },
      { minute:81, type:'goal', team:'home', playerName:'Ndiaye' },
    ],
  },
  {
    id:'m038', competitionId:'ligue1', competitionName:'Ligue 1', competitionSlug:'ligue-1',
    seasonId:'2026-27', round:'Journée 12', date:'2026-11-09T16:00:00Z',
    venue:'Parc des Princes, Paris',
    homeTeam:T.psg, awayTeam:T.lens,
    score:{ home:3, away:0 }, statusCode:'FT', displayState:'confirmed',
    events:[
      { minute:11, type:'goal', team:'home', playerName:'Dembélé',  assistName:'Vitinha' },
      { minute:37, type:'goal', team:'home', playerName:'Lee Kang-in' },
      { minute:68, type:'goal', team:'home', playerName:'Dembélé' },
    ],
  },

  // UCL 확정 — Matchday 3
  {
    id:'m027', competitionId:'ucl', competitionName:'UEFA Champions League', competitionSlug:'champions-league',
    seasonId:'2026-27', round:'Matchday 3', stage:'League Phase', date:'2026-10-22T20:00:00Z',
    venue:'Anfield, Liverpool',
    homeTeam:T.liverpool, awayTeam:T.dortmund,
    score:{ home:2, away:1 }, statusCode:'FT', displayState:'confirmed',
    events:[
      { minute:22, type:'goal', team:'home', playerName:'Salah',       assistName:'Diaz'   },
      { minute:44, type:'goal', team:'away', playerName:'Adeyemi' },
      { minute:79, type:'goal', team:'home', playerName:'Jota' },
    ],
  },

  // EPL 확정 (2번째)
  {
    id:'m028', competitionId:'epl', competitionName:'Premier League', competitionSlug:'premier-league',
    seasonId:'2026-27', round:'Matchweek 12', date:'2026-11-10T17:30:00Z',
    venue:'Anfield, Liverpool',
    homeTeam:T.liverpool, awayTeam:T.newcastle,
    score:{ home:2, away:0 }, statusCode:'FT', displayState:'confirmed',
    events:[
      { minute:22, type:'goal', team:'home', playerName:'Salah',  assistName:'Diaz' },
      { minute:78, type:'goal', team:'home', playerName:'Núñez' },
    ],
  },

  // UCL 확정 — Matchday 2
  {
    id:'m029', competitionId:'ucl', competitionName:'UEFA Champions League', competitionSlug:'champions-league',
    seasonId:'2026-27', round:'Matchday 2', stage:'League Phase', date:'2026-10-01T20:00:00Z',
    venue:'Etihad Stadium, Manchester',
    homeTeam:T.mancity, awayTeam:T.barca,
    score:{ home:3, away:1 }, statusCode:'FT', displayState:'confirmed',
    events:[
      { minute:15, type:'goal', team:'home', playerName:'Haaland',    assistName:'Foden' },
      { minute:34, type:'goal', team:'away', playerName:'Lewandowski' },
      { minute:57, type:'goal', team:'home', playerName:'De Bruyne' },
      { minute:81, type:'goal', team:'home', playerName:'Haaland' },
    ],
  },

  // UCL R16 (2027)
  {
    id:'m005', competitionId:'ucl', competitionName:'UEFA Champions League', competitionSlug:'champions-league',
    seasonId:'2026-27', round:'Round of 16', stage:'Round of 16', leg:1, tieId:'ucl-r16-01',
    date:'2027-02-18T20:00:00Z', venue:'Etihad Stadium, Manchester',
    homeTeam:T.mancity, awayTeam:T.realmadrid,
    score:{ home:2, away:1 }, aggregateScore:{ home:2, away:1 }, statusCode:'FT', displayState:'confirmed',
    events:[
      { minute:18, type:'goal', team:'home', playerName:'Haaland',      assistName:'Foden'  },
      { minute:56, type:'goal', team:'away', playerName:'Vinicius Jr.'                       },
      { minute:88, type:'goal', team:'home', playerName:'Bernardo'                           },
    ],
  },
  {
    id:'m006', competitionId:'ucl', competitionName:'UEFA Champions League', competitionSlug:'champions-league',
    seasonId:'2026-27', round:'Round of 16', stage:'Round of 16', leg:2, tieId:'ucl-r16-01',
    date:'2027-03-11T20:00:00Z', venue:'Santiago Bernabéu, Madrid',
    homeTeam:T.realmadrid, awayTeam:T.mancity,
    score:{ home:1, away:0 }, aggregateScore:{ home:2, away:2 },
    qualifier:'Man City 진출 (원정 다득점)',
    statusCode:'FT', displayState:'confirmed',
  },

  // ══════════════════════════════════════════════════════════════
  // 재검증(RECHECK) 경기
  // ══════════════════════════════════════════════════════════════

  // EPL recheck
  {
    id:'m004', competitionId:'epl', competitionName:'Premier League', competitionSlug:'premier-league',
    seasonId:'2026-27', round:'Matchweek 12', date:'2026-11-10T15:00:00Z',
    venue:'Stamford Bridge, London',
    homeTeam:T.chelsea, awayTeam:T.newcastle,
    score:{ home:1, away:1 }, statusCode:'FT', displayState:'recheck',
    events:[
      { minute:34, type:'goal', team:'home', playerName:'Palmer'                        },
      { minute:71, type:'goal', team:'away', playerName:'Isak', assistName:'Gordon' },
    ],
  },

  // La Liga recheck
  {
    id:'m032', competitionId:'laliga', competitionName:'La Liga', competitionSlug:'la-liga',
    seasonId:'2026-27', round:'Jornada 12', date:'2026-11-09T15:30:00Z',
    venue:'Estadio de La Cerámica, Villarreal',
    homeTeam:T.villarreal, awayTeam:T.sociedad,
    score:{ home:1, away:1 }, statusCode:'FT', displayState:'recheck',
    events:[
      { minute:40, type:'goal', team:'home', playerName:'Jackson' },
      { minute:72, type:'goal', team:'away', playerName:'Kubo' },
    ],
  },

  // Bundesliga recheck
  {
    id:'m036', competitionId:'bundesliga', competitionName:'Bundesliga', competitionSlug:'bundesliga',
    seasonId:'2026-27', round:'Spieltag 11', date:'2026-11-09T13:30:00Z',
    venue:'Volkswagen Arena, Wolfsburg',
    homeTeam:T.freiburg, awayTeam:T.leipzig,
    score:{ home:1, away:1 }, statusCode:'FT', displayState:'recheck',
    events:[
      { minute:33, type:'goal', team:'home', playerName:'Doan' },
      { minute:69, type:'goal', team:'away', playerName:'Simons' },
    ],
  },

  // Serie A recheck
  {
    id:'m039', competitionId:'seriea', competitionName:'Serie A', competitionSlug:'serie-a',
    seasonId:'2026-27', round:'Giornata 12', date:'2026-11-09T19:45:00Z',
    venue:'Stadio Olimpico, Rome',
    homeTeam:T.roma, awayTeam:T.atalanta,
    score:{ home:2, away:2 }, statusCode:'FT', displayState:'recheck',
    events:[
      { minute:14, type:'goal', team:'away', playerName:'Lookman',   assistName:'De Roon' },
      { minute:38, type:'goal', team:'home', playerName:'Dybala',    assistName:'Pellegrini' },
      { minute:61, type:'goal', team:'home', playerName:'Pellegrini' },
      { minute:88, type:'goal', team:'away', playerName:'Muriel' },
    ],
  },

  // Ligue 1 recheck
  {
    id:'m040', competitionId:'ligue1', competitionName:'Ligue 1', competitionSlug:'ligue-1',
    seasonId:'2026-27', round:'Journée 12', date:'2026-11-09T14:00:00Z',
    venue:'Roazhon Park, Rennes',
    homeTeam:T.rennes, awayTeam:T.monaco,
    score:{ home:1, away:1 }, statusCode:'FT', displayState:'recheck',
    events:[
      { minute:28, type:'goal', team:'home', playerName:'Terrier' },
      { minute:74, type:'goal', team:'away', playerName:'Ben Yedder' },
    ],
  },
]

/** UCL 녹아웃 대진 */
export const UCL_KNOCKOUT_TIES = [
  { id:'r16-01', stage:'round_of_16', status:'completed',
    homeTeam:{ name:'Man City',   initials:'MC',  color:'#6CABDD', slug:'manchester-city'    },
    awayTeam:{ name:'Real Madrid',initials:'RMA', color:'#FEBE10', slug:'real-madrid'         },
    leg1Score:{ home:2, away:1 }, leg2Score:{ home:1, away:0 }, aggregateScore:{ home:2, away:2 }, winner:'Man City' },
  { id:'r16-02', stage:'round_of_16', status:'completed',
    homeTeam:{ name:'Arsenal',    initials:'ARS', color:'#EF0107', slug:'arsenal'             },
    awayTeam:{ name:'PSG',        initials:'PSG', color:'#004170', slug:'paris-saint-germain' },
    leg1Score:{ home:3, away:1 }, leg2Score:{ home:1, away:0 }, aggregateScore:{ home:3, away:2 }, winner:'Arsenal' },
  { id:'r16-03', stage:'round_of_16', status:'completed',
    homeTeam:{ name:'Bayern',     initials:'BAY', color:'#DC052D', slug:'bayern-munich'       },
    awayTeam:{ name:'Liverpool',  initials:'LIV', color:'#C8102E', slug:'liverpool'           },
    leg1Score:{ home:1, away:2 }, leg2Score:{ home:0, away:2 }, aggregateScore:{ home:3, away:2 }, winner:'Bayern' },
  { id:'r16-04', stage:'round_of_16', status:'completed',
    homeTeam:{ name:'Barcelona',  initials:'FCB', color:'#004D98', slug:'barcelona'           },
    awayTeam:{ name:'Dortmund',   initials:'BVB', color:'#FDE100', slug:'borussia-dortmund'   },
    leg1Score:{ home:3, away:2 }, leg2Score:{ home:0, away:0 }, aggregateScore:{ home:3, away:2 }, winner:'Barcelona' },
  { id:'r16-05', stage:'round_of_16', status:'in_progress',
    homeTeam:{ name:'Inter',      initials:'INT', color:'#0068A8', slug:'inter-milan'         },
    awayTeam:{ name:'Atlético',   initials:'ATM', color:'#CB3524', slug:'atletico-madrid'     },
    leg1Score:{ home:2, away:2 }, leg2Score:null },
  { id:'r16-06', stage:'round_of_16', status:'tbd',
    homeTeam:null, awayTeam:null },
  { id:'qf-01', stage:'quarter_final', status:'tbd', homeTeam:{ name:'Man City',  initials:'MC',  color:'#6CABDD', slug:'manchester-city' }, awayTeam:null },
  { id:'qf-02', stage:'quarter_final', status:'tbd', homeTeam:{ name:'Arsenal',   initials:'ARS', color:'#EF0107', slug:'arsenal'         }, awayTeam:null },
  { id:'qf-03', stage:'quarter_final', status:'tbd', homeTeam:{ name:'Bayern',    initials:'BAY', color:'#DC052D', slug:'bayern-munich'   }, awayTeam:null },
  { id:'qf-04', stage:'quarter_final', status:'tbd', homeTeam:{ name:'Barcelona', initials:'FCB', color:'#004D98', slug:'barcelona'       }, awayTeam:null },
  { id:'sf-01', stage:'semi_final',    status:'tbd', homeTeam:null, awayTeam:null },
  { id:'sf-02', stage:'semi_final',    status:'tbd', homeTeam:null, awayTeam:null },
  { id:'final-01', stage:'final',      status:'tbd', homeTeam:null, awayTeam:null },
]

/** @param {string} id */
export function getMatchById(id) { return MATCHES.find(m => m.id === id) }

/** @param {string} teamSlug */
export function getMatchesByTeam(teamSlug) {
  return MATCHES.filter(m => m.homeTeam.slug === teamSlug || m.awayTeam.slug === teamSlug)
}

/** @param {string} competitionSlug */
export function getMatchesByCompetition(competitionSlug) {
  return MATCHES.filter(m => m.competitionSlug === competitionSlug)
}
