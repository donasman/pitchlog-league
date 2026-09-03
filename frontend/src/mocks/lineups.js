/**
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

export const LINEUPS = {
  "m001": {
    "home": {
      "teamId": "mancity",
      "teamName": "Manchester City",
      "formation": "4-3-3",
      "startingXI": [
        {
          "number": 31,
          "name": "Ederson",
          "position": "GK",
          "isCaptain": false
        },
        {
          "number": 2,
          "name": "Walker",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 3,
          "name": "Rúben Dias",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 5,
          "name": "Stones",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 24,
          "name": "Gvardiol",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 16,
          "name": "Rodri",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 20,
          "name": "Bernardo",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 17,
          "name": "De Bruyne",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 47,
          "name": "Foden",
          "position": "FWD",
          "isCaptain": false
        },
        {
          "number": 9,
          "name": "Haaland",
          "position": "FWD",
          "isCaptain": true
        },
        {
          "number": 11,
          "name": "Doku",
          "position": "FWD",
          "isCaptain": false
        }
      ],
      "substitutes": [
        {
          "number": 18,
          "name": "Ortega",
          "position": "GK"
        },
        {
          "number": 25,
          "name": "Akanji",
          "position": "DEF"
        },
        {
          "number": 8,
          "name": "Kovačić",
          "position": "MID"
        },
        {
          "number": 19,
          "name": "Marmoush",
          "position": "FWD"
        },
        {
          "number": 52,
          "name": "Bobb",
          "position": "MID"
        }
      ]
    },
    "away": {
      "teamId": "arsenal",
      "teamName": "Arsenal",
      "formation": "4-3-3",
      "startingXI": [
        {
          "number": 22,
          "name": "Raya",
          "position": "GK",
          "isCaptain": false
        },
        {
          "number": 4,
          "name": "White",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 6,
          "name": "Gabriel",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 2,
          "name": "Saliba",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 35,
          "name": "Zinchenko",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 5,
          "name": "Partey",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 8,
          "name": "Ødegaard",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 41,
          "name": "Rice",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 7,
          "name": "Saka",
          "position": "FWD",
          "isCaptain": false
        },
        {
          "number": 29,
          "name": "Havertz",
          "position": "FWD",
          "isCaptain": true
        },
        {
          "number": 11,
          "name": "Martinelli",
          "position": "FWD",
          "isCaptain": false
        }
      ],
      "substitutes": [
        {
          "number": 32,
          "name": "Setford",
          "position": "GK"
        },
        {
          "number": 15,
          "name": "Kiwior",
          "position": "DEF"
        },
        {
          "number": 20,
          "name": "Jorginho",
          "position": "MID"
        },
        {
          "number": 19,
          "name": "Trossard",
          "position": "FWD"
        },
        {
          "number": 24,
          "name": "Nelson",
          "position": "FWD"
        }
      ]
    }
  },
  "m009": {
    "home": {
      "teamId": "realmadrid",
      "teamName": "Real Madrid",
      "formation": "4-3-1-2",
      "startingXI": [
        {
          "number": 1,
          "name": "Courtois",
          "position": "GK",
          "isCaptain": false
        },
        {
          "number": 2,
          "name": "Carvajal",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 3,
          "name": "Militão",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 22,
          "name": "Rüdiger",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 23,
          "name": "Mendy",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 60,
          "name": "Vinicius Jr.",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 18,
          "name": "Tchouaméni",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 6,
          "name": "Camavinga",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 10,
          "name": "Bellingham",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 7,
          "name": "Vinícius Jr",
          "position": "FWD",
          "isCaptain": true
        },
        {
          "number": 9,
          "name": "Mbappé",
          "position": "FWD",
          "isCaptain": false
        }
      ],
      "substitutes": [
        {
          "number": 13,
          "name": "Lunin",
          "position": "GK"
        },
        {
          "number": 4,
          "name": "Alaba",
          "position": "DEF"
        },
        {
          "number": 15,
          "name": "Güler",
          "position": "MID"
        },
        {
          "number": 11,
          "name": "Rodrygo",
          "position": "FWD"
        },
        {
          "number": 16,
          "name": "Endrick",
          "position": "FWD"
        }
      ]
    },
    "away": {
      "teamId": "barca",
      "teamName": "FC Barcelona",
      "formation": "4-3-3",
      "startingXI": [
        {
          "number": 1,
          "name": "Ter Stegen",
          "position": "GK",
          "isCaptain": false
        },
        {
          "number": 23,
          "name": "Koundé",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 4,
          "name": "Araújo",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 5,
          "name": "Íñigo",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 3,
          "name": "Balde",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 21,
          "name": "De Jong",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 8,
          "name": "Pedri",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 6,
          "name": "Gavi",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 27,
          "name": "Yamal",
          "position": "FWD",
          "isCaptain": false
        },
        {
          "number": 9,
          "name": "Lewandowski",
          "position": "FWD",
          "isCaptain": true
        },
        {
          "number": 11,
          "name": "Raphinha",
          "position": "FWD",
          "isCaptain": false
        }
      ],
      "substitutes": [
        {
          "number": 13,
          "name": "Peña",
          "position": "GK"
        },
        {
          "number": 15,
          "name": "Christensen",
          "position": "DEF"
        },
        {
          "number": 20,
          "name": "Olmo",
          "position": "MID"
        },
        {
          "number": 7,
          "name": "Ferran",
          "position": "FWD"
        },
        {
          "number": 16,
          "name": "Fermín",
          "position": "MID"
        }
      ]
    }
  },
  "m011": {
    "home": {
      "teamId": "dortmund",
      "teamName": "Borussia Dortmund",
      "formation": "4-2-3-1",
      "startingXI": [
        {
          "number": 1,
          "name": "Kobel",
          "position": "GK",
          "isCaptain": false
        },
        {
          "number": 26,
          "name": "Ryerson",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 4,
          "name": "Schlotterbeck",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 25,
          "name": "Süle",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 5,
          "name": "Bensebaini",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 23,
          "name": "Emre Can",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 20,
          "name": "Sabitzer",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 19,
          "name": "Brandt",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 7,
          "name": "Adeyemi",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 43,
          "name": "Gittens",
          "position": "FWD",
          "isCaptain": true
        },
        {
          "number": 14,
          "name": "Guirassy",
          "position": "FWD",
          "isCaptain": false
        }
      ],
      "substitutes": [
        {
          "number": 33,
          "name": "Meyer",
          "position": "GK"
        },
        {
          "number": 2,
          "name": "Wolf",
          "position": "DEF"
        },
        {
          "number": 27,
          "name": "Beier",
          "position": "FWD"
        },
        {
          "number": 10,
          "name": "Reyna",
          "position": "MID"
        },
        {
          "number": 24,
          "name": "Duranville",
          "position": "FWD"
        }
      ]
    },
    "away": {
      "teamId": "leverkusen",
      "teamName": "Bayer Leverkusen",
      "formation": "3-4-3",
      "startingXI": [
        {
          "number": 1,
          "name": "Hrádecký",
          "position": "GK",
          "isCaptain": false
        },
        {
          "number": 12,
          "name": "Tapsoba",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 4,
          "name": "Tah",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 3,
          "name": "Hincapié",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 30,
          "name": "Frimpong",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 8,
          "name": "Andrich",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 25,
          "name": "Palacios",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 20,
          "name": "Grimaldo",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 10,
          "name": "Wirtz",
          "position": "FWD",
          "isCaptain": false
        },
        {
          "number": 14,
          "name": "Schick",
          "position": "FWD",
          "isCaptain": true
        },
        {
          "number": 22,
          "name": "Boniface",
          "position": "FWD",
          "isCaptain": false
        }
      ],
      "substitutes": [
        {
          "number": 17,
          "name": "Kovář",
          "position": "GK"
        },
        {
          "number": 2,
          "name": "Arthur",
          "position": "DEF"
        },
        {
          "number": 19,
          "name": "Adli",
          "position": "MID"
        },
        {
          "number": 7,
          "name": "Hofmann",
          "position": "FWD"
        },
        {
          "number": 11,
          "name": "Tella",
          "position": "FWD"
        }
      ]
    }
  },
  "m021": {
    "home": {
      "teamId": "napoli",
      "teamName": "SSC Napoli",
      "formation": "4-3-3",
      "startingXI": [
        {
          "number": 1,
          "name": "Meret",
          "position": "GK",
          "isCaptain": false
        },
        {
          "number": 22,
          "name": "Di Lorenzo",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 13,
          "name": "Rrahmani",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 5,
          "name": "Juan Jesus",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 17,
          "name": "Olivera",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 61,
          "name": "Kvaratskhelia",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 68,
          "name": "Lobotka",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 8,
          "name": "McTominay",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 60,
          "name": "Osimhen",
          "position": "FWD",
          "isCaptain": false
        },
        {
          "number": 11,
          "name": "Lukaku",
          "position": "FWD",
          "isCaptain": true
        },
        {
          "number": 81,
          "name": "Raspadori",
          "position": "FWD",
          "isCaptain": false
        }
      ],
      "substitutes": [
        {
          "number": 16,
          "name": "Contini",
          "position": "GK"
        },
        {
          "number": 6,
          "name": "Mazzocchi",
          "position": "DEF"
        },
        {
          "number": 70,
          "name": "Gaetano",
          "position": "MID"
        },
        {
          "number": 18,
          "name": "Simeone",
          "position": "FWD"
        },
        {
          "number": 7,
          "name": "Neres",
          "position": "FWD"
        }
      ]
    },
    "away": {
      "teamId": "roma",
      "teamName": "AS Roma",
      "formation": "3-5-2",
      "startingXI": [
        {
          "number": 99,
          "name": "Svilar",
          "position": "GK",
          "isCaptain": false
        },
        {
          "number": 23,
          "name": "Mancini",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 5,
          "name": "Ndicka",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 14,
          "name": "Hermoso",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 59,
          "name": "Zalewski",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 7,
          "name": "Pellegrini",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 4,
          "name": "Cristante",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 61,
          "name": "Pisilli",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 37,
          "name": "Spinazzola",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 21,
          "name": "Dybala",
          "position": "FWD",
          "isCaptain": true
        },
        {
          "number": 11,
          "name": "Dovbyk",
          "position": "FWD",
          "isCaptain": false
        }
      ],
      "substitutes": [
        {
          "number": 1,
          "name": "Ryan",
          "position": "GK"
        },
        {
          "number": 19,
          "name": "Çelik",
          "position": "DEF"
        },
        {
          "number": 52,
          "name": "Bove",
          "position": "MID"
        },
        {
          "number": 92,
          "name": "El Shaarawy",
          "position": "FWD"
        },
        {
          "number": 64,
          "name": "Baldanzi",
          "position": "FWD"
        }
      ]
    }
  },
  "m023": {
    "home": {
      "teamId": "lyon",
      "teamName": "Olympique Lyonnais",
      "formation": "4-2-3-1",
      "startingXI": [
        {
          "number": 1,
          "name": "Perri",
          "position": "GK",
          "isCaptain": false
        },
        {
          "number": 27,
          "name": "Maitland-Niles",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 3,
          "name": "Mata",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 5,
          "name": "Caleta-Car",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 21,
          "name": "Tagliafico",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 6,
          "name": "Matić",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 8,
          "name": "Tolisso",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 18,
          "name": "Cherki",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 24,
          "name": "Nuamah",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 11,
          "name": "Fofana",
          "position": "FWD",
          "isCaptain": true
        },
        {
          "number": 10,
          "name": "Lacazette",
          "position": "FWD",
          "isCaptain": false
        }
      ],
      "substitutes": [
        {
          "number": 30,
          "name": "Descamps",
          "position": "GK"
        },
        {
          "number": 12,
          "name": "Kumbedi",
          "position": "DEF"
        },
        {
          "number": 17,
          "name": "Veretout",
          "position": "MID"
        },
        {
          "number": 9,
          "name": "Mikautadze",
          "position": "FWD"
        },
        {
          "number": 7,
          "name": "Benrahma",
          "position": "FWD"
        }
      ]
    },
    "away": {
      "teamId": "monaco",
      "teamName": "AS Monaco",
      "formation": "4-4-2",
      "startingXI": [
        {
          "number": 16,
          "name": "Köhn",
          "position": "GK",
          "isCaptain": false
        },
        {
          "number": 2,
          "name": "Vanderson",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 5,
          "name": "Salisu",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 4,
          "name": "Kehrer",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 26,
          "name": "Caio Henrique",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 17,
          "name": "Akliouche",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 8,
          "name": "Camara",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 22,
          "name": "Zakaria",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 7,
          "name": "Golovin",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 77,
          "name": "Embolo",
          "position": "FWD",
          "isCaptain": true
        },
        {
          "number": 9,
          "name": "Ben Yedder",
          "position": "FWD",
          "isCaptain": false
        }
      ],
      "substitutes": [
        {
          "number": 1,
          "name": "Majecki",
          "position": "GK"
        },
        {
          "number": 3,
          "name": "Singo",
          "position": "DEF"
        },
        {
          "number": 18,
          "name": "Minamino",
          "position": "MID"
        },
        {
          "number": 11,
          "name": "Balogun",
          "position": "FWD"
        },
        {
          "number": 27,
          "name": "Ilenikhena",
          "position": "FWD"
        }
      ]
    }
  },
  "m010": {
    "home": {
      "teamId": "bayernmunich",
      "teamName": "FC Bayern München",
      "formation": "4-2-3-1",
      "startingXI": [
        {
          "number": 1,
          "name": "Neuer",
          "position": "GK",
          "isCaptain": false
        },
        {
          "number": 61,
          "name": "Sané",
          "position": "FWD",
          "isCaptain": false
        },
        {
          "number": 2,
          "name": "Upamecano",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 3,
          "name": "Kim",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 19,
          "name": "Davies",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 6,
          "name": "Kimmich",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 45,
          "name": "Pavlović",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 42,
          "name": "Musiala",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 7,
          "name": "Gnabry",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 60,
          "name": "Müller",
          "position": "FWD",
          "isCaptain": true
        },
        {
          "number": 9,
          "name": "Kane",
          "position": "FWD",
          "isCaptain": false
        }
      ],
      "substitutes": [
        {
          "number": 26,
          "name": "Ulreich",
          "position": "GK"
        },
        {
          "number": 44,
          "name": "Stanišić",
          "position": "DEF"
        },
        {
          "number": 8,
          "name": "Goretzka",
          "position": "MID"
        },
        {
          "number": 11,
          "name": "Coman",
          "position": "FWD"
        },
        {
          "number": 39,
          "name": "Tel",
          "position": "FWD"
        }
      ]
    },
    "away": {
      "teamId": "psg",
      "teamName": "Paris Saint-Germain",
      "formation": "4-3-3",
      "startingXI": [
        {
          "number": 99,
          "name": "Donnarumma",
          "position": "GK",
          "isCaptain": false
        },
        {
          "number": 2,
          "name": "Hakimi",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 5,
          "name": "Marquinhos",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 51,
          "name": "Pacho",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 25,
          "name": "Mendes",
          "position": "DEF",
          "isCaptain": false
        },
        {
          "number": 8,
          "name": "Fabián Ruiz",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 87,
          "name": "João Neves",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 17,
          "name": "Vitinha",
          "position": "MID",
          "isCaptain": false
        },
        {
          "number": 10,
          "name": "Dembélé",
          "position": "FWD",
          "isCaptain": false
        },
        {
          "number": 60,
          "name": "Lee Kang-in",
          "position": "FWD",
          "isCaptain": true
        },
        {
          "number": 29,
          "name": "Barcola",
          "position": "FWD",
          "isCaptain": false
        }
      ],
      "substitutes": [
        {
          "number": 80,
          "name": "Safonov",
          "position": "GK"
        },
        {
          "number": 35,
          "name": "Beraldo",
          "position": "DEF"
        },
        {
          "number": 33,
          "name": "Zaïre-Emery",
          "position": "MID"
        },
        {
          "number": 23,
          "name": "Kolo Muani",
          "position": "FWD"
        },
        {
          "number": 14,
          "name": "Doué",
          "position": "FWD"
        }
      ]
    }
  }
}

export const MATCH_PLAYER_STATS = {
  "m001": [
    {
      "matchId": "m001",
      "teamId": "mancity",
      "side": "home",
      "name": "Ederson",
      "position": "GK",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 31,
          "position": "GK",
          "rating": 6.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 1,
          "assists": 0,
          "saves": 2
        },
        "passes": {
          "total": 29,
          "key": 0,
          "accuracy": 84
        },
        "tackles": {
          "total": 5,
          "blocks": 2,
          "interceptions": 0
        },
        "duels": {
          "total": 3,
          "won": 3
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 0
        },
        "fouls": {
          "drawn": 3,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "mancity",
      "side": "home",
      "name": "Walker",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 2,
          "position": "DEF",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 34,
          "key": 1,
          "accuracy": 87
        },
        "tackles": {
          "total": 1,
          "blocks": 0,
          "interceptions": 2
        },
        "duels": {
          "total": 11,
          "won": 5
        },
        "dribbles": {
          "attempts": 8,
          "success": 4,
          "past": 1
        },
        "fouls": {
          "drawn": 0,
          "committed": 1
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "mancity",
      "side": "home",
      "name": "Rúben Dias",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 3,
          "position": "DEF",
          "rating": 6.4,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 77,
          "key": 0,
          "accuracy": 80
        },
        "tackles": {
          "total": 2,
          "blocks": 0,
          "interceptions": 0
        },
        "duels": {
          "total": 13,
          "won": 6
        },
        "dribbles": {
          "attempts": 1,
          "success": 1,
          "past": 3
        },
        "fouls": {
          "drawn": 1,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "mancity",
      "side": "home",
      "name": "Stones",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 5,
          "position": "DEF",
          "rating": 6.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 36,
          "key": 2,
          "accuracy": 82
        },
        "tackles": {
          "total": 4,
          "blocks": 2,
          "interceptions": 2
        },
        "duels": {
          "total": 6,
          "won": 4
        },
        "dribbles": {
          "attempts": 3,
          "success": 1,
          "past": 2
        },
        "fouls": {
          "drawn": 4,
          "committed": 2
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "mancity",
      "side": "home",
      "name": "Gvardiol",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 24,
          "position": "DEF",
          "rating": 6.3,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 78,
          "key": 0,
          "accuracy": 90
        },
        "tackles": {
          "total": 2,
          "blocks": 2,
          "interceptions": 1
        },
        "duels": {
          "total": 13,
          "won": 6
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 0
        },
        "fouls": {
          "drawn": 1,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "mancity",
      "side": "home",
      "name": "Rodri",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 16,
          "position": "MID",
          "rating": 6.4,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 45,
          "key": 4,
          "accuracy": 70
        },
        "tackles": {
          "total": 5,
          "blocks": 2,
          "interceptions": 0
        },
        "duels": {
          "total": 9,
          "won": 4
        },
        "dribbles": {
          "attempts": 3,
          "success": 2,
          "past": 2
        },
        "fouls": {
          "drawn": 4,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "mancity",
      "side": "home",
      "name": "Bernardo",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 20,
          "position": "MID",
          "rating": 7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 3,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 77,
          "key": 2,
          "accuracy": 73
        },
        "tackles": {
          "total": 3,
          "blocks": 1,
          "interceptions": 4
        },
        "duels": {
          "total": 16,
          "won": 11
        },
        "dribbles": {
          "attempts": 1,
          "success": 1,
          "past": 0
        },
        "fouls": {
          "drawn": 3,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "mancity",
      "side": "home",
      "name": "De Bruyne",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 17,
          "position": "MID",
          "rating": 7.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 1,
          "saves": null
        },
        "passes": {
          "total": 67,
          "key": 4,
          "accuracy": 82
        },
        "tackles": {
          "total": 3,
          "blocks": 0,
          "interceptions": 1
        },
        "duels": {
          "total": 8,
          "won": 5
        },
        "dribbles": {
          "attempts": 3,
          "success": 1,
          "past": 2
        },
        "fouls": {
          "drawn": 0,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "mancity",
      "side": "home",
      "name": "Foden",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 47,
          "position": "FWD",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 40,
          "key": 2,
          "accuracy": 89
        },
        "tackles": {
          "total": 3,
          "blocks": 0,
          "interceptions": 2
        },
        "duels": {
          "total": 7,
          "won": 3
        },
        "dribbles": {
          "attempts": 4,
          "success": 3,
          "past": 2
        },
        "fouls": {
          "drawn": 3,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "mancity",
      "side": "home",
      "name": "Haaland",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 9,
          "position": "FWD",
          "rating": 8.6,
          "captain": true,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 2
        },
        "goals": {
          "total": 2,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 21,
          "key": 0,
          "accuracy": 94
        },
        "tackles": {
          "total": 4,
          "blocks": 2,
          "interceptions": 1
        },
        "duels": {
          "total": 16,
          "won": 8
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 1
        },
        "fouls": {
          "drawn": 0,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "mancity",
      "side": "home",
      "name": "Doku",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 11,
          "position": "FWD",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 7,
          "on": 5
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 20,
          "key": 3,
          "accuracy": 89
        },
        "tackles": {
          "total": 0,
          "blocks": 0,
          "interceptions": 0
        },
        "duels": {
          "total": 5,
          "won": 2
        },
        "dribbles": {
          "attempts": 2,
          "success": 2,
          "past": 3
        },
        "fouls": {
          "drawn": 2,
          "committed": 1
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "arsenal",
      "side": "away",
      "name": "Raya",
      "position": "GK",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 22,
          "position": "GK",
          "rating": 5.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 2,
          "assists": 0,
          "saves": 2
        },
        "passes": {
          "total": 38,
          "key": 0,
          "accuracy": 78
        },
        "tackles": {
          "total": 3,
          "blocks": 1,
          "interceptions": 4
        },
        "duels": {
          "total": 1,
          "won": 0
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 0
        },
        "fouls": {
          "drawn": 2,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "arsenal",
      "side": "away",
      "name": "White",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 4,
          "position": "DEF",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 79,
          "key": 0,
          "accuracy": 88
        },
        "tackles": {
          "total": 3,
          "blocks": 1,
          "interceptions": 2
        },
        "duels": {
          "total": 9,
          "won": 5
        },
        "dribbles": {
          "attempts": 5,
          "success": 3,
          "past": 3
        },
        "fouls": {
          "drawn": 0,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "arsenal",
      "side": "away",
      "name": "Gabriel",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 6,
          "position": "DEF",
          "rating": 6.2,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 30,
          "key": 0,
          "accuracy": 75
        },
        "tackles": {
          "total": 1,
          "blocks": 2,
          "interceptions": 3
        },
        "duels": {
          "total": 16,
          "won": 8
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 1
        },
        "fouls": {
          "drawn": 2,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "arsenal",
      "side": "away",
      "name": "Saliba",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 2,
          "position": "DEF",
          "rating": 6.8,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 38,
          "key": 0,
          "accuracy": 83
        },
        "tackles": {
          "total": 1,
          "blocks": 1,
          "interceptions": 3
        },
        "duels": {
          "total": 4,
          "won": 3
        },
        "dribbles": {
          "attempts": 6,
          "success": 3,
          "past": 0
        },
        "fouls": {
          "drawn": 1,
          "committed": 1
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "arsenal",
      "side": "away",
      "name": "Zinchenko",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 35,
          "position": "DEF",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 49,
          "key": 0,
          "accuracy": 75
        },
        "tackles": {
          "total": 2,
          "blocks": 0,
          "interceptions": 3
        },
        "duels": {
          "total": 21,
          "won": 9
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 2
        },
        "fouls": {
          "drawn": 2,
          "committed": 0
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "arsenal",
      "side": "away",
      "name": "Partey",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 5,
          "position": "MID",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 92,
          "key": 3,
          "accuracy": 89
        },
        "tackles": {
          "total": 5,
          "blocks": 1,
          "interceptions": 4
        },
        "duels": {
          "total": 13,
          "won": 5
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 2
        },
        "fouls": {
          "drawn": 0,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "arsenal",
      "side": "away",
      "name": "Ødegaard",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 8,
          "position": "MID",
          "rating": 7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 3,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 1,
          "saves": null
        },
        "passes": {
          "total": 59,
          "key": 4,
          "accuracy": 94
        },
        "tackles": {
          "total": 4,
          "blocks": 1,
          "interceptions": 4
        },
        "duels": {
          "total": 10,
          "won": 4
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 2
        },
        "fouls": {
          "drawn": 2,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "arsenal",
      "side": "away",
      "name": "Rice",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 41,
          "position": "MID",
          "rating": 7.1,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 86,
          "key": 4,
          "accuracy": 75
        },
        "tackles": {
          "total": 5,
          "blocks": 2,
          "interceptions": 3
        },
        "duels": {
          "total": 8,
          "won": 5
        },
        "dribbles": {
          "attempts": 6,
          "success": 2,
          "past": 3
        },
        "fouls": {
          "drawn": 1,
          "committed": 4
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "arsenal",
      "side": "away",
      "name": "Saka",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 7,
          "position": "FWD",
          "rating": 7.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 3,
          "on": 1
        },
        "goals": {
          "total": 1,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 22,
          "key": 0,
          "accuracy": 74
        },
        "tackles": {
          "total": 4,
          "blocks": 1,
          "interceptions": 0
        },
        "duels": {
          "total": 21,
          "won": 12
        },
        "dribbles": {
          "attempts": 2,
          "success": 2,
          "past": 1
        },
        "fouls": {
          "drawn": 1,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "arsenal",
      "side": "away",
      "name": "Havertz",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 29,
          "position": "FWD",
          "rating": 6.4,
          "captain": true,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 6,
          "on": 4
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 64,
          "key": 0,
          "accuracy": 82
        },
        "tackles": {
          "total": 0,
          "blocks": 1,
          "interceptions": 2
        },
        "duels": {
          "total": 6,
          "won": 4
        },
        "dribbles": {
          "attempts": 3,
          "success": 1,
          "past": 3
        },
        "fouls": {
          "drawn": 0,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m001",
      "teamId": "arsenal",
      "side": "away",
      "name": "Martinelli",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 67,
          "number": 11,
          "position": "FWD",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 34,
          "key": 1,
          "accuracy": 82
        },
        "tackles": {
          "total": 5,
          "blocks": 2,
          "interceptions": 2
        },
        "duels": {
          "total": 15,
          "won": 7
        },
        "dribbles": {
          "attempts": 6,
          "success": 3,
          "past": 0
        },
        "fouls": {
          "drawn": 4,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    }
  ],
  "m009": [
    {
      "matchId": "m009",
      "teamId": "realmadrid",
      "side": "home",
      "name": "Courtois",
      "position": "GK",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 1,
          "position": "GK",
          "rating": 6.9,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 1,
          "assists": 0,
          "saves": 1
        },
        "passes": {
          "total": 37,
          "key": 0,
          "accuracy": 68
        },
        "tackles": {
          "total": 5,
          "blocks": 1,
          "interceptions": 1
        },
        "duels": {
          "total": 1,
          "won": 1
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 0
        },
        "fouls": {
          "drawn": 0,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "realmadrid",
      "side": "home",
      "name": "Carvajal",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 2,
          "position": "DEF",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 31,
          "key": 1,
          "accuracy": 78
        },
        "tackles": {
          "total": 5,
          "blocks": 2,
          "interceptions": 1
        },
        "duels": {
          "total": 18,
          "won": 8
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 2
        },
        "fouls": {
          "drawn": 0,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "realmadrid",
      "side": "home",
      "name": "Militão",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 3,
          "position": "DEF",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 66,
          "key": 0,
          "accuracy": 88
        },
        "tackles": {
          "total": 1,
          "blocks": 0,
          "interceptions": 3
        },
        "duels": {
          "total": 8,
          "won": 6
        },
        "dribbles": {
          "attempts": 7,
          "success": 3,
          "past": 2
        },
        "fouls": {
          "drawn": 2,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "realmadrid",
      "side": "home",
      "name": "Rüdiger",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 22,
          "position": "DEF",
          "rating": 6.3,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 63,
          "key": 0,
          "accuracy": 74
        },
        "tackles": {
          "total": 5,
          "blocks": 2,
          "interceptions": 2
        },
        "duels": {
          "total": 10,
          "won": 6
        },
        "dribbles": {
          "attempts": 7,
          "success": 4,
          "past": 1
        },
        "fouls": {
          "drawn": 3,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "realmadrid",
      "side": "home",
      "name": "Mendy",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 23,
          "position": "DEF",
          "rating": 6.8,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 41,
          "key": 0,
          "accuracy": 81
        },
        "tackles": {
          "total": 2,
          "blocks": 2,
          "interceptions": 3
        },
        "duels": {
          "total": 13,
          "won": 8
        },
        "dribbles": {
          "attempts": 1,
          "success": 1,
          "past": 3
        },
        "fouls": {
          "drawn": 0,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "realmadrid",
      "side": "home",
      "name": "Vinicius Jr.",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 60,
          "position": "MID",
          "rating": 6.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 1,
          "saves": null
        },
        "passes": {
          "total": 43,
          "key": 1,
          "accuracy": 66
        },
        "tackles": {
          "total": 4,
          "blocks": 0,
          "interceptions": 3
        },
        "duels": {
          "total": 17,
          "won": 8
        },
        "dribbles": {
          "attempts": 7,
          "success": 5,
          "past": 1
        },
        "fouls": {
          "drawn": 2,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "realmadrid",
      "side": "home",
      "name": "Tchouaméni",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 18,
          "position": "MID",
          "rating": 6.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 41,
          "key": 4,
          "accuracy": 93
        },
        "tackles": {
          "total": 2,
          "blocks": 0,
          "interceptions": 0
        },
        "duels": {
          "total": 22,
          "won": 12
        },
        "dribbles": {
          "attempts": 6,
          "success": 3,
          "past": 3
        },
        "fouls": {
          "drawn": 2,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "realmadrid",
      "side": "home",
      "name": "Camavinga",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 6,
          "position": "MID",
          "rating": 6.4,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 95,
          "key": 1,
          "accuracy": 80
        },
        "tackles": {
          "total": 3,
          "blocks": 0,
          "interceptions": 3
        },
        "duels": {
          "total": 12,
          "won": 6
        },
        "dribbles": {
          "attempts": 1,
          "success": 1,
          "past": 0
        },
        "fouls": {
          "drawn": 4,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "realmadrid",
      "side": "home",
      "name": "Bellingham",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 10,
          "position": "MID",
          "rating": 7.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 1,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 50,
          "key": 0,
          "accuracy": 67
        },
        "tackles": {
          "total": 4,
          "blocks": 2,
          "interceptions": 1
        },
        "duels": {
          "total": 8,
          "won": 5
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 0
        },
        "fouls": {
          "drawn": 4,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "realmadrid",
      "side": "home",
      "name": "Vinícius Jr",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 7,
          "position": "FWD",
          "rating": 6.5,
          "captain": true,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 7,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 29,
          "key": 1,
          "accuracy": 76
        },
        "tackles": {
          "total": 3,
          "blocks": 2,
          "interceptions": 0
        },
        "duels": {
          "total": 14,
          "won": 8
        },
        "dribbles": {
          "attempts": 6,
          "success": 2,
          "past": 0
        },
        "fouls": {
          "drawn": 0,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "realmadrid",
      "side": "home",
      "name": "Mbappé",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 9,
          "position": "FWD",
          "rating": 7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 5,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 22,
          "key": 3,
          "accuracy": 72
        },
        "tackles": {
          "total": 1,
          "blocks": 0,
          "interceptions": 1
        },
        "duels": {
          "total": 8,
          "won": 5
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 3
        },
        "fouls": {
          "drawn": 3,
          "committed": 0
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "barca",
      "side": "away",
      "name": "Ter Stegen",
      "position": "GK",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 1,
          "position": "GK",
          "rating": 6.4,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 1,
          "assists": 0,
          "saves": 4
        },
        "passes": {
          "total": 39,
          "key": 0,
          "accuracy": 85
        },
        "tackles": {
          "total": 2,
          "blocks": 2,
          "interceptions": 2
        },
        "duels": {
          "total": 0,
          "won": 0
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 0
        },
        "fouls": {
          "drawn": 1,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "barca",
      "side": "away",
      "name": "Koundé",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 23,
          "position": "DEF",
          "rating": 6.2,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 52,
          "key": 0,
          "accuracy": 74
        },
        "tackles": {
          "total": 4,
          "blocks": 0,
          "interceptions": 3
        },
        "duels": {
          "total": 9,
          "won": 5
        },
        "dribbles": {
          "attempts": 8,
          "success": 3,
          "past": 0
        },
        "fouls": {
          "drawn": 0,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "barca",
      "side": "away",
      "name": "Araújo",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 4,
          "position": "DEF",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 50,
          "key": 1,
          "accuracy": 80
        },
        "tackles": {
          "total": 2,
          "blocks": 2,
          "interceptions": 3
        },
        "duels": {
          "total": 21,
          "won": 14
        },
        "dribbles": {
          "attempts": 7,
          "success": 5,
          "past": 3
        },
        "fouls": {
          "drawn": 0,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "barca",
      "side": "away",
      "name": "Íñigo",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 5,
          "position": "DEF",
          "rating": 6.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 47,
          "key": 1,
          "accuracy": 71
        },
        "tackles": {
          "total": 2,
          "blocks": 1,
          "interceptions": 4
        },
        "duels": {
          "total": 20,
          "won": 12
        },
        "dribbles": {
          "attempts": 7,
          "success": 6,
          "past": 3
        },
        "fouls": {
          "drawn": 4,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "barca",
      "side": "away",
      "name": "Balde",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 3,
          "position": "DEF",
          "rating": 6.8,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 64,
          "key": 0,
          "accuracy": 74
        },
        "tackles": {
          "total": 0,
          "blocks": 2,
          "interceptions": 1
        },
        "duels": {
          "total": 18,
          "won": 12
        },
        "dribbles": {
          "attempts": 1,
          "success": 1,
          "past": 3
        },
        "fouls": {
          "drawn": 1,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "barca",
      "side": "away",
      "name": "De Jong",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 21,
          "position": "MID",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 89,
          "key": 2,
          "accuracy": 72
        },
        "tackles": {
          "total": 5,
          "blocks": 1,
          "interceptions": 2
        },
        "duels": {
          "total": 10,
          "won": 5
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 1
        },
        "fouls": {
          "drawn": 0,
          "committed": 0
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "barca",
      "side": "away",
      "name": "Pedri",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 8,
          "position": "MID",
          "rating": 7.1,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 1,
          "saves": null
        },
        "passes": {
          "total": 40,
          "key": 2,
          "accuracy": 86
        },
        "tackles": {
          "total": 2,
          "blocks": 0,
          "interceptions": 3
        },
        "duels": {
          "total": 9,
          "won": 6
        },
        "dribbles": {
          "attempts": 7,
          "success": 4,
          "past": 3
        },
        "fouls": {
          "drawn": 1,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "barca",
      "side": "away",
      "name": "Gavi",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 6,
          "position": "MID",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 3,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 73,
          "key": 0,
          "accuracy": 75
        },
        "tackles": {
          "total": 2,
          "blocks": 1,
          "interceptions": 0
        },
        "duels": {
          "total": 12,
          "won": 8
        },
        "dribbles": {
          "attempts": 8,
          "success": 3,
          "past": 0
        },
        "fouls": {
          "drawn": 3,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "barca",
      "side": "away",
      "name": "Yamal",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 27,
          "position": "FWD",
          "rating": 6.9,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 39,
          "key": 4,
          "accuracy": 74
        },
        "tackles": {
          "total": 1,
          "blocks": 2,
          "interceptions": 0
        },
        "duels": {
          "total": 10,
          "won": 5
        },
        "dribbles": {
          "attempts": 6,
          "success": 3,
          "past": 2
        },
        "fouls": {
          "drawn": 0,
          "committed": 0
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "barca",
      "side": "away",
      "name": "Lewandowski",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 9,
          "position": "FWD",
          "rating": 7.9,
          "captain": true,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 1,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 46,
          "key": 5,
          "accuracy": 83
        },
        "tackles": {
          "total": 0,
          "blocks": 1,
          "interceptions": 3
        },
        "duels": {
          "total": 22,
          "won": 14
        },
        "dribbles": {
          "attempts": 6,
          "success": 3,
          "past": 2
        },
        "fouls": {
          "drawn": 2,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m009",
      "teamId": "barca",
      "side": "away",
      "name": "Raphinha",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 41,
          "number": 11,
          "position": "FWD",
          "rating": 6.4,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 42,
          "key": 3,
          "accuracy": 79
        },
        "tackles": {
          "total": 2,
          "blocks": 0,
          "interceptions": 4
        },
        "duels": {
          "total": 14,
          "won": 5
        },
        "dribbles": {
          "attempts": 7,
          "success": 4,
          "past": 3
        },
        "fouls": {
          "drawn": 3,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    }
  ],
  "m011": [
    {
      "matchId": "m011",
      "teamId": "dortmund",
      "side": "home",
      "name": "Kobel",
      "position": "GK",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 1,
          "position": "GK",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": 4
        },
        "passes": {
          "total": 30,
          "key": 0,
          "accuracy": 87
        },
        "tackles": {
          "total": 1,
          "blocks": 2,
          "interceptions": 2
        },
        "duels": {
          "total": 3,
          "won": 3
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 0
        },
        "fouls": {
          "drawn": 2,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "dortmund",
      "side": "home",
      "name": "Ryerson",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 26,
          "position": "DEF",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 56,
          "key": 1,
          "accuracy": 79
        },
        "tackles": {
          "total": 4,
          "blocks": 0,
          "interceptions": 3
        },
        "duels": {
          "total": 6,
          "won": 2
        },
        "dribbles": {
          "attempts": 5,
          "success": 3,
          "past": 1
        },
        "fouls": {
          "drawn": 0,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "dortmund",
      "side": "home",
      "name": "Schlotterbeck",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 4,
          "position": "DEF",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 80,
          "key": 2,
          "accuracy": 71
        },
        "tackles": {
          "total": 3,
          "blocks": 1,
          "interceptions": 4
        },
        "duels": {
          "total": 18,
          "won": 8
        },
        "dribbles": {
          "attempts": 6,
          "success": 3,
          "past": 0
        },
        "fouls": {
          "drawn": 0,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "dortmund",
      "side": "home",
      "name": "Süle",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 25,
          "position": "DEF",
          "rating": 6.2,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 81,
          "key": 0,
          "accuracy": 74
        },
        "tackles": {
          "total": 4,
          "blocks": 0,
          "interceptions": 0
        },
        "duels": {
          "total": 6,
          "won": 3
        },
        "dribbles": {
          "attempts": 1,
          "success": 1,
          "past": 2
        },
        "fouls": {
          "drawn": 1,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "dortmund",
      "side": "home",
      "name": "Bensebaini",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 5,
          "position": "DEF",
          "rating": 6.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 75,
          "key": 2,
          "accuracy": 77
        },
        "tackles": {
          "total": 2,
          "blocks": 2,
          "interceptions": 4
        },
        "duels": {
          "total": 10,
          "won": 5
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 3
        },
        "fouls": {
          "drawn": 1,
          "committed": 3
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "dortmund",
      "side": "home",
      "name": "Emre Can",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 23,
          "position": "MID",
          "rating": 6.2,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 92,
          "key": 0,
          "accuracy": 86
        },
        "tackles": {
          "total": 5,
          "blocks": 1,
          "interceptions": 1
        },
        "duels": {
          "total": 21,
          "won": 12
        },
        "dribbles": {
          "attempts": 3,
          "success": 1,
          "past": 0
        },
        "fouls": {
          "drawn": 4,
          "committed": 1
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "dortmund",
      "side": "home",
      "name": "Sabitzer",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 20,
          "position": "MID",
          "rating": 6.2,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 44,
          "key": 0,
          "accuracy": 68
        },
        "tackles": {
          "total": 2,
          "blocks": 1,
          "interceptions": 3
        },
        "duels": {
          "total": 9,
          "won": 4
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 3
        },
        "fouls": {
          "drawn": 4,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "dortmund",
      "side": "home",
      "name": "Brandt",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 19,
          "position": "MID",
          "rating": 6.8,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 3,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 1,
          "saves": null
        },
        "passes": {
          "total": 95,
          "key": 0,
          "accuracy": 79
        },
        "tackles": {
          "total": 1,
          "blocks": 0,
          "interceptions": 1
        },
        "duels": {
          "total": 15,
          "won": 6
        },
        "dribbles": {
          "attempts": 5,
          "success": 3,
          "past": 2
        },
        "fouls": {
          "drawn": 4,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "dortmund",
      "side": "home",
      "name": "Adeyemi",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 7,
          "position": "MID",
          "rating": 7.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 1,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 60,
          "key": 2,
          "accuracy": 91
        },
        "tackles": {
          "total": 0,
          "blocks": 0,
          "interceptions": 3
        },
        "duels": {
          "total": 19,
          "won": 11
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 1
        },
        "fouls": {
          "drawn": 2,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "dortmund",
      "side": "home",
      "name": "Gittens",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 43,
          "position": "FWD",
          "rating": 6.4,
          "captain": true,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 3,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 57,
          "key": 0,
          "accuracy": 93
        },
        "tackles": {
          "total": 3,
          "blocks": 2,
          "interceptions": 4
        },
        "duels": {
          "total": 17,
          "won": 6
        },
        "dribbles": {
          "attempts": 8,
          "success": 4,
          "past": 2
        },
        "fouls": {
          "drawn": 2,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "dortmund",
      "side": "home",
      "name": "Guirassy",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 14,
          "position": "FWD",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 7,
          "on": 5
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 54,
          "key": 2,
          "accuracy": 71
        },
        "tackles": {
          "total": 3,
          "blocks": 0,
          "interceptions": 4
        },
        "duels": {
          "total": 15,
          "won": 9
        },
        "dribbles": {
          "attempts": 4,
          "success": 1,
          "past": 3
        },
        "fouls": {
          "drawn": 4,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "leverkusen",
      "side": "away",
      "name": "Hrádecký",
      "position": "GK",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 1,
          "position": "GK",
          "rating": 6.2,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 1,
          "assists": 0,
          "saves": 4
        },
        "passes": {
          "total": 20,
          "key": 0,
          "accuracy": 82
        },
        "tackles": {
          "total": 4,
          "blocks": 2,
          "interceptions": 4
        },
        "duels": {
          "total": 3,
          "won": 0
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 0
        },
        "fouls": {
          "drawn": 4,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "leverkusen",
      "side": "away",
      "name": "Tapsoba",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 12,
          "position": "DEF",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 44,
          "key": 1,
          "accuracy": 71
        },
        "tackles": {
          "total": 4,
          "blocks": 0,
          "interceptions": 2
        },
        "duels": {
          "total": 5,
          "won": 2
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 1
        },
        "fouls": {
          "drawn": 0,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "leverkusen",
      "side": "away",
      "name": "Tah",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 4,
          "position": "DEF",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 46,
          "key": 1,
          "accuracy": 77
        },
        "tackles": {
          "total": 1,
          "blocks": 2,
          "interceptions": 4
        },
        "duels": {
          "total": 8,
          "won": 4
        },
        "dribbles": {
          "attempts": 7,
          "success": 5,
          "past": 2
        },
        "fouls": {
          "drawn": 4,
          "committed": 2
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "leverkusen",
      "side": "away",
      "name": "Hincapié",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 3,
          "position": "DEF",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 81,
          "key": 0,
          "accuracy": 73
        },
        "tackles": {
          "total": 3,
          "blocks": 1,
          "interceptions": 0
        },
        "duels": {
          "total": 17,
          "won": 10
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 2
        },
        "fouls": {
          "drawn": 2,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "leverkusen",
      "side": "away",
      "name": "Frimpong",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 30,
          "position": "MID",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 41,
          "key": 3,
          "accuracy": 66
        },
        "tackles": {
          "total": 3,
          "blocks": 2,
          "interceptions": 0
        },
        "duels": {
          "total": 15,
          "won": 10
        },
        "dribbles": {
          "attempts": 3,
          "success": 1,
          "past": 2
        },
        "fouls": {
          "drawn": 4,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "leverkusen",
      "side": "away",
      "name": "Andrich",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 8,
          "position": "MID",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 92,
          "key": 0,
          "accuracy": 76
        },
        "tackles": {
          "total": 1,
          "blocks": 0,
          "interceptions": 4
        },
        "duels": {
          "total": 7,
          "won": 5
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 3
        },
        "fouls": {
          "drawn": 0,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "leverkusen",
      "side": "away",
      "name": "Palacios",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 25,
          "position": "MID",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 3,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 94,
          "key": 1,
          "accuracy": 85
        },
        "tackles": {
          "total": 2,
          "blocks": 1,
          "interceptions": 2
        },
        "duels": {
          "total": 11,
          "won": 4
        },
        "dribbles": {
          "attempts": 7,
          "success": 2,
          "past": 0
        },
        "fouls": {
          "drawn": 3,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "leverkusen",
      "side": "away",
      "name": "Grimaldo",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 20,
          "position": "MID",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 3,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 80,
          "key": 1,
          "accuracy": 67
        },
        "tackles": {
          "total": 5,
          "blocks": 0,
          "interceptions": 0
        },
        "duels": {
          "total": 22,
          "won": 11
        },
        "dribbles": {
          "attempts": 2,
          "success": 2,
          "past": 0
        },
        "fouls": {
          "drawn": 0,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "leverkusen",
      "side": "away",
      "name": "Wirtz",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 10,
          "position": "FWD",
          "rating": 7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 5,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 60,
          "key": 5,
          "accuracy": 84
        },
        "tackles": {
          "total": 5,
          "blocks": 1,
          "interceptions": 2
        },
        "duels": {
          "total": 17,
          "won": 8
        },
        "dribbles": {
          "attempts": 5,
          "success": 2,
          "past": 3
        },
        "fouls": {
          "drawn": 1,
          "committed": 2
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "leverkusen",
      "side": "away",
      "name": "Schick",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 14,
          "position": "FWD",
          "rating": 6.6,
          "captain": true,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 6,
          "on": 4
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 19,
          "key": 3,
          "accuracy": 71
        },
        "tackles": {
          "total": 3,
          "blocks": 0,
          "interceptions": 2
        },
        "duels": {
          "total": 6,
          "won": 4
        },
        "dribbles": {
          "attempts": 7,
          "success": 5,
          "past": 3
        },
        "fouls": {
          "drawn": 0,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m011",
      "teamId": "leverkusen",
      "side": "away",
      "name": "Boniface",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 54,
          "number": 22,
          "position": "FWD",
          "rating": 6.4,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 7,
          "on": 3
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 26,
          "key": 0,
          "accuracy": 72
        },
        "tackles": {
          "total": 5,
          "blocks": 0,
          "interceptions": 4
        },
        "duels": {
          "total": 5,
          "won": 2
        },
        "dribbles": {
          "attempts": 6,
          "success": 5,
          "past": 3
        },
        "fouls": {
          "drawn": 4,
          "committed": 1
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    }
  ],
  "m021": [
    {
      "matchId": "m021",
      "teamId": "napoli",
      "side": "home",
      "name": "Meret",
      "position": "GK",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 1,
          "position": "GK",
          "rating": 5.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": 2
        },
        "passes": {
          "total": 42,
          "key": 0,
          "accuracy": 73
        },
        "tackles": {
          "total": 5,
          "blocks": 2,
          "interceptions": 2
        },
        "duels": {
          "total": 1,
          "won": 0
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 0
        },
        "fouls": {
          "drawn": 0,
          "committed": 2
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "napoli",
      "side": "home",
      "name": "Di Lorenzo",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 22,
          "position": "DEF",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 57,
          "key": 1,
          "accuracy": 81
        },
        "tackles": {
          "total": 0,
          "blocks": 2,
          "interceptions": 3
        },
        "duels": {
          "total": 8,
          "won": 5
        },
        "dribbles": {
          "attempts": 1,
          "success": 0,
          "past": 0
        },
        "fouls": {
          "drawn": 1,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "napoli",
      "side": "home",
      "name": "Rrahmani",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 13,
          "position": "DEF",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 51,
          "key": 0,
          "accuracy": 90
        },
        "tackles": {
          "total": 3,
          "blocks": 2,
          "interceptions": 3
        },
        "duels": {
          "total": 19,
          "won": 7
        },
        "dribbles": {
          "attempts": 7,
          "success": 2,
          "past": 2
        },
        "fouls": {
          "drawn": 3,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "napoli",
      "side": "home",
      "name": "Juan Jesus",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 5,
          "position": "DEF",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 33,
          "key": 2,
          "accuracy": 73
        },
        "tackles": {
          "total": 5,
          "blocks": 0,
          "interceptions": 1
        },
        "duels": {
          "total": 17,
          "won": 12
        },
        "dribbles": {
          "attempts": 5,
          "success": 3,
          "past": 3
        },
        "fouls": {
          "drawn": 4,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "napoli",
      "side": "home",
      "name": "Olivera",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 17,
          "position": "DEF",
          "rating": 6.8,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 31,
          "key": 1,
          "accuracy": 67
        },
        "tackles": {
          "total": 2,
          "blocks": 2,
          "interceptions": 0
        },
        "duels": {
          "total": 19,
          "won": 10
        },
        "dribbles": {
          "attempts": 6,
          "success": 2,
          "past": 3
        },
        "fouls": {
          "drawn": 4,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "napoli",
      "side": "home",
      "name": "Kvaratskhelia",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 61,
          "position": "MID",
          "rating": 6.9,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 1,
          "saves": null
        },
        "passes": {
          "total": 87,
          "key": 2,
          "accuracy": 76
        },
        "tackles": {
          "total": 3,
          "blocks": 1,
          "interceptions": 0
        },
        "duels": {
          "total": 13,
          "won": 7
        },
        "dribbles": {
          "attempts": 7,
          "success": 5,
          "past": 2
        },
        "fouls": {
          "drawn": 4,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "napoli",
      "side": "home",
      "name": "Lobotka",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 68,
          "position": "MID",
          "rating": 6.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 3
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 59,
          "key": 2,
          "accuracy": 76
        },
        "tackles": {
          "total": 4,
          "blocks": 1,
          "interceptions": 2
        },
        "duels": {
          "total": 22,
          "won": 12
        },
        "dribbles": {
          "attempts": 7,
          "success": 3,
          "past": 1
        },
        "fouls": {
          "drawn": 3,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "napoli",
      "side": "home",
      "name": "McTominay",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 8,
          "position": "MID",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 37,
          "key": 3,
          "accuracy": 88
        },
        "tackles": {
          "total": 5,
          "blocks": 2,
          "interceptions": 3
        },
        "duels": {
          "total": 11,
          "won": 6
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 1
        },
        "fouls": {
          "drawn": 4,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "napoli",
      "side": "home",
      "name": "Osimhen",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 60,
          "position": "FWD",
          "rating": 7.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 7,
          "on": 3
        },
        "goals": {
          "total": 1,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 21,
          "key": 0,
          "accuracy": 68
        },
        "tackles": {
          "total": 2,
          "blocks": 0,
          "interceptions": 1
        },
        "duels": {
          "total": 19,
          "won": 11
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 2
        },
        "fouls": {
          "drawn": 3,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "napoli",
      "side": "home",
      "name": "Lukaku",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 11,
          "position": "FWD",
          "rating": 6.3,
          "captain": true,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 6,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 70,
          "key": 4,
          "accuracy": 89
        },
        "tackles": {
          "total": 0,
          "blocks": 2,
          "interceptions": 4
        },
        "duels": {
          "total": 16,
          "won": 6
        },
        "dribbles": {
          "attempts": 7,
          "success": 4,
          "past": 2
        },
        "fouls": {
          "drawn": 3,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "napoli",
      "side": "home",
      "name": "Raspadori",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 81,
          "position": "FWD",
          "rating": 6.3,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 45,
          "key": 0,
          "accuracy": 76
        },
        "tackles": {
          "total": 1,
          "blocks": 2,
          "interceptions": 1
        },
        "duels": {
          "total": 7,
          "won": 4
        },
        "dribbles": {
          "attempts": 7,
          "success": 3,
          "past": 2
        },
        "fouls": {
          "drawn": 3,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "roma",
      "side": "away",
      "name": "Svilar",
      "position": "GK",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 99,
          "position": "GK",
          "rating": 6.2,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 1,
          "assists": 0,
          "saves": 3
        },
        "passes": {
          "total": 38,
          "key": 0,
          "accuracy": 90
        },
        "tackles": {
          "total": 3,
          "blocks": 1,
          "interceptions": 0
        },
        "duels": {
          "total": 3,
          "won": 0
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 0
        },
        "fouls": {
          "drawn": 4,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "roma",
      "side": "away",
      "name": "Mancini",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 23,
          "position": "DEF",
          "rating": 6.9,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 50,
          "key": 2,
          "accuracy": 88
        },
        "tackles": {
          "total": 0,
          "blocks": 0,
          "interceptions": 3
        },
        "duels": {
          "total": 10,
          "won": 6
        },
        "dribbles": {
          "attempts": 6,
          "success": 5,
          "past": 2
        },
        "fouls": {
          "drawn": 1,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "roma",
      "side": "away",
      "name": "Ndicka",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 5,
          "position": "DEF",
          "rating": 6.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 60,
          "key": 0,
          "accuracy": 89
        },
        "tackles": {
          "total": 2,
          "blocks": 2,
          "interceptions": 4
        },
        "duels": {
          "total": 20,
          "won": 14
        },
        "dribbles": {
          "attempts": 4,
          "success": 3,
          "past": 3
        },
        "fouls": {
          "drawn": 2,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "roma",
      "side": "away",
      "name": "Hermoso",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 14,
          "position": "DEF",
          "rating": 6.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 53,
          "key": 1,
          "accuracy": 70
        },
        "tackles": {
          "total": 0,
          "blocks": 1,
          "interceptions": 3
        },
        "duels": {
          "total": 21,
          "won": 9
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 1
        },
        "fouls": {
          "drawn": 3,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "roma",
      "side": "away",
      "name": "Zalewski",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 59,
          "position": "MID",
          "rating": 6.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 79,
          "key": 3,
          "accuracy": 76
        },
        "tackles": {
          "total": 1,
          "blocks": 2,
          "interceptions": 4
        },
        "duels": {
          "total": 17,
          "won": 9
        },
        "dribbles": {
          "attempts": 7,
          "success": 3,
          "past": 2
        },
        "fouls": {
          "drawn": 1,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "roma",
      "side": "away",
      "name": "Pellegrini",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 7,
          "position": "MID",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 66,
          "key": 0,
          "accuracy": 66
        },
        "tackles": {
          "total": 1,
          "blocks": 2,
          "interceptions": 3
        },
        "duels": {
          "total": 21,
          "won": 13
        },
        "dribbles": {
          "attempts": 6,
          "success": 2,
          "past": 1
        },
        "fouls": {
          "drawn": 4,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "roma",
      "side": "away",
      "name": "Cristante",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 4,
          "position": "MID",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 77,
          "key": 3,
          "accuracy": 82
        },
        "tackles": {
          "total": 3,
          "blocks": 2,
          "interceptions": 1
        },
        "duels": {
          "total": 18,
          "won": 7
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 1
        },
        "fouls": {
          "drawn": 4,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "roma",
      "side": "away",
      "name": "Pisilli",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 61,
          "position": "MID",
          "rating": 6.8,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 45,
          "key": 3,
          "accuracy": 77
        },
        "tackles": {
          "total": 3,
          "blocks": 0,
          "interceptions": 2
        },
        "duels": {
          "total": 9,
          "won": 4
        },
        "dribbles": {
          "attempts": 8,
          "success": 5,
          "past": 0
        },
        "fouls": {
          "drawn": 3,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "roma",
      "side": "away",
      "name": "Spinazzola",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 37,
          "position": "MID",
          "rating": 6.8,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 82,
          "key": 3,
          "accuracy": 84
        },
        "tackles": {
          "total": 1,
          "blocks": 2,
          "interceptions": 0
        },
        "duels": {
          "total": 7,
          "won": 3
        },
        "dribbles": {
          "attempts": 6,
          "success": 5,
          "past": 2
        },
        "fouls": {
          "drawn": 1,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "roma",
      "side": "away",
      "name": "Dybala",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 21,
          "position": "FWD",
          "rating": 6.7,
          "captain": true,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 41,
          "key": 4,
          "accuracy": 88
        },
        "tackles": {
          "total": 1,
          "blocks": 0,
          "interceptions": 0
        },
        "duels": {
          "total": 16,
          "won": 8
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 3
        },
        "fouls": {
          "drawn": 2,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m021",
      "teamId": "roma",
      "side": "away",
      "name": "Dovbyk",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 73,
          "number": 11,
          "position": "FWD",
          "rating": 6.8,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 6,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 43,
          "key": 1,
          "accuracy": 87
        },
        "tackles": {
          "total": 3,
          "blocks": 1,
          "interceptions": 4
        },
        "duels": {
          "total": 13,
          "won": 7
        },
        "dribbles": {
          "attempts": 4,
          "success": 1,
          "past": 2
        },
        "fouls": {
          "drawn": 2,
          "committed": 3
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    }
  ],
  "m023": [
    {
      "matchId": "m023",
      "teamId": "lyon",
      "side": "home",
      "name": "Perri",
      "position": "GK",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 1,
          "position": "GK",
          "rating": 6.1,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": 2
        },
        "passes": {
          "total": 36,
          "key": 0,
          "accuracy": 84
        },
        "tackles": {
          "total": 5,
          "blocks": 1,
          "interceptions": 1
        },
        "duels": {
          "total": 3,
          "won": 0
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 0
        },
        "fouls": {
          "drawn": 2,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "lyon",
      "side": "home",
      "name": "Maitland-Niles",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 27,
          "position": "DEF",
          "rating": 6.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 42,
          "key": 1,
          "accuracy": 94
        },
        "tackles": {
          "total": 3,
          "blocks": 2,
          "interceptions": 3
        },
        "duels": {
          "total": 8,
          "won": 5
        },
        "dribbles": {
          "attempts": 4,
          "success": 2,
          "past": 1
        },
        "fouls": {
          "drawn": 0,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "lyon",
      "side": "home",
      "name": "Mata",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 3,
          "position": "DEF",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 64,
          "key": 1,
          "accuracy": 88
        },
        "tackles": {
          "total": 3,
          "blocks": 1,
          "interceptions": 0
        },
        "duels": {
          "total": 8,
          "won": 4
        },
        "dribbles": {
          "attempts": 8,
          "success": 4,
          "past": 3
        },
        "fouls": {
          "drawn": 1,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "lyon",
      "side": "home",
      "name": "Caleta-Car",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 5,
          "position": "DEF",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 74,
          "key": 2,
          "accuracy": 69
        },
        "tackles": {
          "total": 4,
          "blocks": 2,
          "interceptions": 2
        },
        "duels": {
          "total": 10,
          "won": 4
        },
        "dribbles": {
          "attempts": 1,
          "success": 0,
          "past": 1
        },
        "fouls": {
          "drawn": 3,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "lyon",
      "side": "home",
      "name": "Tagliafico",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 21,
          "position": "DEF",
          "rating": 6.2,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 71,
          "key": 0,
          "accuracy": 87
        },
        "tackles": {
          "total": 5,
          "blocks": 2,
          "interceptions": 3
        },
        "duels": {
          "total": 15,
          "won": 5
        },
        "dribbles": {
          "attempts": 3,
          "success": 2,
          "past": 3
        },
        "fouls": {
          "drawn": 2,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "lyon",
      "side": "home",
      "name": "Matić",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 6,
          "position": "MID",
          "rating": 7.1,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 66,
          "key": 4,
          "accuracy": 83
        },
        "tackles": {
          "total": 4,
          "blocks": 1,
          "interceptions": 4
        },
        "duels": {
          "total": 21,
          "won": 13
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 0
        },
        "fouls": {
          "drawn": 3,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "lyon",
      "side": "home",
      "name": "Tolisso",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 8,
          "position": "MID",
          "rating": 6.8,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 53,
          "key": 3,
          "accuracy": 77
        },
        "tackles": {
          "total": 2,
          "blocks": 2,
          "interceptions": 0
        },
        "duels": {
          "total": 8,
          "won": 5
        },
        "dribbles": {
          "attempts": 8,
          "success": 4,
          "past": 2
        },
        "fouls": {
          "drawn": 2,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "lyon",
      "side": "home",
      "name": "Cherki",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 18,
          "position": "MID",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 88,
          "key": 0,
          "accuracy": 76
        },
        "tackles": {
          "total": 5,
          "blocks": 1,
          "interceptions": 3
        },
        "duels": {
          "total": 21,
          "won": 13
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 3
        },
        "fouls": {
          "drawn": 1,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "lyon",
      "side": "home",
      "name": "Nuamah",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 24,
          "position": "MID",
          "rating": 6.4,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 80,
          "key": 2,
          "accuracy": 78
        },
        "tackles": {
          "total": 0,
          "blocks": 2,
          "interceptions": 4
        },
        "duels": {
          "total": 21,
          "won": 9
        },
        "dribbles": {
          "attempts": 8,
          "success": 2,
          "past": 0
        },
        "fouls": {
          "drawn": 4,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "lyon",
      "side": "home",
      "name": "Fofana",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 11,
          "position": "FWD",
          "rating": 7.2,
          "captain": true,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 6,
          "on": 3
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 65,
          "key": 5,
          "accuracy": 86
        },
        "tackles": {
          "total": 3,
          "blocks": 2,
          "interceptions": 4
        },
        "duels": {
          "total": 18,
          "won": 12
        },
        "dribbles": {
          "attempts": 7,
          "success": 3,
          "past": 2
        },
        "fouls": {
          "drawn": 3,
          "committed": 1
        },
        "cards": {
          "yellow": 1,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "lyon",
      "side": "home",
      "name": "Lacazette",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 10,
          "position": "FWD",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 3,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 58,
          "key": 3,
          "accuracy": 72
        },
        "tackles": {
          "total": 1,
          "blocks": 1,
          "interceptions": 3
        },
        "duels": {
          "total": 5,
          "won": 3
        },
        "dribbles": {
          "attempts": 3,
          "success": 1,
          "past": 2
        },
        "fouls": {
          "drawn": 4,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "monaco",
      "side": "away",
      "name": "Köhn",
      "position": "GK",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 16,
          "position": "GK",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": 2
        },
        "passes": {
          "total": 36,
          "key": 0,
          "accuracy": 90
        },
        "tackles": {
          "total": 3,
          "blocks": 1,
          "interceptions": 2
        },
        "duels": {
          "total": 3,
          "won": 2
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 0
        },
        "fouls": {
          "drawn": 0,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "monaco",
      "side": "away",
      "name": "Vanderson",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 2,
          "position": "DEF",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 48,
          "key": 0,
          "accuracy": 73
        },
        "tackles": {
          "total": 4,
          "blocks": 2,
          "interceptions": 4
        },
        "duels": {
          "total": 6,
          "won": 3
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 1
        },
        "fouls": {
          "drawn": 3,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "monaco",
      "side": "away",
      "name": "Salisu",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 5,
          "position": "DEF",
          "rating": 6.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 62,
          "key": 1,
          "accuracy": 92
        },
        "tackles": {
          "total": 3,
          "blocks": 2,
          "interceptions": 2
        },
        "duels": {
          "total": 10,
          "won": 5
        },
        "dribbles": {
          "attempts": 4,
          "success": 2,
          "past": 1
        },
        "fouls": {
          "drawn": 1,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "monaco",
      "side": "away",
      "name": "Kehrer",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 4,
          "position": "DEF",
          "rating": 6.2,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 47,
          "key": 0,
          "accuracy": 78
        },
        "tackles": {
          "total": 2,
          "blocks": 0,
          "interceptions": 1
        },
        "duels": {
          "total": 5,
          "won": 2
        },
        "dribbles": {
          "attempts": 3,
          "success": 1,
          "past": 3
        },
        "fouls": {
          "drawn": 2,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "monaco",
      "side": "away",
      "name": "Caio Henrique",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 26,
          "position": "DEF",
          "rating": 6.1,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 47,
          "key": 1,
          "accuracy": 89
        },
        "tackles": {
          "total": 3,
          "blocks": 2,
          "interceptions": 2
        },
        "duels": {
          "total": 11,
          "won": 4
        },
        "dribbles": {
          "attempts": 4,
          "success": 2,
          "past": 3
        },
        "fouls": {
          "drawn": 0,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "monaco",
      "side": "away",
      "name": "Akliouche",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 17,
          "position": "MID",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 48,
          "key": 0,
          "accuracy": 68
        },
        "tackles": {
          "total": 1,
          "blocks": 2,
          "interceptions": 0
        },
        "duels": {
          "total": 4,
          "won": 3
        },
        "dribbles": {
          "attempts": 4,
          "success": 2,
          "past": 1
        },
        "fouls": {
          "drawn": 0,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "monaco",
      "side": "away",
      "name": "Camara",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 8,
          "position": "MID",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 3,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 74,
          "key": 1,
          "accuracy": 71
        },
        "tackles": {
          "total": 3,
          "blocks": 1,
          "interceptions": 1
        },
        "duels": {
          "total": 21,
          "won": 11
        },
        "dribbles": {
          "attempts": 3,
          "success": 2,
          "past": 3
        },
        "fouls": {
          "drawn": 1,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "monaco",
      "side": "away",
      "name": "Zakaria",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 22,
          "position": "MID",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 39,
          "key": 1,
          "accuracy": 71
        },
        "tackles": {
          "total": 3,
          "blocks": 2,
          "interceptions": 0
        },
        "duels": {
          "total": 17,
          "won": 7
        },
        "dribbles": {
          "attempts": 3,
          "success": 2,
          "past": 3
        },
        "fouls": {
          "drawn": 0,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "monaco",
      "side": "away",
      "name": "Golovin",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 7,
          "position": "MID",
          "rating": 7.1,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 3,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 91,
          "key": 4,
          "accuracy": 88
        },
        "tackles": {
          "total": 2,
          "blocks": 0,
          "interceptions": 0
        },
        "duels": {
          "total": 12,
          "won": 7
        },
        "dribbles": {
          "attempts": 3,
          "success": 2,
          "past": 0
        },
        "fouls": {
          "drawn": 4,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "monaco",
      "side": "away",
      "name": "Embolo",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 77,
          "position": "FWD",
          "rating": 6.6,
          "captain": true,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 5,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 28,
          "key": 4,
          "accuracy": 84
        },
        "tackles": {
          "total": 3,
          "blocks": 0,
          "interceptions": 2
        },
        "duels": {
          "total": 8,
          "won": 3
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 3
        },
        "fouls": {
          "drawn": 3,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m023",
      "teamId": "monaco",
      "side": "away",
      "name": "Ben Yedder",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 38,
          "number": 9,
          "position": "FWD",
          "rating": 6.9,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 22,
          "key": 5,
          "accuracy": 79
        },
        "tackles": {
          "total": 2,
          "blocks": 1,
          "interceptions": 2
        },
        "duels": {
          "total": 14,
          "won": 9
        },
        "dribbles": {
          "attempts": 4,
          "success": 2,
          "past": 0
        },
        "fouls": {
          "drawn": 1,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    }
  ],
  "m010": [
    {
      "matchId": "m010",
      "teamId": "bayernmunich",
      "side": "home",
      "name": "Neuer",
      "position": "GK",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 1,
          "position": "GK",
          "rating": 5.8,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 2,
          "assists": 0,
          "saves": 3
        },
        "passes": {
          "total": 33,
          "key": 0,
          "accuracy": 87
        },
        "tackles": {
          "total": 2,
          "blocks": 1,
          "interceptions": 1
        },
        "duels": {
          "total": 2,
          "won": 0
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 0
        },
        "fouls": {
          "drawn": 0,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "bayernmunich",
      "side": "home",
      "name": "Sané",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 61,
          "position": "FWD",
          "rating": 8.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 2
        },
        "goals": {
          "total": 1,
          "conceded": 0,
          "assists": 1,
          "saves": null
        },
        "passes": {
          "total": 63,
          "key": 5,
          "accuracy": 89
        },
        "tackles": {
          "total": 5,
          "blocks": 1,
          "interceptions": 4
        },
        "duels": {
          "total": 18,
          "won": 13
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 3
        },
        "fouls": {
          "drawn": 2,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "bayernmunich",
      "side": "home",
      "name": "Upamecano",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 2,
          "position": "DEF",
          "rating": 6.1,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 45,
          "key": 0,
          "accuracy": 74
        },
        "tackles": {
          "total": 4,
          "blocks": 2,
          "interceptions": 2
        },
        "duels": {
          "total": 4,
          "won": 2
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 2
        },
        "fouls": {
          "drawn": 2,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "bayernmunich",
      "side": "home",
      "name": "Kim",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 3,
          "position": "DEF",
          "rating": 6.4,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 70,
          "key": 2,
          "accuracy": 77
        },
        "tackles": {
          "total": 1,
          "blocks": 0,
          "interceptions": 3
        },
        "duels": {
          "total": 19,
          "won": 8
        },
        "dribbles": {
          "attempts": 3,
          "success": 2,
          "past": 0
        },
        "fouls": {
          "drawn": 0,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "bayernmunich",
      "side": "home",
      "name": "Davies",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 19,
          "position": "DEF",
          "rating": 6.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 45,
          "key": 0,
          "accuracy": 88
        },
        "tackles": {
          "total": 4,
          "blocks": 1,
          "interceptions": 4
        },
        "duels": {
          "total": 9,
          "won": 5
        },
        "dribbles": {
          "attempts": 7,
          "success": 4,
          "past": 0
        },
        "fouls": {
          "drawn": 3,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "bayernmunich",
      "side": "home",
      "name": "Kimmich",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 6,
          "position": "MID",
          "rating": 6.1,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 73,
          "key": 0,
          "accuracy": 81
        },
        "tackles": {
          "total": 3,
          "blocks": 0,
          "interceptions": 1
        },
        "duels": {
          "total": 9,
          "won": 4
        },
        "dribbles": {
          "attempts": 7,
          "success": 3,
          "past": 3
        },
        "fouls": {
          "drawn": 2,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "bayernmunich",
      "side": "home",
      "name": "Pavlović",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 45,
          "position": "MID",
          "rating": 6.4,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 73,
          "key": 0,
          "accuracy": 77
        },
        "tackles": {
          "total": 1,
          "blocks": 0,
          "interceptions": 3
        },
        "duels": {
          "total": 8,
          "won": 4
        },
        "dribbles": {
          "attempts": 3,
          "success": 1,
          "past": 3
        },
        "fouls": {
          "drawn": 3,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "bayernmunich",
      "side": "home",
      "name": "Musiala",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 42,
          "position": "MID",
          "rating": 6.2,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 60,
          "key": 1,
          "accuracy": 83
        },
        "tackles": {
          "total": 4,
          "blocks": 2,
          "interceptions": 3
        },
        "duels": {
          "total": 14,
          "won": 6
        },
        "dribbles": {
          "attempts": 7,
          "success": 5,
          "past": 0
        },
        "fouls": {
          "drawn": 0,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "bayernmunich",
      "side": "home",
      "name": "Gnabry",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 7,
          "position": "MID",
          "rating": 6.1,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 85,
          "key": 1,
          "accuracy": 86
        },
        "tackles": {
          "total": 2,
          "blocks": 0,
          "interceptions": 1
        },
        "duels": {
          "total": 8,
          "won": 3
        },
        "dribbles": {
          "attempts": 1,
          "success": 0,
          "past": 0
        },
        "fouls": {
          "drawn": 2,
          "committed": 2
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "bayernmunich",
      "side": "home",
      "name": "Müller",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 60,
          "position": "FWD",
          "rating": 8.3,
          "captain": true,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 5,
          "on": 3
        },
        "goals": {
          "total": 1,
          "conceded": 0,
          "assists": 1,
          "saves": null
        },
        "passes": {
          "total": 49,
          "key": 2,
          "accuracy": 81
        },
        "tackles": {
          "total": 5,
          "blocks": 2,
          "interceptions": 4
        },
        "duels": {
          "total": 11,
          "won": 5
        },
        "dribbles": {
          "attempts": 7,
          "success": 2,
          "past": 3
        },
        "fouls": {
          "drawn": 0,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "bayernmunich",
      "side": "home",
      "name": "Kane",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 9,
          "position": "FWD",
          "rating": 8.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 6,
          "on": 4
        },
        "goals": {
          "total": 1,
          "conceded": 0,
          "assists": 1,
          "saves": null
        },
        "passes": {
          "total": 59,
          "key": 2,
          "accuracy": 79
        },
        "tackles": {
          "total": 1,
          "blocks": 2,
          "interceptions": 1
        },
        "duels": {
          "total": 18,
          "won": 10
        },
        "dribbles": {
          "attempts": 8,
          "success": 3,
          "past": 3
        },
        "fouls": {
          "drawn": 3,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "psg",
      "side": "away",
      "name": "Donnarumma",
      "position": "GK",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 99,
          "position": "GK",
          "rating": 5.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 0,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 3,
          "assists": 0,
          "saves": 4
        },
        "passes": {
          "total": 41,
          "key": 0,
          "accuracy": 90
        },
        "tackles": {
          "total": 3,
          "blocks": 2,
          "interceptions": 1
        },
        "duels": {
          "total": 1,
          "won": 0
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 0
        },
        "fouls": {
          "drawn": 4,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "psg",
      "side": "away",
      "name": "Hakimi",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 2,
          "position": "DEF",
          "rating": 6.9,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 33,
          "key": 1,
          "accuracy": 72
        },
        "tackles": {
          "total": 0,
          "blocks": 2,
          "interceptions": 1
        },
        "duels": {
          "total": 12,
          "won": 8
        },
        "dribbles": {
          "attempts": 6,
          "success": 2,
          "past": 3
        },
        "fouls": {
          "drawn": 3,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "psg",
      "side": "away",
      "name": "Marquinhos",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 5,
          "position": "DEF",
          "rating": 6.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 55,
          "key": 2,
          "accuracy": 72
        },
        "tackles": {
          "total": 0,
          "blocks": 1,
          "interceptions": 0
        },
        "duels": {
          "total": 15,
          "won": 10
        },
        "dribbles": {
          "attempts": 5,
          "success": 2,
          "past": 3
        },
        "fouls": {
          "drawn": 4,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "psg",
      "side": "away",
      "name": "Pacho",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 51,
          "position": "DEF",
          "rating": 6.3,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 53,
          "key": 1,
          "accuracy": 80
        },
        "tackles": {
          "total": 3,
          "blocks": 0,
          "interceptions": 3
        },
        "duels": {
          "total": 18,
          "won": 8
        },
        "dribbles": {
          "attempts": 6,
          "success": 4,
          "past": 2
        },
        "fouls": {
          "drawn": 1,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "psg",
      "side": "away",
      "name": "Mendes",
      "position": "DEF",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 25,
          "position": "DEF",
          "rating": 6.6,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 1,
          "on": 0
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 76,
          "key": 1,
          "accuracy": 93
        },
        "tackles": {
          "total": 0,
          "blocks": 0,
          "interceptions": 3
        },
        "duels": {
          "total": 20,
          "won": 14
        },
        "dribbles": {
          "attempts": 0,
          "success": 0,
          "past": 1
        },
        "fouls": {
          "drawn": 1,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "psg",
      "side": "away",
      "name": "Fabián Ruiz",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 8,
          "position": "MID",
          "rating": 6.7,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 4,
          "on": 2
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 88,
          "key": 0,
          "accuracy": 79
        },
        "tackles": {
          "total": 3,
          "blocks": 2,
          "interceptions": 0
        },
        "duels": {
          "total": 18,
          "won": 11
        },
        "dribbles": {
          "attempts": 5,
          "success": 4,
          "past": 1
        },
        "fouls": {
          "drawn": 0,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "psg",
      "side": "away",
      "name": "João Neves",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 87,
          "position": "MID",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 87,
          "key": 1,
          "accuracy": 77
        },
        "tackles": {
          "total": 3,
          "blocks": 0,
          "interceptions": 2
        },
        "duels": {
          "total": 17,
          "won": 9
        },
        "dribbles": {
          "attempts": 5,
          "success": 4,
          "past": 1
        },
        "fouls": {
          "drawn": 3,
          "committed": 3
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "psg",
      "side": "away",
      "name": "Vitinha",
      "position": "MID",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 17,
          "position": "MID",
          "rating": 6.8,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 60,
          "key": 3,
          "accuracy": 73
        },
        "tackles": {
          "total": 5,
          "blocks": 2,
          "interceptions": 2
        },
        "duels": {
          "total": 20,
          "won": 10
        },
        "dribbles": {
          "attempts": 2,
          "success": 1,
          "past": 3
        },
        "fouls": {
          "drawn": 4,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "psg",
      "side": "away",
      "name": "Dembélé",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 10,
          "position": "FWD",
          "rating": 8.3,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 2,
          "on": 1
        },
        "goals": {
          "total": 1,
          "conceded": 0,
          "assists": 1,
          "saves": null
        },
        "passes": {
          "total": 50,
          "key": 5,
          "accuracy": 68
        },
        "tackles": {
          "total": 5,
          "blocks": 2,
          "interceptions": 1
        },
        "duels": {
          "total": 12,
          "won": 7
        },
        "dribbles": {
          "attempts": 3,
          "success": 2,
          "past": 3
        },
        "fouls": {
          "drawn": 0,
          "committed": 1
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "psg",
      "side": "away",
      "name": "Lee Kang-in",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 60,
          "position": "FWD",
          "rating": 7.4,
          "captain": true,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 7,
          "on": 4
        },
        "goals": {
          "total": 1,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 33,
          "key": 0,
          "accuracy": 83
        },
        "tackles": {
          "total": 0,
          "blocks": 2,
          "interceptions": 4
        },
        "duels": {
          "total": 7,
          "won": 3
        },
        "dribbles": {
          "attempts": 5,
          "success": 2,
          "past": 0
        },
        "fouls": {
          "drawn": 2,
          "committed": 0
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    },
    {
      "matchId": "m010",
      "teamId": "psg",
      "side": "away",
      "name": "Barcola",
      "position": "FWD",
      "statistics": {
        "games": {
          "minutes": 78,
          "number": 29,
          "position": "FWD",
          "rating": 6.5,
          "captain": false,
          "substitute": false
        },
        "offsides": null,
        "shots": {
          "total": 3,
          "on": 1
        },
        "goals": {
          "total": 0,
          "conceded": 0,
          "assists": 0,
          "saves": null
        },
        "passes": {
          "total": 59,
          "key": 1,
          "accuracy": 86
        },
        "tackles": {
          "total": 4,
          "blocks": 0,
          "interceptions": 1
        },
        "duels": {
          "total": 10,
          "won": 6
        },
        "dribbles": {
          "attempts": 4,
          "success": 1,
          "past": 3
        },
        "fouls": {
          "drawn": 4,
          "committed": 4
        },
        "cards": {
          "yellow": 0,
          "red": 0
        },
        "penalty": {
          "won": 0,
          "commited": 0,
          "scored": 0,
          "missed": 0,
          "saved": 0
        }
      }
    }
  ]
}

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
