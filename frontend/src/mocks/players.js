/**
 * Mock 선수 데이터
 * 백엔드 연결 전 화면 검증용. 실제 서비스 데이터가 아닙니다.
 * 기준 시점: 2026-11-23 (발표용 고정 기준일)
 */

/** @type {import('./players').Player[]} */
export const PLAYERS = [
  // EPL
  { id:'haaland',    slug:'erling-haaland',   name:'Erling Haaland',    shortName:'Haaland',    nationality:'Norway',      dateOfBirth:'2000-07-21', position:'FWD', number:9,  teamId:'mancity',  teamSlug:'manchester-city',   teamName:'Manchester City' },
  { id:'salah',      slug:'mohamed-salah',     name:'Mohamed Salah',     shortName:'Salah',      nationality:'Egypt',       dateOfBirth:'1992-06-15', position:'FWD', number:11, teamId:'liverpool',teamSlug:'liverpool',          teamName:'Liverpool' },
  { id:'saka',       slug:'bukayo-saka',       name:'Bukayo Saka',       shortName:'Saka',       nationality:'England',     dateOfBirth:'2001-09-05', position:'MID', number:7,  teamId:'arsenal',  teamSlug:'arsenal',           teamName:'Arsenal' },
  { id:'son',        slug:'son-heung-min',     name:'Son Heung-min',     shortName:'Son',        nationality:'South Korea', dateOfBirth:'1992-07-08', position:'FWD', number:7,  teamId:'spurs',    teamSlug:'tottenham',         teamName:'Tottenham Hotspur' },
  { id:'palmer',     slug:'cole-palmer',       name:'Cole Palmer',       shortName:'Palmer',     nationality:'England',     dateOfBirth:'2002-05-06', position:'MID', number:20, teamId:'chelsea',  teamSlug:'chelsea',           teamName:'Chelsea' },
  { id:'isak',       slug:'alexander-isak',    name:'Alexander Isak',    shortName:'Isak',       nationality:'Sweden',      dateOfBirth:'1999-09-21', position:'FWD', number:14, teamId:'newcastle',teamSlug:'newcastle',          teamName:'Newcastle United' },
  { id:'odegaard',   slug:'martin-odegaard',   name:'Martin Ødegaard',   shortName:'Ødegaard',   nationality:'Norway',      dateOfBirth:'1998-12-17', position:'MID', number:8,  teamId:'arsenal',  teamSlug:'arsenal',           teamName:'Arsenal' },
  { id:'fernandes',  slug:'bruno-fernandes',   name:'Bruno Fernandes',   shortName:'B.Fernandes',nationality:'Portugal',    dateOfBirth:'1994-09-08', position:'MID', number:8,  teamId:'manutd',   teamSlug:'manchester-united', teamName:'Manchester United' },
  // La Liga
  { id:'lewandowski',slug:'robert-lewandowski',name:'Robert Lewandowski', shortName:'Lewandowski',nationality:'Poland',      dateOfBirth:'1988-08-21', position:'FWD', number:9,  teamId:'barca',    teamSlug:'barcelona',         teamName:'FC Barcelona' },
  { id:'bellingham', slug:'jude-bellingham',   name:'Jude Bellingham',   shortName:'Bellingham', nationality:'England',     dateOfBirth:'2003-06-29', position:'MID', number:5,  teamId:'realmadrid',teamSlug:'real-madrid',       teamName:'Real Madrid' },
  { id:'vinicius',   slug:'vinicius-junior',   name:'Vinicius Jr.',      shortName:'Vinicius Jr.',nationality:'Brazil',     dateOfBirth:'2000-07-12', position:'FWD', number:7,  teamId:'realmadrid',teamSlug:'real-madrid',       teamName:'Real Madrid' },
  // Bundesliga
  { id:'kane',       slug:'harry-kane',        name:'Harry Kane',        shortName:'Kane',       nationality:'England',     dateOfBirth:'1993-07-28', position:'FWD', number:9,  teamId:'bayernmunich',teamSlug:'bayern-munich',    teamName:'FC Bayern München' },
  { id:'musiala',    slug:'jamal-musiala',     name:'Jamal Musiala',     shortName:'Musiala',    nationality:'Germany',     dateOfBirth:'2003-02-26', position:'MID', number:42, teamId:'bayernmunich',teamSlug:'bayern-munich',    teamName:'FC Bayern München' },
  // Serie A
  { id:'osimhen',    slug:'victor-osimhen',    name:'Victor Osimhen',    shortName:'Osimhen',    nationality:'Nigeria',     dateOfBirth:'1998-12-29', position:'FWD', number:9,  teamId:'napoli',   teamSlug:'napoli',            teamName:'SSC Napoli' },
  { id:'lautaro',    slug:'lautaro-martinez',  name:'Lautaro Martínez',  shortName:'Lautaro',    nationality:'Argentina',   dateOfBirth:'1997-08-22', position:'FWD', number:10, teamId:'inter',    teamSlug:'inter-milan',       teamName:'Inter Milan' },
  // Ligue 1 / UCL
  { id:'dembele',    slug:'ousmane-dembele',   name:'Ousmane Dembélé',   shortName:'Dembélé',    nationality:'France',      dateOfBirth:'1997-05-15', position:'FWD', number:23, teamId:'psg',      teamSlug:'paris-saint-germain',teamName:'Paris Saint-Germain' },
]

/**
 * 선수별 시즌 통계
 * @type {Record<string, Array<Object>>}
 */
export const PLAYER_STATS = {
  haaland: [
    { competitionId:'epl',  competitionName:'Premier League',        appearances:12, starts:12, minutesPlayed:1040, goals:14, assists:3, yellowCards:1, redCards:0, dataStatus:'confirmed' },
    { competitionId:'ucl',  competitionName:'UEFA Champions League', appearances:4,  starts:4,  minutesPlayed:360,  goals:5,  assists:1, yellowCards:0, redCards:0, dataStatus:'confirmed' },
  ],
  salah: [
    { competitionId:'epl',  competitionName:'Premier League',        appearances:12, starts:12, minutesPlayed:1062, goals:11, assists:7, yellowCards:0, redCards:0, dataStatus:'confirmed' },
    { competitionId:'ucl',  competitionName:'UEFA Champions League', appearances:4,  starts:4,  minutesPlayed:360,  goals:3,  assists:2, yellowCards:1, redCards:0, dataStatus:'confirmed' },
  ],
  saka: [
    { competitionId:'epl',  competitionName:'Premier League',        appearances:11, starts:11, minutesPlayed:952,  goals:8,  assists:9, yellowCards:2, redCards:0, dataStatus:'confirmed' },
    { competitionId:'ucl',  competitionName:'UEFA Champions League', appearances:4,  starts:4,  minutesPlayed:360,  goals:2,  assists:3, yellowCards:0, redCards:0, dataStatus:'confirmed' },
  ],
  son: [
    { competitionId:'epl',  competitionName:'Premier League',        appearances:12, starts:10, minutesPlayed:905,  goals:9,  assists:5, yellowCards:1, redCards:0, dataStatus:'confirmed' },
  ],
  palmer: [
    { competitionId:'epl',  competitionName:'Premier League',        appearances:11, starts:11, minutesPlayed:980,  goals:8,  assists:6, yellowCards:1, redCards:0, dataStatus:'confirmed' },
    { competitionId:'ucl',  competitionName:'UEFA Champions League', appearances:4,  starts:4,  minutesPlayed:360,  goals:2,  assists:2, yellowCards:0, redCards:0, dataStatus:'pending'   },
  ],
  isak: [
    { competitionId:'epl',  competitionName:'Premier League',        appearances:10, starts:10, minutesPlayed:880,  goals:7,  assists:2, yellowCards:2, redCards:0, dataStatus:'confirmed' },
    { competitionId:'ucl',  competitionName:'UEFA Champions League', appearances:4,  starts:4,  minutesPlayed:340,  goals:2,  assists:1, yellowCards:0, redCards:0, dataStatus:'confirmed' },
  ],
  lewandowski: [
    { competitionId:'laliga',competitionName:'La Liga',               appearances:12, starts:12, minutesPlayed:1020, goals:11, assists:4, yellowCards:1, redCards:0, dataStatus:'confirmed' },
    { competitionId:'ucl',  competitionName:'UEFA Champions League', appearances:4,  starts:4,  minutesPlayed:360,  goals:4,  assists:2, yellowCards:0, redCards:0, dataStatus:'confirmed' },
  ],
  bellingham: [
    { competitionId:'laliga',competitionName:'La Liga',               appearances:12, starts:12, minutesPlayed:1050, goals:9,  assists:7, yellowCards:2, redCards:0, dataStatus:'confirmed' },
    { competitionId:'ucl',  competitionName:'UEFA Champions League', appearances:4,  starts:4,  minutesPlayed:360,  goals:3,  assists:3, yellowCards:0, redCards:0, dataStatus:'confirmed' },
  ],
  vinicius: [
    { competitionId:'laliga',competitionName:'La Liga',               appearances:11, starts:11, minutesPlayed:940,  goals:7,  assists:6, yellowCards:3, redCards:0, dataStatus:'confirmed' },
    { competitionId:'ucl',  competitionName:'UEFA Champions League', appearances:4,  starts:4,  minutesPlayed:360,  goals:2,  assists:3, yellowCards:1, redCards:0, dataStatus:'confirmed' },
  ],
  kane: [
    { competitionId:'bundesliga',competitionName:'Bundesliga',         appearances:11, starts:11, minutesPlayed:980,  goals:11, assists:5, yellowCards:1, redCards:0, dataStatus:'confirmed' },
    { competitionId:'ucl',  competitionName:'UEFA Champions League', appearances:4,  starts:4,  minutesPlayed:360,  goals:5,  assists:3, yellowCards:0, redCards:0, dataStatus:'confirmed' },
  ],
  musiala: [
    { competitionId:'bundesliga',competitionName:'Bundesliga',         appearances:11, starts:10, minutesPlayed:870,  goals:6,  assists:8, yellowCards:1, redCards:0, dataStatus:'confirmed' },
    { competitionId:'ucl',  competitionName:'UEFA Champions League', appearances:4,  starts:4,  minutesPlayed:360,  goals:2,  assists:4, yellowCards:0, redCards:0, dataStatus:'confirmed' },
  ],
  osimhen: [
    { competitionId:'seriea',competitionName:'Serie A',                appearances:12, starts:12, minutesPlayed:1040, goals:10, assists:2, yellowCards:2, redCards:0, dataStatus:'confirmed' },
  ],
  lautaro: [
    { competitionId:'seriea',competitionName:'Serie A',                appearances:12, starts:12, minutesPlayed:1020, goals:8,  assists:5, yellowCards:1, redCards:0, dataStatus:'confirmed' },
    { competitionId:'ucl',  competitionName:'UEFA Champions League', appearances:4,  starts:4,  minutesPlayed:360,  goals:2,  assists:1, yellowCards:0, redCards:0, dataStatus:'confirmed' },
  ],
  dembele: [
    { competitionId:'ligue1',competitionName:'Ligue 1',                appearances:12, starts:11, minutesPlayed:990,  goals:8,  assists:9, yellowCards:1, redCards:0, dataStatus:'confirmed' },
    { competitionId:'ucl',  competitionName:'UEFA Champions League', appearances:4,  starts:4,  minutesPlayed:360,  goals:2,  assists:3, yellowCards:1, redCards:0, dataStatus:'confirmed' },
  ],
}

// ── EPL 순위 ──────────────────────────────────────────────────────
export const TOP_SCORERS = [
  { rank:1, playerId:'haaland',   playerSlug:'erling-haaland',    playerName:'E. Haaland',    teamName:'Man City',  teamInitials:'MC',  teamColor:'#6CABDD', value:14 },
  { rank:2, playerId:'salah',     playerSlug:'mohamed-salah',     playerName:'M. Salah',      teamName:'Liverpool', teamInitials:'LIV', teamColor:'#C8102E', value:11 },
  { rank:3, playerId:'saka',      playerSlug:'bukayo-saka',       playerName:'B. Saka',       teamName:'Arsenal',   teamInitials:'ARS', teamColor:'#EF0107', value:8  },
  { rank:4, playerId:'palmer',    playerSlug:'cole-palmer',       playerName:'C. Palmer',     teamName:'Chelsea',   teamInitials:'CHE', teamColor:'#034694', value:8  },
  { rank:5, playerId:'son',       playerSlug:'son-heung-min',     playerName:'H. Son',        teamName:'Spurs',     teamInitials:'TOT', teamColor:'#132257', value:9  },
]

export const TOP_ASSISTERS = [
  { rank:1, playerId:'saka',      playerSlug:'bukayo-saka',       playerName:'B. Saka',       teamName:'Arsenal',   teamInitials:'ARS', teamColor:'#EF0107', value:9 },
  { rank:2, playerId:'salah',     playerSlug:'mohamed-salah',     playerName:'M. Salah',      teamName:'Liverpool', teamInitials:'LIV', teamColor:'#C8102E', value:7 },
  { rank:3, playerId:'palmer',    playerSlug:'cole-palmer',       playerName:'C. Palmer',     teamName:'Chelsea',   teamInitials:'CHE', teamColor:'#034694', value:6 },
  { rank:4, playerId:'son',       playerSlug:'son-heung-min',     playerName:'H. Son',        teamName:'Spurs',     teamInitials:'TOT', teamColor:'#132257', value:5 },
  { rank:5, playerId:'haaland',   playerSlug:'erling-haaland',    playerName:'E. Haaland',    teamName:'Man City',  teamInitials:'MC',  teamColor:'#6CABDD', value:3 },
]

// ── 대회별 득점·도움 순위 (CompetitionPage 사용) ──────────────────
export const COMPETITION_SCORERS = {
  'premier-league': [
    { rank:1, playerId:'haaland',   playerSlug:'erling-haaland',    playerName:'E. Haaland',    teamName:'Man City',  teamInitials:'MC',  teamColor:'#6CABDD', value:14 },
    { rank:2, playerId:'salah',     playerSlug:'mohamed-salah',     playerName:'M. Salah',      teamName:'Liverpool', teamInitials:'LIV', teamColor:'#C8102E', value:11 },
    { rank:3, playerId:'son',       playerSlug:'son-heung-min',     playerName:'H. Son',        teamName:'Spurs',     teamInitials:'TOT', teamColor:'#132257', value:9  },
    { rank:4, playerId:'saka',      playerSlug:'bukayo-saka',       playerName:'B. Saka',       teamName:'Arsenal',   teamInitials:'ARS', teamColor:'#EF0107', value:8  },
    { rank:5, playerId:'palmer',    playerSlug:'cole-palmer',       playerName:'C. Palmer',     teamName:'Chelsea',   teamInitials:'CHE', teamColor:'#034694', value:8  },
    { rank:6, playerId:'isak',      playerSlug:'alexander-isak',    playerName:'A. Isak',       teamName:'Newcastle', teamInitials:'NEW', teamColor:'#241F20', value:7  },
  ],
  'la-liga': [
    { rank:1, playerId:'lewandowski',playerSlug:'robert-lewandowski',playerName:'R. Lewandowski',teamName:'Barcelona', teamInitials:'FCB', teamColor:'#004D98', value:11 },
    { rank:2, playerId:'bellingham', playerSlug:'jude-bellingham',   playerName:'J. Bellingham', teamName:'Real Madrid',teamInitials:'RMA', teamColor:'#FEBE10', value:9  },
    { rank:3, playerId:'vinicius',   playerSlug:'vinicius-junior',   playerName:'Vinicius Jr.',  teamName:'Real Madrid',teamInitials:'RMA', teamColor:'#FEBE10', value:7  },
    { rank:4, playerId:'griezmann',  playerSlug:'antoine-griezmann', playerName:'A. Griezmann', teamName:'Atlético',  teamInitials:'ATM', teamColor:'#CB3524', value:6  },
    { rank:5, playerId:'oyarzabal',  playerSlug:'mikel-oyarzabal',   playerName:'M. Oyarzabal', teamName:'Sociedad',  teamInitials:'RSO', teamColor:'#003F91', value:5  },
  ],
  'bundesliga': [
    { rank:1, playerId:'kane',      playerSlug:'harry-kane',        playerName:'H. Kane',       teamName:'Bayern',    teamInitials:'BAY', teamColor:'#DC052D', value:11 },
    { rank:2, playerId:'wirtz',     playerSlug:'florian-wirtz',     playerName:'F. Wirtz',      teamName:'Leverkusen',teamInitials:'LEV', teamColor:'#E32221', value:8  },
    { rank:3, playerId:'musiala',   playerSlug:'jamal-musiala',     playerName:'J. Musiala',    teamName:'Bayern',    teamInitials:'BAY', teamColor:'#DC052D', value:6  },
    { rank:4, playerId:'adeyemi',   playerSlug:'karim-adeyemi',     playerName:'K. Adeyemi',    teamName:'Dortmund',  teamInitials:'BVB', teamColor:'#FDE100', value:5  },
    { rank:5, playerId:'boniface',  playerSlug:'victor-boniface',   playerName:'V. Boniface',   teamName:'Leverkusen',teamInitials:'LEV', teamColor:'#E32221', value:5  },
  ],
  'serie-a': [
    { rank:1, playerId:'osimhen',   playerSlug:'victor-osimhen',    playerName:'V. Osimhen',    teamName:'Napoli',    teamInitials:'NAP', teamColor:'#12A0D7', value:10 },
    { rank:2, playerId:'lautaro',   playerSlug:'lautaro-martinez',  playerName:'L. Martínez',   teamName:'Inter',     teamInitials:'INT', teamColor:'#0068A8', value:8  },
    { rank:3, playerId:'vlahovic',  playerSlug:'dusan-vlahovic',    playerName:'D. Vlahović',   teamName:'Juventus',  teamInitials:'JUV', teamColor:'#111827', value:7  },
    { rank:4, playerId:'kvara',     playerSlug:'khvicha-kvaratskhelia',playerName:'Kvaratskhelia',teamName:'Napoli', teamInitials:'NAP', teamColor:'#12A0D7', value:6  },
    { rank:5, playerId:'dybala',    playerSlug:'paulo-dybala',      playerName:'P. Dybala',     teamName:'Roma',      teamInitials:'ROM', teamColor:'#8B0000', value:5  },
  ],
  'ligue-1': [
    { rank:1, playerId:'dembele',   playerSlug:'ousmane-dembele',   playerName:'O. Dembélé',    teamName:'PSG',       teamInitials:'PSG', teamColor:'#004170', value:8  },
    { rank:2, playerId:'aubameyang',playerSlug:'pierre-aubameyang', playerName:'P. Aubameyang', teamName:'Marseille', teamInitials:'OM',  teamColor:'#2FAEE0', value:7  },
    { rank:3, playerId:'leekangin', playerSlug:'lee-kang-in',       playerName:'Lee Kang-in',   teamName:'PSG',       teamInitials:'PSG', teamColor:'#004170', value:6  },
    { rank:4, playerId:'balogun',   playerSlug:'folarin-balogun',   playerName:'F. Balogun',    teamName:'Nice',      teamInitials:'OGC', teamColor:'#DC1414', value:5  },
    { rank:5, playerId:'benganda',  playerSlug:'tino-kadewere',     playerName:'T. Kadewere',   teamName:'Lyon',      teamInitials:'OL',  teamColor:'#CC0033', value:4  },
  ],
  'champions-league': [
    { rank:1, playerId:'haaland',   playerSlug:'erling-haaland',    playerName:'E. Haaland',    teamName:'Man City',  teamInitials:'MC',  teamColor:'#6CABDD', value:5  },
    { rank:2, playerId:'kane',      playerSlug:'harry-kane',        playerName:'H. Kane',       teamName:'Bayern',    teamInitials:'BAY', teamColor:'#DC052D', value:5  },
    { rank:3, playerId:'lewandowski',playerSlug:'robert-lewandowski',playerName:'R. Lewandowski',teamName:'Barcelona', teamInitials:'FCB', teamColor:'#004D98', value:4  },
    { rank:4, playerId:'salah',     playerSlug:'mohamed-salah',     playerName:'M. Salah',      teamName:'Liverpool', teamInitials:'LIV', teamColor:'#C8102E', value:3  },
    { rank:5, playerId:'bellingham',playerSlug:'jude-bellingham',   playerName:'J. Bellingham', teamName:'Real Madrid',teamInitials:'RMA', teamColor:'#FEBE10', value:3  },
  ],
}

export const COMPETITION_ASSISTERS = {
  'premier-league': [
    { rank:1, playerId:'saka',      playerSlug:'bukayo-saka',       playerName:'B. Saka',       teamName:'Arsenal',   teamInitials:'ARS', teamColor:'#EF0107', value:9 },
    { rank:2, playerId:'salah',     playerSlug:'mohamed-salah',     playerName:'M. Salah',      teamName:'Liverpool', teamInitials:'LIV', teamColor:'#C8102E', value:7 },
    { rank:3, playerId:'palmer',    playerSlug:'cole-palmer',       playerName:'C. Palmer',     teamName:'Chelsea',   teamInitials:'CHE', teamColor:'#034694', value:6 },
    { rank:4, playerId:'son',       playerSlug:'son-heung-min',     playerName:'H. Son',        teamName:'Spurs',     teamInitials:'TOT', teamColor:'#132257', value:5 },
    { rank:5, playerId:'haaland',   playerSlug:'erling-haaland',    playerName:'E. Haaland',    teamName:'Man City',  teamInitials:'MC',  teamColor:'#6CABDD', value:3 },
  ],
  'la-liga': [
    { rank:1, playerId:'bellingham',playerSlug:'jude-bellingham',   playerName:'J. Bellingham', teamName:'Real Madrid',teamInitials:'RMA', teamColor:'#FEBE10', value:7 },
    { rank:2, playerId:'vinicius',  playerSlug:'vinicius-junior',   playerName:'Vinicius Jr.',  teamName:'Real Madrid',teamInitials:'RMA', teamColor:'#FEBE10', value:6 },
    { rank:3, playerId:'lewandowski',playerSlug:'robert-lewandowski',playerName:'R. Lewandowski',teamName:'Barcelona', teamInitials:'FCB', teamColor:'#004D98', value:4 },
    { rank:4, playerId:'pedri',     playerSlug:'pedri',             playerName:'Pedri',         teamName:'Barcelona', teamInitials:'FCB', teamColor:'#004D98', value:4 },
    { rank:5, playerId:'de-paul',   playerSlug:'rodrigo-de-paul',   playerName:'R. De Paul',    teamName:'Atlético',  teamInitials:'ATM', teamColor:'#CB3524', value:3 },
  ],
  'bundesliga': [
    { rank:1, playerId:'musiala',   playerSlug:'jamal-musiala',     playerName:'J. Musiala',    teamName:'Bayern',    teamInitials:'BAY', teamColor:'#DC052D', value:8 },
    { rank:2, playerId:'kane',      playerSlug:'harry-kane',        playerName:'H. Kane',       teamName:'Bayern',    teamInitials:'BAY', teamColor:'#DC052D', value:5 },
    { rank:3, playerId:'wirtz',     playerSlug:'florian-wirtz',     playerName:'F. Wirtz',      teamName:'Leverkusen',teamInitials:'LEV', teamColor:'#E32221', value:5 },
    { rank:4, playerId:'simons',    playerSlug:'xavi-simons',       playerName:'X. Simons',     teamName:'Leipzig',   teamInitials:'RBL', teamColor:'#DD0741', value:4 },
    { rank:5, playerId:'brandt',    playerSlug:'julian-brandt',     playerName:'J. Brandt',     teamName:'Dortmund',  teamInitials:'BVB', teamColor:'#FDE100', value:4 },
  ],
  'serie-a': [
    { rank:1, playerId:'kvara',     playerSlug:'khvicha-kvaratskhelia',playerName:'Kvaratskhelia',teamName:'Napoli', teamInitials:'NAP', teamColor:'#12A0D7', value:7 },
    { rank:2, playerId:'lautaro',   playerSlug:'lautaro-martinez',  playerName:'L. Martínez',   teamName:'Inter',     teamInitials:'INT', teamColor:'#0068A8', value:5 },
    { rank:3, playerId:'pellegrini',playerSlug:'lorenzo-pellegrini',playerName:'L. Pellegrini', teamName:'Roma',      teamInitials:'ROM', teamColor:'#8B0000', value:5 },
    { rank:4, playerId:'dybala',    playerSlug:'paulo-dybala',      playerName:'P. Dybala',     teamName:'Roma',      teamInitials:'ROM', teamColor:'#8B0000', value:4 },
    { rank:5, playerId:'calhanoglu',playerSlug:'hakan-calhanoglu',  playerName:'H. Çalhanoğlu', teamName:'Inter',     teamInitials:'INT', teamColor:'#0068A8', value:4 },
  ],
  'ligue-1': [
    { rank:1, playerId:'dembele',   playerSlug:'ousmane-dembele',   playerName:'O. Dembélé',    teamName:'PSG',       teamInitials:'PSG', teamColor:'#004170', value:9 },
    { rank:2, playerId:'vitinha',   playerSlug:'vitinha',           playerName:'Vitinha',       teamName:'PSG',       teamInitials:'PSG', teamColor:'#004170', value:6 },
    { rank:3, playerId:'harit',     playerSlug:'amine-harit',       playerName:'A. Harit',      teamName:'Marseille', teamInitials:'OM',  teamColor:'#2FAEE0', value:5 },
    { rank:4, playerId:'lacazette', playerSlug:'alexandre-lacazette',playerName:'A. Lacazette', teamName:'Lyon',      teamInitials:'OL',  teamColor:'#CC0033', value:4 },
    { rank:5, playerId:'maruull',   playerSlug:'ben-yedder',        playerName:'W. Ben Yedder', teamName:'Monaco',    teamInitials:'MON', teamColor:'#CF3731', value:3 },
  ],
  'champions-league': [
    { rank:1, playerId:'musiala',   playerSlug:'jamal-musiala',     playerName:'J. Musiala',    teamName:'Bayern',    teamInitials:'BAY', teamColor:'#DC052D', value:4 },
    { rank:2, playerId:'saka',      playerSlug:'bukayo-saka',       playerName:'B. Saka',       teamName:'Arsenal',   teamInitials:'ARS', teamColor:'#EF0107', value:3 },
    { rank:3, playerId:'bellingham',playerSlug:'jude-bellingham',   playerName:'J. Bellingham', teamName:'Real Madrid',teamInitials:'RMA', teamColor:'#FEBE10', value:3 },
    { rank:4, playerId:'dembele',   playerSlug:'ousmane-dembele',   playerName:'O. Dembélé',    teamName:'PSG',       teamInitials:'PSG', teamColor:'#004170', value:3 },
    { rank:5, playerId:'vinicius',  playerSlug:'vinicius-junior',   playerName:'Vinicius Jr.',  teamName:'Real Madrid',teamInitials:'RMA', teamColor:'#FEBE10', value:3 },
  ],
}

/**
 * 전체 대회 합산 득점 순위 (홈 화면, 내림차순 정렬)
 * 승점: EPL+UCL 합산
 */
export const TOP_SCORERS_ALL = [
  { rank:1, playerId:'haaland',    playerSlug:'erling-haaland',    playerName:'E. Haaland',    teamName:'Man City',   teamInitials:'MC',  teamColor:'#6CABDD', value:19, breakdown:[{ competition:'EPL', goals:14 }, { competition:'UCL', goals:5 }] },
  { rank:2, playerId:'kane',       playerSlug:'harry-kane',        playerName:'H. Kane',       teamName:'Bayern',     teamInitials:'BAY', teamColor:'#DC052D', value:16, breakdown:[{ competition:'BL',  goals:11 }, { competition:'UCL', goals:5 }] },
  { rank:3, playerId:'lewandowski',playerSlug:'robert-lewandowski',playerName:'R. Lewandowski',teamName:'Barcelona',  teamInitials:'FCB', teamColor:'#004D98', value:15, breakdown:[{ competition:'LL',  goals:11 }, { competition:'UCL', goals:4 }] },
  { rank:4, playerId:'salah',      playerSlug:'mohamed-salah',     playerName:'M. Salah',      teamName:'Liverpool',  teamInitials:'LIV', teamColor:'#C8102E', value:14, breakdown:[{ competition:'EPL', goals:11 }, { competition:'UCL', goals:3 }] },
  { rank:5, playerId:'osimhen',    playerSlug:'victor-osimhen',    playerName:'V. Osimhen',    teamName:'Napoli',     teamInitials:'NAP', teamColor:'#12A0D7', value:10, breakdown:[{ competition:'SA',  goals:10 }] },
  { rank:6, playerId:'saka',       playerSlug:'bukayo-saka',       playerName:'B. Saka',       teamName:'Arsenal',    teamInitials:'ARS', teamColor:'#EF0107', value:10, breakdown:[{ competition:'EPL', goals:8  }, { competition:'UCL', goals:2 }] },
  { rank:7, playerId:'palmer',     playerSlug:'cole-palmer',       playerName:'C. Palmer',     teamName:'Chelsea',    teamInitials:'CHE', teamColor:'#034694', value:10, breakdown:[{ competition:'EPL', goals:8  }, { competition:'UCL', goals:2 }] },
  { rank:8, playerId:'son',        playerSlug:'son-heung-min',     playerName:'H. Son',        teamName:'Spurs',      teamInitials:'TOT', teamColor:'#132257', value:9,  breakdown:[{ competition:'EPL', goals:9  }] },
]

/**
 * slug로 선수 검색
 * @param {string} slug
 * @returns {import('./players').Player|undefined}
 */
export function getPlayerBySlug(slug) {
  return PLAYERS.find(p => p.slug === slug)
}

/**
 * slug로 선수 통계 조회 (전체 또는 대회별 필터)
 * @param {string} slug
 * @param {string} [competitionId]
 * @returns {Array<Object>}
 */
export function getPlayerStats(slug, competitionId) {
  const player = PLAYERS.find(p => p.slug === slug)
  if (!player) return []
  const stats = PLAYER_STATS[player.id] ?? []
  if (competitionId && competitionId !== 'all') {
    return stats.filter(s => s.competitionId === competitionId)
  }
  return stats
}

/**
 * 대회별 득점 순위
 * @param {string} slug
 * @returns {Array<Object>}
 */
export function getCompetitionScorers(slug) {
  return COMPETITION_SCORERS[slug] ?? []
}

/**
 * 대회별 도움 순위
 * @param {string} slug
 * @returns {Array<Object>}
 */
export function getCompetitionAssisters(slug) {
  return COMPETITION_ASSISTERS[slug] ?? []
}

/**
 * 전체 대회 합산 통계 계산
 * @param {Array<Object>} stats
 * @returns {{ goals:number, assists:number, appearances:number, yellowCards:number, redCards:number }}
 */
export function calcTotalStats(stats) {
  return stats.reduce((acc, s) => ({
    goals:        acc.goals        + s.goals,
    assists:      acc.assists      + s.assists,
    appearances:  acc.appearances  + s.appearances,
    yellowCards:  acc.yellowCards  + s.yellowCards,
    redCards:     acc.redCards     + s.redCards,
  }), { goals:0, assists:0, appearances:0, yellowCards:0, redCards:0 })
}
