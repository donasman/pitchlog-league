/**
 * 팀·선수·대회 현지화 이름 테이블
 * id 키: mocks/teams.js, mocks/players.js, mocks/competitions.js의 id와 일치
 *
 * 구조: { en: string, ko: string, shortEn: string, shortKo: string }
 * 누락 시 getLocalizedName이 영어 이름으로 자동 폴백
 */

/** @type {Record<string, {en:string, ko:string, shortEn:string, shortKo:string}>} */
export const TEAM_NAMES = {
  // EPL
  mancity:      { en:'Manchester City',       ko:'맨체스터 시티',      shortEn:'Man City',   shortKo:'맨시티'    },
  arsenal:      { en:'Arsenal',               ko:'아스널',             shortEn:'Arsenal',    shortKo:'아스널'    },
  liverpool:    { en:'Liverpool',             ko:'리버풀',             shortEn:'Liverpool',  shortKo:'리버풀'    },
  chelsea:      { en:'Chelsea',               ko:'첼시',               shortEn:'Chelsea',    shortKo:'첼시'      },
  newcastle:    { en:'Newcastle United',      ko:'뉴캐슬 유나이티드',  shortEn:'Newcastle',  shortKo:'뉴캐슬'    },
  spurs:        { en:'Tottenham Hotspur',     ko:'토트넘 홋스퍼',      shortEn:'Spurs',      shortKo:'토트넘'    },
  manutd:       { en:'Manchester United',     ko:'맨체스터 유나이티드',shortEn:'Man Utd',    shortKo:'맨유'      },
  astonvilla:   { en:'Aston Villa',           ko:'아스턴 빌라',        shortEn:'Aston Villa',shortKo:'아스턴 빌라'},
  brighton:     { en:'Brighton',              ko:'브라이턴',           shortEn:'Brighton',   shortKo:'브라이턴'  },
  westham:      { en:'West Ham United',       ko:'웨스트햄 유나이티드',shortEn:'West Ham',   shortKo:'웨스트햄'  },
  wolves:       { en:'Wolverhampton',         ko:'울버햄프턴',         shortEn:'Wolves',     shortKo:'울버햄프턴'},
  nottmforest:  { en:'Nottingham Forest',     ko:'노팅엄 포레스트',    shortEn:"Nott'm Forest",shortKo:'노팅엄' },
  everton:      { en:'Everton',               ko:'에버턴',             shortEn:'Everton',    shortKo:'에버턴'    },
  fulham:       { en:'Fulham',                ko:'풀럼',               shortEn:'Fulham',     shortKo:'풀럼'      },
  bournemouth:  { en:'AFC Bournemouth',       ko:'AFC 본머스',         shortEn:'Bournemouth',shortKo:'본머스'    },
  crystalpalace:{ en:'Crystal Palace',        ko:'크리스탈 팰리스',    shortEn:'C. Palace',  shortKo:'크리스탈'  },
  brentford:    { en:'Brentford',             ko:'브렌트퍼드',         shortEn:'Brentford',  shortKo:'브렌트퍼드'},
  leicester:    { en:'Leicester City',        ko:'레스터 시티',        shortEn:'Leicester',  shortKo:'레스터'    },
  ipswich:      { en:'Ipswich Town',          ko:'입스위치 타운',      shortEn:'Ipswich',    shortKo:'입스위치'  },
  southampton:  { en:'Southampton',           ko:'사우샘프턴',         shortEn:'Southampton',shortKo:'사우샘프턴'},
  // La Liga
  realmadrid:   { en:'Real Madrid',           ko:'레알 마드리드',      shortEn:'Real Madrid',shortKo:'레알'      },
  barca:        { en:'FC Barcelona',          ko:'FC 바르셀로나',      shortEn:'Barcelona',  shortKo:'바르셀로나'},
  atletico:     { en:'Atlético Madrid',       ko:'아틀레티코 마드리드',shortEn:'Atlético',   shortKo:'아틀레티코'},
  bilbao:       { en:'Athletic Club',         ko:'아틀레틱 클럽',      shortEn:'Athletic',   shortKo:'아틀레틱'  },
  villarreal:   { en:'Villarreal CF',         ko:'비야레알 CF',        shortEn:'Villarreal', shortKo:'비야레알'  },
  girona:       { en:'Girona FC',             ko:'지로나 FC',          shortEn:'Girona',     shortKo:'지로나'    },
  betis:        { en:'Real Betis',            ko:'레알 베티스',        shortEn:'Betis',      shortKo:'베티스'    },
  sociedad:     { en:'Real Sociedad',         ko:'레알 소시에다드',    shortEn:'Sociedad',   shortKo:'소시에다드'},
  // Bundesliga
  bayernmunich: { en:'FC Bayern München',     ko:'FC 바이에른 뮌헨',   shortEn:'Bayern',     shortKo:'바이에른'  },
  dortmund:     { en:'Borussia Dortmund',     ko:'보루시아 도르트문트',shortEn:'Dortmund',   shortKo:'도르트문트'},
  leverkusen:   { en:'Bayer Leverkusen',      ko:'바이어 레버쿠젠',    shortEn:'Leverkusen', shortKo:'레버쿠젠'  },
  frankfurt:    { en:'Eintracht Frankfurt',   ko:'아인트라흐트 프랑크푸르트',shortEn:'Frankfurt',shortKo:'프랑크푸르트'},
  freiburg:     { en:'SC Freiburg',           ko:'SC 프라이부르크',    shortEn:'Freiburg',   shortKo:'프라이부르크'},
  leipzig:      { en:'RB Leipzig',            ko:'RB 라이프치히',      shortEn:'Leipzig',    shortKo:'라이프치히'},
  stuttgart:    { en:'VfB Stuttgart',         ko:'VfB 슈투트가르트',   shortEn:'Stuttgart',  shortKo:'슈투트가르트'},
  wolfsburg:    { en:'VfL Wolfsburg',         ko:'VfL 볼프스부르크',   shortEn:'Wolfsburg',  shortKo:'볼프스부르크'},
  // Serie A
  inter:        { en:'Inter Milan',           ko:'인터 밀란',          shortEn:'Inter',      shortKo:'인터'      },
  napoli:       { en:'SSC Napoli',            ko:'SSC 나폴리',         shortEn:'Napoli',     shortKo:'나폴리'    },
  juventus:     { en:'Juventus FC',           ko:'유벤투스 FC',        shortEn:'Juventus',   shortKo:'유벤투스'  },
  milan:        { en:'AC Milan',              ko:'AC 밀란',            shortEn:'AC Milan',   shortKo:'AC 밀란'   },
  roma:         { en:'AS Roma',               ko:'AS 로마',            shortEn:'Roma',       shortKo:'로마'      },
  lazio:        { en:'SS Lazio',              ko:'SS 라치오',          shortEn:'Lazio',      shortKo:'라치오'    },
  atalanta:     { en:'Atalanta BC',           ko:'아탈란타 BC',        shortEn:'Atalanta',   shortKo:'아탈란타'  },
  fiorentina:   { en:'ACF Fiorentina',        ko:'ACF 피오렌티나',     shortEn:'Fiorentina', shortKo:'피오렌티나'},
  // Ligue 1
  psg:          { en:'Paris Saint-Germain',   ko:'파리 생제르맹',      shortEn:'PSG',        shortKo:'PSG'       },
  marseille:    { en:'Olympique de Marseille',ko:'올랭피크 드 마르세유',shortEn:'Marseille',  shortKo:'마르세유'  },
  nice:         { en:'OGC Nice',              ko:'OGC 니스',           shortEn:'Nice',       shortKo:'니스'      },
  lens:         { en:'RC Lens',               ko:'RC 랑스',            shortEn:'Lens',       shortKo:'랑스'      },
  monaco:       { en:'AS Monaco',             ko:'AS 모나코',          shortEn:'Monaco',     shortKo:'모나코'    },
  lyon:         { en:'Olympique Lyonnais',    ko:'올랭피크 리옹',      shortEn:'Lyon',       shortKo:'리옹'      },
  rennes:       { en:'Stade Rennais',         ko:'스타드 렌',          shortEn:'Rennes',     shortKo:'렌'        },
  lille:        { en:'LOSC Lille',            ko:'LOSC 릴',            shortEn:'Lille',      shortKo:'릴'        },
}

/** @type {Record<string, {en:string, ko:string, shortEn:string, shortKo:string}>} */
export const PLAYER_NAMES = {
  haaland:      { en:'Erling Haaland',        ko:'엘링 홀란드',        shortEn:'Haaland',     shortKo:'홀란드'    },
  salah:        { en:'Mohamed Salah',         ko:'모하메드 살라',      shortEn:'Salah',       shortKo:'살라'      },
  saka:         { en:'Bukayo Saka',           ko:'부카요 사카',        shortEn:'Saka',        shortKo:'사카'      },
  son:          { en:'Son Heung-min',         ko:'손흥민',             shortEn:'Son',         shortKo:'손흥민'    },
  palmer:       { en:'Cole Palmer',           ko:'콜 팔머',            shortEn:'Palmer',      shortKo:'팔머'      },
  isak:         { en:'Alexander Isak',        ko:'알렉산더 이사크',    shortEn:'Isak',        shortKo:'이사크'    },
  odegaard:     { en:'Martin Ødegaard',       ko:'마르틴 외데고르',    shortEn:'Ødegaard',    shortKo:'외데고르'  },
  fernandes:    { en:'Bruno Fernandes',       ko:'브루노 페르난데스',  shortEn:'B.Fernandes', shortKo:'B.페르난데스'},
  lewandowski:  { en:'Robert Lewandowski',    ko:'로베르트 레반도프스키',shortEn:'Lewandowski',shortKo:'레반도프스키'},
  bellingham:   { en:'Jude Bellingham',       ko:'주드 벨링엄',        shortEn:'Bellingham',  shortKo:'벨링엄'    },
  vinicius:     { en:'Vinicius Jr.',          ko:'비니시우스 주니오르', shortEn:'Vinicius Jr.',shortKo:'비니시우스' },
  kane:         { en:'Harry Kane',            ko:'해리 케인',          shortEn:'Kane',        shortKo:'케인'      },
  musiala:      { en:'Jamal Musiala',         ko:'야말 무시알라',      shortEn:'Musiala',     shortKo:'무시알라'  },
  osimhen:      { en:'Victor Osimhen',        ko:'빅터 오시멘',        shortEn:'Osimhen',     shortKo:'오시멘'    },
  lautaro:      { en:'Lautaro Martínez',      ko:'라우타로 마르티네스',shortEn:'Lautaro',     shortKo:'라우타로'  },
  dembele:      { en:'Ousmane Dembélé',       ko:'우스만 뎀벨레',      shortEn:'Dembélé',     shortKo:'뎀벨레'    },
  // La Liga 추가
  griezmann:    { en:'Antoine Griezmann',     ko:'앙투안 그리에즈만',  shortEn:'Griezmann',   shortKo:'그리에즈만' },
  oyarzabal:    { en:'Mikel Oyarzabal',       ko:'미켈 오야르사발',    shortEn:'Oyarzabal',   shortKo:'오야르사발' },
  pedri:        { en:'Pedri',                 ko:'페드리',             shortEn:'Pedri',       shortKo:'페드리'    },
  'de-paul':    { en:'Rodrigo De Paul',       ko:'로드리고 데 파울',   shortEn:'De Paul',     shortKo:'데 파울'   },
  // Bundesliga 추가
  wirtz:        { en:'Florian Wirtz',         ko:'플로리안 비르츠',    shortEn:'Wirtz',       shortKo:'비르츠'    },
  adeyemi:      { en:'Karim Adeyemi',         ko:'카림 아데예미',      shortEn:'Adeyemi',     shortKo:'아데예미'  },
  simons:       { en:'Xavi Simons',           ko:'하비 시몬스',        shortEn:'Simons',      shortKo:'시몬스'    },
  brandt:       { en:'Julian Brandt',         ko:'율리안 브란트',      shortEn:'Brandt',      shortKo:'브란트'    },
  // Serie A 추가
  vlahovic:     { en:'Dušan Vlahović',        ko:'두샨 블라호비치',    shortEn:'Vlahović',    shortKo:'블라호비치'},
  kvara:        { en:'Khvicha Kvaratskhelia', ko:'흐비챠 콰라츠헬리아',shortEn:'Kvaratskhelia',shortKo:'콰라츠헬리아'},
  dybala:       { en:'Paulo Dybala',          ko:'파울로 디발라',      shortEn:'Dybala',      shortKo:'디발라'    },
  pellegrini:   { en:'Lorenzo Pellegrini',    ko:'로렌초 펠레그리니',  shortEn:'Pellegrini',  shortKo:'펠레그리니'},
  // Ligue 1 추가
  aubameyang:   { en:'Pierre-Emerick Aubameyang',ko:'피에르에메리크 오바메양',shortEn:'Aubameyang',shortKo:'오바메양'},
  leekangin:    { en:'Lee Kang-in',           ko:'이강인',             shortEn:'Lee Kang-in', shortKo:'이강인'    },
  lacazette:    { en:'Alexandre Lacazette',   ko:'알렉상드르 라카제트',shortEn:'Lacazette',   shortKo:'라카제트'  },
  vitinha:      { en:'Vitinha',               ko:'비티냐',             shortEn:'Vitinha',     shortKo:'비티냐'    },
}

/** @type {Record<string, {en:string, ko:string, shortEn:string, shortKo:string}>} */
export const COMPETITION_NAMES = {
  epl:        { en:'Premier League',         ko:'프리미어 리그',      shortEn:'EPL',   shortKo:'EPL'   },
  laliga:     { en:'La Liga',                ko:'라 리가',            shortEn:'LaLiga',shortKo:'라리가'},
  bundesliga: { en:'Bundesliga',             ko:'분데스리가',          shortEn:'BL',    shortKo:'분데스리가'},
  seriea:     { en:'Serie A',                ko:'세리에 A',           shortEn:'SA',    shortKo:'세리에 A'},
  ligue1:     { en:'Ligue 1',                ko:'리그 1',             shortEn:'L1',    shortKo:'리그 1'},
  ucl:        { en:'UEFA Champions League',  ko:'UEFA 챔피언스 리그', shortEn:'UCL',   shortKo:'UCL'   },
}
