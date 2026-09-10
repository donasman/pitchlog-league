/**
 * 팀·선수·대회 현지화 이름 테이블
 * id 키: mocks/teams.js, mocks/players.js, mocks/competitions.js의 id와 일치
 *
 * 구조: { en: string, ko: string, shortEn: string, shortKo: string }
 * 누락 시 getLocalizedName이 영어 이름으로 자동 폴백
 */

/** @type {Record<string, {apiId:number, en:string, ko:string, shortEn:string, shortKo:string}>} */
export const TEAM_NAMES = {
  // EPL
  mancity:      { apiId:50, en:'Manchester City',       ko:'맨체스터 시티',      shortEn:'Man City',   shortKo:'맨시티'    },
  arsenal:      { apiId:42, en:'Arsenal',               ko:'아스널',             shortEn:'Arsenal',    shortKo:'아스널'    },
  liverpool:    { apiId:40, en:'Liverpool',             ko:'리버풀',             shortEn:'Liverpool',  shortKo:'리버풀'    },
  chelsea:      { apiId:49, en:'Chelsea',               ko:'첼시',               shortEn:'Chelsea',    shortKo:'첼시'      },
  newcastle:    { apiId:34, en:'Newcastle United',      ko:'뉴캐슬 유나이티드',  shortEn:'Newcastle',  shortKo:'뉴캐슬'    },
  spurs:        { apiId:47, en:'Tottenham Hotspur',     ko:'토트넘 홋스퍼',      shortEn:'Spurs',      shortKo:'토트넘'    },
  manutd:       { apiId:33, en:'Manchester United',     ko:'맨체스터 유나이티드',shortEn:'Man Utd',    shortKo:'맨유'      },
  astonvilla:   { apiId:66, en:'Aston Villa',           ko:'아스턴 빌라',        shortEn:'Aston Villa',shortKo:'아스턴 빌라'},
  brighton:     { apiId:51, en:'Brighton',              ko:'브라이턴',           shortEn:'Brighton',   shortKo:'브라이턴'  },
  westham:      { apiId:48, en:'West Ham United',       ko:'웨스트햄 유나이티드',shortEn:'West Ham',   shortKo:'웨스트햄'  },
  wolves:       { apiId:39, en:'Wolverhampton',         ko:'울버햄프턴',         shortEn:'Wolves',     shortKo:'울버햄프턴'},
  nottmforest:  { apiId:65, en:'Nottingham Forest',     ko:'노팅엄 포레스트',    shortEn:"Nott'm Forest",shortKo:'노팅엄' },
  everton:      { apiId:45, en:'Everton',               ko:'에버턴',             shortEn:'Everton',    shortKo:'에버턴'    },
  fulham:       { apiId:36, en:'Fulham',                ko:'풀럼',               shortEn:'Fulham',     shortKo:'풀럼'      },
  bournemouth:  { apiId:35, en:'AFC Bournemouth',       ko:'AFC 본머스',         shortEn:'Bournemouth',shortKo:'본머스'    },
  crystalpalace:{ apiId:52, en:'Crystal Palace',        ko:'크리스탈 팰리스',    shortEn:'C. Palace',  shortKo:'크리스탈'  },
  brentford:    { apiId:55, en:'Brentford',             ko:'브렌트퍼드',         shortEn:'Brentford',  shortKo:'브렌트퍼드'},
  leicester:    { apiId:46, en:'Leicester City',        ko:'레스터 시티',        shortEn:'Leicester',  shortKo:'레스터'    },
  ipswich:      { apiId:57, en:'Ipswich Town',          ko:'입스위치 타운',      shortEn:'Ipswich',    shortKo:'입스위치'  },
  southampton:  { apiId:41, en:'Southampton',           ko:'사우샘프턴',         shortEn:'Southampton',shortKo:'사우샘프턴'},
  // La Liga
  realmadrid:   { apiId:541, en:'Real Madrid',           ko:'레알 마드리드',      shortEn:'Real Madrid',shortKo:'레알'      },
  barca:        { apiId:529, en:'FC Barcelona',          ko:'FC 바르셀로나',      shortEn:'Barcelona',  shortKo:'바르셀로나'},
  atletico:     { apiId:530, en:'Atlético Madrid',       ko:'아틀레티코 마드리드',shortEn:'Atlético',   shortKo:'아틀레티코'},
  bilbao:       { apiId:531, en:'Athletic Club',         ko:'아틀레틱 클럽',      shortEn:'Athletic',   shortKo:'아틀레틱'  },
  villarreal:   { apiId:533, en:'Villarreal CF',         ko:'비야레알 CF',        shortEn:'Villarreal', shortKo:'비야레알'  },
  girona:       { apiId:547, en:'Girona FC',             ko:'지로나 FC',          shortEn:'Girona',     shortKo:'지로나'    },
  betis:        { apiId:543, en:'Real Betis',            ko:'레알 베티스',        shortEn:'Betis',      shortKo:'베티스'    },
  sociedad:     { apiId:548, en:'Real Sociedad',         ko:'레알 소시에다드',    shortEn:'Sociedad',   shortKo:'소시에다드'},
  // Bundesliga
  bayernmunich: { apiId:157, en:'FC Bayern München',     ko:'FC 바이에른 뮌헨',   shortEn:'Bayern',     shortKo:'바이에른'  },
  dortmund:     { apiId:165, en:'Borussia Dortmund',     ko:'보루시아 도르트문트',shortEn:'Dortmund',   shortKo:'도르트문트'},
  leverkusen:   { apiId:168, en:'Bayer Leverkusen',      ko:'바이어 레버쿠젠',    shortEn:'Leverkusen', shortKo:'레버쿠젠'  },
  frankfurt:    { apiId:169, en:'Eintracht Frankfurt',   ko:'아인트라흐트 프랑크푸르트',shortEn:'Frankfurt',shortKo:'프랑크푸르트'},
  freiburg:     { apiId:160, en:'SC Freiburg',           ko:'SC 프라이부르크',    shortEn:'Freiburg',   shortKo:'프라이부르크'},
  leipzig:      { apiId:173, en:'RB Leipzig',            ko:'RB 라이프치히',      shortEn:'Leipzig',    shortKo:'라이프치히'},
  stuttgart:    { apiId:172, en:'VfB Stuttgart',         ko:'VfB 슈투트가르트',   shortEn:'Stuttgart',  shortKo:'슈투트가르트'},
  wolfsburg:    { apiId:161, en:'VfL Wolfsburg',         ko:'VfL 볼프스부르크',   shortEn:'Wolfsburg',  shortKo:'볼프스부르크'},
  // Serie A
  inter:        { apiId:505, en:'Inter Milan',           ko:'인터 밀란',          shortEn:'Inter',      shortKo:'인터'      },
  napoli:       { apiId:492, en:'SSC Napoli',            ko:'SSC 나폴리',         shortEn:'Napoli',     shortKo:'나폴리'    },
  juventus:     { apiId:496, en:'Juventus FC',           ko:'유벤투스 FC',        shortEn:'Juventus',   shortKo:'유벤투스'  },
  milan:        { apiId:489, en:'AC Milan',              ko:'AC 밀란',            shortEn:'AC Milan',   shortKo:'AC 밀란'   },
  roma:         { apiId:497, en:'AS Roma',               ko:'AS 로마',            shortEn:'Roma',       shortKo:'로마'      },
  lazio:        { apiId:487, en:'SS Lazio',              ko:'SS 라치오',          shortEn:'Lazio',      shortKo:'라치오'    },
  atalanta:     { apiId:499, en:'Atalanta BC',           ko:'아탈란타 BC',        shortEn:'Atalanta',   shortKo:'아탈란타'  },
  fiorentina:   { apiId:502, en:'ACF Fiorentina',        ko:'ACF 피오렌티나',     shortEn:'Fiorentina', shortKo:'피오렌티나'},
  // Ligue 1
  psg:          { apiId:85, en:'Paris Saint-Germain',   ko:'파리 생제르맹',      shortEn:'PSG',        shortKo:'PSG'       },
  marseille:    { apiId:81, en:'Olympique de Marseille',ko:'올랭피크 드 마르세유',shortEn:'Marseille',  shortKo:'마르세유'  },
  nice:         { apiId:84, en:'OGC Nice',              ko:'OGC 니스',           shortEn:'Nice',       shortKo:'니스'      },
  lens:         { apiId:116, en:'RC Lens',               ko:'RC 랑스',            shortEn:'Lens',       shortKo:'랑스'      },
  monaco:       { apiId:91, en:'AS Monaco',             ko:'AS 모나코',          shortEn:'Monaco',     shortKo:'모나코'    },
  lyon:         { apiId:80, en:'Olympique Lyonnais',    ko:'올랭피크 리옹',      shortEn:'Lyon',       shortKo:'리옹'      },
  rennes:       { apiId:94, en:'Stade Rennais',         ko:'스타드 렌',          shortEn:'Rennes',     shortKo:'렌'        },
  lille:        { apiId:79, en:'LOSC Lille',            ko:'LOSC 릴',            shortEn:'Lille',      shortKo:'릴'        },
}

/** @type {Record<string, {apiId:number, en:string, ko:string, shortEn:string, shortKo:string}>} */
export const PLAYER_NAMES = {
  haaland:      { apiId:1100, en:'Erling Haaland',        ko:'엘링 홀란드',        shortEn:'Haaland',     shortKo:'홀란드'    },
  salah:        { apiId:306, en:'Mohamed Salah',         ko:'모하메드 살라',      shortEn:'Salah',       shortKo:'살라'      },
  saka:         { apiId:1460, en:'Bukayo Saka',           ko:'부카요 사카',        shortEn:'Saka',        shortKo:'사카'      },
  son:          { apiId:186, en:'Son Heung-min',         ko:'손흥민',             shortEn:'Son',         shortKo:'손흥민'    },
  palmer:       { apiId:152982, en:'Cole Palmer',           ko:'콜 팔머',            shortEn:'Palmer',      shortKo:'팔머'      },
  isak:         { apiId:2864, en:'Alexander Isak',        ko:'알렉산더 이사크',    shortEn:'Isak',        shortKo:'이사크'    },
  odegaard:     { apiId:37127, en:'Martin Ødegaard',       ko:'마르틴 외데고르',    shortEn:'Ødegaard',    shortKo:'외데고르'  },
  fernandes:    { apiId:1485, en:'Bruno Fernandes',       ko:'브루노 페르난데스',  shortEn:'B.Fernandes', shortKo:'B.페르난데스'},
  lewandowski:  { apiId:521, en:'Robert Lewandowski',    ko:'로베르트 레반도프스키',shortEn:'Lewandowski',shortKo:'레반도프스키'},
  bellingham:   { apiId:129718, en:'Jude Bellingham',       ko:'주드 벨링엄',        shortEn:'Bellingham',  shortKo:'벨링엄'    },
  vinicius:     { apiId:762, en:'Vinicius Jr.',          ko:'비니시우스 주니오르', shortEn:'Vinicius Jr.',shortKo:'비니시우스' },
  kane:         { apiId:184, en:'Harry Kane',            ko:'해리 케인',          shortEn:'Kane',        shortKo:'케인'      },
  musiala:      { apiId:181812, en:'Jamal Musiala',         ko:'야말 무시알라',      shortEn:'Musiala',     shortKo:'무시알라'  },
  osimhen:      { apiId:2780, en:'Victor Osimhen',        ko:'빅터 오시멘',        shortEn:'Osimhen',     shortKo:'오시멘'    },
  lautaro:      { apiId:217, en:'Lautaro Martínez',      ko:'라우타로 마르티네스',shortEn:'Lautaro',     shortKo:'라우타로'  },
  dembele:      { apiId:153, en:'Ousmane Dembélé',       ko:'우스만 뎀벨레',      shortEn:'Dembélé',     shortKo:'뎀벨레'    },
  // La Liga 추가
  griezmann:    { apiId:56, en:'Antoine Griezmann',     ko:'앙투안 그리에즈만',  shortEn:'Griezmann',   shortKo:'그리에즈만' },
  oyarzabal:    { apiId:47323, en:'Mikel Oyarzabal',       ko:'미켈 오야르사발',    shortEn:'Oyarzabal',   shortKo:'오야르사발' },
  pedri:        { apiId:133609, en:'Pedri',                 ko:'페드리',             shortEn:'Pedri',       shortKo:'페드리'    },
  'de-paul':    { apiId:2472, en:'Rodrigo De Paul',       ko:'로드리고 데 파울',   shortEn:'De Paul',     shortKo:'데 파울'   },
  // Bundesliga 추가
  wirtz:        { apiId:203224, en:'Florian Wirtz',         ko:'플로리안 비르츠',    shortEn:'Wirtz',       shortKo:'비르츠'    },
  adeyemi:      { apiId:7334, en:'Karim Adeyemi',         ko:'카림 아데예미',      shortEn:'Adeyemi',     shortKo:'아데예미'  },
  simons:       { apiId:162016, en:'Xavi Simons',           ko:'하비 시몬스',        shortEn:'Simons',      shortKo:'시몬스'    },
  brandt:       { apiId:984, en:'Julian Brandt',         ko:'율리안 브란트',      shortEn:'Brandt',      shortKo:'브란트'    },
  // Serie A 추가
  vlahovic:     { apiId:30415, en:'Dušan Vlahović',        ko:'두샨 블라호비치',    shortEn:'Vlahović',    shortKo:'블라호비치'},
  kvara:        { apiId:483, en:'Khvicha Kvaratskhelia', ko:'흐비챠 콰라츠헬리아',shortEn:'Kvaratskhelia',shortKo:'콰라츠헬리아'},
  dybala:       { apiId:875, en:'Paulo Dybala',          ko:'파울로 디발라',      shortEn:'Dybala',      shortKo:'디발라'    },
  pellegrini:   { apiId:782, en:'Lorenzo Pellegrini',    ko:'로렌초 펠레그리니',  shortEn:'Pellegrini',  shortKo:'펠레그리니'},
  // Ligue 1 추가
  aubameyang:   { apiId:1465, en:'Pierre-Emerick Aubameyang',ko:'피에르에메리크 오바메양',shortEn:'Aubameyang',shortKo:'오바메양'},
  leekangin:    { apiId:927, en:'Lee Kang-in',           ko:'이강인',             shortEn:'Lee Kang-in', shortKo:'이강인'    },
  lacazette:    { apiId:1467, en:'Alexandre Lacazette',   ko:'알렉상드르 라카제트',shortEn:'Lacazette',   shortKo:'라카제트'  },
  vitinha:      { apiId:128384, en:'Vitinha',               ko:'비티냐',             shortEn:'Vitinha',     shortKo:'비티냐'    },
}

/** @type {Record<string, {apiId:number, en:string, ko:string, shortEn:string, shortKo:string}>} */
export const COMPETITION_NAMES = {
  epl:        { apiId:39, en:'Premier League',         ko:'프리미어 리그',      shortEn:'EPL',   shortKo:'EPL'   },
  laliga:     { apiId:140, en:'La Liga',                ko:'라 리가',            shortEn:'LaLiga',shortKo:'라리가'},
  bundesliga: { apiId:78, en:'Bundesliga',             ko:'분데스리가',          shortEn:'BL',    shortKo:'분데스리가'},
  seriea:     { apiId:135, en:'Serie A',                ko:'세리에 A',           shortEn:'SA',    shortKo:'세리에 A'},
  ligue1:     { apiId:61, en:'Ligue 1',                ko:'리그 1',             shortEn:'L1',    shortKo:'리그 1'},
  ucl:        { apiId:2, en:'UEFA Champions League',  ko:'UEFA 챔피언스 리그', shortEn:'UCL',   shortKo:'UCL'   },
}
