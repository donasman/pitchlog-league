/**
 * Mock 팀 데이터
 * 백엔드 연결 전 화면 검증용. 실제 서비스 데이터가 아닙니다.
 * 연결 지점: src/services/teamService.js → GET /api/teams/:slug
 *
 * @typedef {{ id:string, slug:string, name:string, shortName:string, initials:string,
 *   city:string, stadium:string, stadiumCapacity:number, competitions:string[],
 *   foundedYear:number, manager:string, color:string }} Team
 */

/** @type {Team[]} */
export const TEAMS = [
  // ─── EPL (20팀) ──────────────────────────────────────────────
  { id:'mancity',      slug:'manchester-city',    name:'Manchester City',          shortName:'Man City',    initials:'MC',  city:'Manchester',   stadium:'Etihad Stadium',              stadiumCapacity:53400,  competitions:['premier-league','champions-league'], foundedYear:1880, manager:'Pep Guardiola',      color:'#6CABDD' },
  { id:'arsenal',      slug:'arsenal',            name:'Arsenal',                  shortName:'Arsenal',     initials:'ARS', city:'London',       stadium:'Emirates Stadium',            stadiumCapacity:60704,  competitions:['premier-league','champions-league'], foundedYear:1886, manager:'Mikel Arteta',       color:'#EF0107' },
  { id:'liverpool',    slug:'liverpool',          name:'Liverpool',                shortName:'Liverpool',   initials:'LIV', city:'Liverpool',    stadium:'Anfield',                     stadiumCapacity:61276,  competitions:['premier-league','champions-league'], foundedYear:1892, manager:'Arne Slot',           color:'#C8102E' },
  { id:'chelsea',      slug:'chelsea',            name:'Chelsea',                  shortName:'Chelsea',     initials:'CHE', city:'London',       stadium:'Stamford Bridge',             stadiumCapacity:40343,  competitions:['premier-league','champions-league'], foundedYear:1905, manager:'Enzo Maresca',        color:'#034694' },
  { id:'newcastle',    slug:'newcastle',          name:'Newcastle United',         shortName:'Newcastle',   initials:'NEW', city:'Newcastle',    stadium:"St. James' Park",             stadiumCapacity:52305,  competitions:['premier-league','champions-league'], foundedYear:1892, manager:'Eddie Howe',          color:'#241F20' },
  { id:'spurs',        slug:'tottenham',          name:'Tottenham Hotspur',        shortName:'Spurs',       initials:'TOT', city:'London',       stadium:'Tottenham Hotspur Stadium',   stadiumCapacity:62850,  competitions:['premier-league'],                    foundedYear:1882, manager:'Ange Postecoglou',   color:'#132257' },
  { id:'manutd',       slug:'manchester-united',  name:'Manchester United',        shortName:'Man Utd',     initials:'MU',  city:'Manchester',   stadium:'Old Trafford',                stadiumCapacity:74310,  competitions:['premier-league'],                    foundedYear:1878, manager:'Ruben Amorim',        color:'#DA291C' },
  { id:'astonvilla',   slug:'aston-villa',        name:'Aston Villa',              shortName:'Aston Villa', initials:'AVL', city:'Birmingham',   stadium:'Villa Park',                  stadiumCapacity:42785,  competitions:['premier-league'],                    foundedYear:1874, manager:'Unai Emery',          color:'#670E36' },
  { id:'brighton',     slug:'brighton',           name:'Brighton & Hove Albion',   shortName:'Brighton',    initials:'BHA', city:'Brighton',     stadium:'Amex Stadium',                stadiumCapacity:31800,  competitions:['premier-league'],                    foundedYear:1901, manager:'Fabian Hürzeler',    color:'#0057B8' },
  { id:'westham',      slug:'west-ham',           name:'West Ham United',          shortName:'West Ham',    initials:'WHU', city:'London',       stadium:'London Stadium',              stadiumCapacity:60000,  competitions:['premier-league'],                    foundedYear:1895, manager:'Julen Lopetegui',     color:'#7A263A' },
  { id:'wolves',       slug:'wolverhampton',      name:'Wolverhampton Wanderers',  shortName:'Wolves',      initials:'WOL', city:'Wolverhampton',stadium:'Molineux Stadium',            stadiumCapacity:31750,  competitions:['premier-league'],                    foundedYear:1877, manager:'Vítor Pereira',      color:'#FDB913' },
  { id:'nottmforest',  slug:'nottm-forest',       name:'Nottingham Forest',        shortName:"Nott'm Forest", initials:'NFO', city:'Nottingham', stadium:'City Ground',               stadiumCapacity:30445,  competitions:['premier-league'],                    foundedYear:1865, manager:'Nuno Espírito Santo', color:'#DD0000' },
  { id:'everton',      slug:'everton',            name:'Everton',                  shortName:'Everton',     initials:'EVE', city:'Liverpool',    stadium:'Goodison Park',               stadiumCapacity:39572,  competitions:['premier-league'],                    foundedYear:1878, manager:'Sean Dyche',          color:'#003399' },
  { id:'fulham',       slug:'fulham',             name:'Fulham',                   shortName:'Fulham',      initials:'FUL', city:'London',       stadium:'Craven Cottage',              stadiumCapacity:25700,  competitions:['premier-league'],                    foundedYear:1879, manager:'Marco Silva',         color:'#CC0000' },
  { id:'bournemouth',  slug:'bournemouth',        name:'AFC Bournemouth',          shortName:'Bournemouth', initials:'BOU', city:'Bournemouth',  stadium:'Vitality Stadium',            stadiumCapacity:11379,  competitions:['premier-league'],                    foundedYear:1899, manager:'Andoni Iraola',       color:'#DA291C' },
  { id:'crystalpalace',slug:'crystal-palace',     name:'Crystal Palace',           shortName:'Crystal Palace', initials:'CRY', city:'London',  stadium:'Selhurst Park',               stadiumCapacity:25486,  competitions:['premier-league'],                    foundedYear:1905, manager:'Oliver Glasner',      color:'#1B458F' },
  { id:'brentford',    slug:'brentford',          name:'Brentford',                shortName:'Brentford',   initials:'BRE', city:'London',       stadium:'Gtech Community Stadium',     stadiumCapacity:17250,  competitions:['premier-league'],                    foundedYear:1889, manager:'Thomas Frank',        color:'#D20000' },
  { id:'leicester',    slug:'leicester',          name:'Leicester City',           shortName:'Leicester',   initials:'LEI', city:'Leicester',    stadium:'King Power Stadium',          stadiumCapacity:32261,  competitions:['premier-league'],                    foundedYear:1884, manager:'Steve Cooper',        color:'#003090' },
  { id:'ipswich',      slug:'ipswich',            name:'Ipswich Town',             shortName:'Ipswich',     initials:'IPS', city:'Ipswich',      stadium:'Portman Road',                stadiumCapacity:30300,  competitions:['premier-league'],                    foundedYear:1878, manager:'Kieran McKenna',      color:'#3A64A3' },
  { id:'southampton',  slug:'southampton',        name:'Southampton',              shortName:'Southampton', initials:'SOU', city:'Southampton',  stadium:"St. Mary's Stadium",          stadiumCapacity:32505,  competitions:['premier-league'],                    foundedYear:1885, manager:'Ivan Jurić',         color:'#D71920' },

  // ─── La Liga ─────────────────────────────────────────────────
  { id:'realmadrid',   slug:'real-madrid',        name:'Real Madrid',              shortName:'Real Madrid', initials:'RMA', city:'Madrid',       stadium:'Santiago Bernabéu',           stadiumCapacity:81044,  competitions:['la-liga','champions-league'],         foundedYear:1902, manager:'Carlo Ancelotti',     color:'#FEBE10' },
  { id:'barca',        slug:'barcelona',          name:'FC Barcelona',             shortName:'Barcelona',   initials:'FCB', city:'Barcelona',    stadium:'Spotify Camp Nou',            stadiumCapacity:99354,  competitions:['la-liga','champions-league'],         foundedYear:1899, manager:'Hansi Flick',         color:'#004D98' },
  { id:'atletico',     slug:'atletico-madrid',    name:'Atlético Madrid',          shortName:'Atlético',    initials:'ATM', city:'Madrid',       stadium:'Cívitas Metropolitano',       stadiumCapacity:68456,  competitions:['la-liga'],                           foundedYear:1903, manager:'Diego Simeone',       color:'#CB3524' },
  { id:'bilbao',       slug:'athletic-bilbao',    name:'Athletic Club',            shortName:'Athletic',    initials:'ATH', city:'Bilbao',       stadium:'San Mamés',                   stadiumCapacity:53289,  competitions:['la-liga'],                           foundedYear:1898, manager:'Ernesto Valverde',    color:'#EE2523' },
  { id:'villarreal',   slug:'villarreal',         name:'Villarreal CF',            shortName:'Villarreal',  initials:'VIL', city:'Villarreal',   stadium:'Estadio de La Cerámica',      stadiumCapacity:23500,  competitions:['la-liga'],                           foundedYear:1923, manager:'Marcelino García',    color:'#F5E642' },
  { id:'girona',       slug:'girona',             name:'Girona FC',                shortName:'Girona',      initials:'GIR', city:'Girona',       stadium:'Estadi Montilivi',            stadiumCapacity:13500,  competitions:['la-liga'],                           foundedYear:1930, manager:'Míchel Sánchez',      color:'#9B1414' },
  { id:'betis',        slug:'real-betis',         name:'Real Betis',               shortName:'Betis',       initials:'BET', city:'Seville',      stadium:'Estadio Benito Villamarín',   stadiumCapacity:60720,  competitions:['la-liga'],                           foundedYear:1907, manager:'Manuel Pellegrini',   color:'#00A550' },
  { id:'sociedad',     slug:'real-sociedad',      name:'Real Sociedad',            shortName:'Sociedad',    initials:'RSO', city:'San Sebastián',stadium:'Reale Arena',                 stadiumCapacity:39500,  competitions:['la-liga'],                           foundedYear:1909, manager:'Imanol Alguacil',     color:'#003F91' },

  // ─── Bundesliga ───────────────────────────────────────────────
  { id:'bayernmunich', slug:'bayern-munich',      name:'FC Bayern München',        shortName:'Bayern',      initials:'BAY', city:'Munich',       stadium:'Allianz Arena',               stadiumCapacity:75024,  competitions:['bundesliga','champions-league'],      foundedYear:1900, manager:'Vincent Kompany',     color:'#DC052D' },
  { id:'dortmund',     slug:'borussia-dortmund',  name:'Borussia Dortmund',        shortName:'Dortmund',    initials:'BVB', city:'Dortmund',     stadium:'Signal Iduna Park',           stadiumCapacity:81365,  competitions:['bundesliga','champions-league'],      foundedYear:1909, manager:'Niko Kovač',          color:'#FDE100' },
  { id:'leverkusen',   slug:'bayer-leverkusen',   name:'Bayer Leverkusen',         shortName:'Leverkusen',  initials:'LEV', city:'Leverkusen',   stadium:'BayArena',                    stadiumCapacity:30210,  competitions:['bundesliga'],                        foundedYear:1904, manager:'Xabi Alonso',         color:'#E32221' },
  { id:'frankfurt',    slug:'eintracht-frankfurt',name:'Eintracht Frankfurt',       shortName:'Frankfurt',   initials:'SGE', city:'Frankfurt',    stadium:'Deutsche Bank Park',          stadiumCapacity:51500,  competitions:['bundesliga'],                        foundedYear:1899, manager:'Dino Toppmöller',     color:'#000000' },
  { id:'freiburg',     slug:'freiburg',           name:'SC Freiburg',              shortName:'Freiburg',    initials:'SCF', city:'Freiburg',     stadium:'Europa-Park Stadion',         stadiumCapacity:34700,  competitions:['bundesliga'],                        foundedYear:1904, manager:'Julian Schuster',     color:'#CC0000' },
  { id:'leipzig',      slug:'rb-leipzig',         name:'RB Leipzig',               shortName:'Leipzig',     initials:'RBL', city:'Leipzig',      stadium:'Red Bull Arena',              stadiumCapacity:47069,  competitions:['bundesliga'],                        foundedYear:2009, manager:'Marco Rose',           color:'#DD0741' },
  { id:'stuttgart',    slug:'vfb-stuttgart',      name:'VfB Stuttgart',            shortName:'Stuttgart',   initials:'VFB', city:'Stuttgart',    stadium:'MHPArena',                    stadiumCapacity:60449,  competitions:['bundesliga'],                        foundedYear:1893, manager:'Sebastian Hoeneß',    color:'#E32221' },
  { id:'wolfsburg',    slug:'wolfsburg',          name:'VfL Wolfsburg',            shortName:'Wolfsburg',   initials:'WOB', city:'Wolfsburg',    stadium:'Volkswagen Arena',            stadiumCapacity:30000,  competitions:['bundesliga'],                        foundedYear:1945, manager:'Ralph Hasenhüttl',    color:'#65B32E' },

  // ─── Serie A ─────────────────────────────────────────────────
  { id:'inter',        slug:'inter-milan',        name:'Inter Milan',              shortName:'Inter',       initials:'INT', city:'Milan',        stadium:'Stadio Giuseppe Meazza',      stadiumCapacity:80018,  competitions:['serie-a','champions-league'],         foundedYear:1908, manager:'Simone Inzaghi',      color:'#0068A8' },
  { id:'napoli',       slug:'napoli',             name:'SSC Napoli',               shortName:'Napoli',      initials:'NAP', city:'Naples',       stadium:'Stadio Diego Armando Maradona',stadiumCapacity:54726, competitions:['serie-a'],                           foundedYear:1926, manager:'Antonio Conte',       color:'#12A0D7' },
  { id:'juventus',     slug:'juventus',           name:'Juventus FC',              shortName:'Juventus',    initials:'JUV', city:'Turin',        stadium:'Allianz Stadium',             stadiumCapacity:41507,  competitions:['serie-a'],                           foundedYear:1897, manager:'Thiago Motta',        color:'#111827' },
  { id:'milan',        slug:'ac-milan',           name:'AC Milan',                 shortName:'AC Milan',    initials:'MIL', city:'Milan',        stadium:'Stadio Giuseppe Meazza',      stadiumCapacity:80018,  competitions:['serie-a'],                           foundedYear:1899, manager:'Paulo Fonseca',        color:'#FB090B' },
  { id:'roma',         slug:'as-roma',            name:'AS Roma',                  shortName:'Roma',        initials:'ROM', city:'Rome',         stadium:'Stadio Olimpico',             stadiumCapacity:70634,  competitions:['serie-a'],                           foundedYear:1927, manager:'Ivan Juric',           color:'#8B0000' },
  { id:'lazio',        slug:'ss-lazio',           name:'SS Lazio',                 shortName:'Lazio',       initials:'LAZ', city:'Rome',         stadium:'Stadio Olimpico',             stadiumCapacity:70634,  competitions:['serie-a'],                           foundedYear:1900, manager:'Marco Baroni',         color:'#87CEEB' },
  { id:'atalanta',     slug:'atalanta',           name:'Atalanta BC',              shortName:'Atalanta',    initials:'ATA', city:'Bergamo',      stadium:'Gewiss Stadium',              stadiumCapacity:24050,  competitions:['serie-a'],                           foundedYear:1907, manager:'Gian Piero Gasperini',color:'#1E3A5F' },
  { id:'fiorentina',   slug:'fiorentina',         name:'ACF Fiorentina',           shortName:'Fiorentina',  initials:'FIO', city:'Florence',     stadium:'Stadio Artemio Franchi',      stadiumCapacity:43147,  competitions:['serie-a'],                           foundedYear:1926, manager:'Raffaele Palladino',  color:'#6B0DA0' },

  // ─── Ligue 1 ─────────────────────────────────────────────────
  { id:'psg',          slug:'paris-saint-germain',name:'Paris Saint-Germain',      shortName:'PSG',         initials:'PSG', city:'Paris',        stadium:'Parc des Princes',            stadiumCapacity:47929,  competitions:['ligue-1','champions-league'],         foundedYear:1970, manager:'Luis Enrique',        color:'#004170' },
  { id:'marseille',    slug:'marseille',          name:'Olympique de Marseille',   shortName:'Marseille',   initials:'OM',  city:'Marseille',    stadium:'Stade Vélodrome',             stadiumCapacity:67394,  competitions:['ligue-1'],                           foundedYear:1899, manager:'Roberto De Zerbi',    color:'#2FAEE0' },
  { id:'nice',         slug:'nice',               name:'OGC Nice',                 shortName:'Nice',        initials:'OGC', city:'Nice',         stadium:'Allianz Riviera',             stadiumCapacity:35624,  competitions:['ligue-1'],                           foundedYear:1904, manager:'Franck Haise',         color:'#DC1414' },
  { id:'lens',         slug:'lens',               name:'RC Lens',                  shortName:'Lens',        initials:'RCL', city:'Lens',         stadium:'Stade Bollaert-Delelis',      stadiumCapacity:38223,  competitions:['ligue-1'],                           foundedYear:1906, manager:'Will Still',           color:'#D8AF2C' },
  { id:'monaco',       slug:'monaco',             name:'AS Monaco',                shortName:'Monaco',      initials:'MON', city:'Monaco',       stadium:'Stade Louis II',              stadiumCapacity:18523,  competitions:['ligue-1'],                           foundedYear:1924, manager:'Adi Hütter',           color:'#CF3731' },
  { id:'lyon',         slug:'olympique-lyonnais', name:'Olympique Lyonnais',       shortName:'Lyon',        initials:'OL',  city:'Lyon',         stadium:'Groupama Stadium',            stadiumCapacity:59186,  competitions:['ligue-1'],                           foundedYear:1950, manager:'Pierre Sage',          color:'#CC0033' },
  { id:'rennes',       slug:'stade-rennais',      name:'Stade Rennais',            shortName:'Rennes',      initials:'STA', city:'Rennes',       stadium:'Roazhon Park',                stadiumCapacity:29778,  competitions:['ligue-1'],                           foundedYear:1901, manager:'Jorge Sampaoli',       color:'#CC0000' },
  { id:'lille',        slug:'losc-lille',         name:'LOSC Lille',               shortName:'Lille',       initials:'LOS', city:'Lille',        stadium:'Stade Pierre-Mauroy',         stadiumCapacity:49712,  competitions:['ligue-1'],                           foundedYear:1944, manager:'Bruno Génésio',       color:'#D9222A' },
]

/**
 * slug로 팀 검색
 * @param {string} slug
 * @returns {Team|undefined}
 */
export function getTeamBySlug(slug) {
  return TEAMS.find(t => t.slug === slug)
}

/**
 * 대회 slug로 참가 팀 필터
 * @param {string} competitionSlug
 * @returns {Team[]}
 */
export function getTeamsByCompetition(competitionSlug) {
  return TEAMS.filter(t => t.competitions.includes(competitionSlug))
}
