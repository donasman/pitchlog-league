/**
 * Mock 팀 시즌 통계 — API /teams/statistics
 * ⚠ 이 파일은 scripts/genMockStats.mjs 가 생성한다. 직접 수정하지 않는다.
 *   수정이 필요하면 생성기를 고치고 다시 실행한다.
 *
 * STANDINGS 에서 파생하므로 승점·득실이 순위표와 절대 어긋나지 않는다.
 * 키 형식: "<competitionSlug>:<teamId>" — 한 팀이 여러 대회에 참가한다
 */

export const TEAM_SEASON_STATS = {
  "premier-league:mancity": {
    "competitionSlug": "premier-league",
    "teamId": "mancity",
    "teamSlug": "manchester-city",
    "teamName": "Manchester City",
    "form": "WWDWW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 5,
        "away": 4,
        "total": 9
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 0,
        "away": 1,
        "total": 1
      }
    },
    "goals": {
      "for": {
        "home": 19,
        "away": 13,
        "total": 32,
        "averageTotal": 2.67
      },
      "against": {
        "home": 6,
        "away": 8,
        "total": 14,
        "averageTotal": 1.17
      }
    },
    "biggest": {
      "winHome": "4-0",
      "loseAway": "1-3",
      "streakWins": 2,
      "streakDraws": 0,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "4-4-2",
        "played": 7
      },
      {
        "formation": "4-3-3",
        "played": 5
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 0,
        "31-45": 0,
        "46-60": 4,
        "61-75": 3,
        "76-90": 4
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:arsenal": {
    "competitionSlug": "premier-league",
    "teamId": "arsenal",
    "teamSlug": "arsenal",
    "teamName": "Arsenal",
    "form": "WDWWD",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 5,
        "away": 3,
        "total": 8
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 0,
        "away": 1,
        "total": 1
      }
    },
    "goals": {
      "for": {
        "home": 15,
        "away": 12,
        "total": 27,
        "averageTotal": 2.25
      },
      "against": {
        "home": 6,
        "away": 6,
        "total": 12,
        "averageTotal": 1
      }
    },
    "biggest": {
      "winHome": "4-1",
      "loseAway": "1-2",
      "streakWins": 5,
      "streakDraws": 2,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "5-3-2",
        "played": 11
      },
      {
        "formation": "4-3-3",
        "played": 1
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 0,
        "31-45": 2,
        "46-60": 4,
        "61-75": 1,
        "76-90": 1
      },
      "red": {
        "total": 2
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:liverpool": {
    "competitionSlug": "premier-league",
    "teamId": "liverpool",
    "teamSlug": "liverpool",
    "teamName": "Liverpool",
    "form": "WWLWW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 5,
        "away": 3,
        "total": 8
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 0,
        "away": 2,
        "total": 2
      }
    },
    "goals": {
      "for": {
        "home": 18,
        "away": 11,
        "total": 29,
        "averageTotal": 2.42
      },
      "against": {
        "home": 7,
        "away": 9,
        "total": 16,
        "averageTotal": 1.33
      }
    },
    "biggest": {
      "winHome": "3-1",
      "loseAway": "1-4",
      "streakWins": 4,
      "streakDraws": 3,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "failedToScore": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "lineups": [
      {
        "formation": "4-4-2",
        "played": 8
      },
      {
        "formation": "3-5-2",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 0,
        "31-45": 1,
        "46-60": 2,
        "61-75": 4,
        "76-90": 1
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:chelsea": {
    "competitionSlug": "premier-league",
    "teamId": "chelsea",
    "teamSlug": "chelsea",
    "teamName": "Chelsea",
    "form": "DWWDW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 4,
        "away": 3,
        "total": 7
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 1,
        "away": 1,
        "total": 2
      }
    },
    "goals": {
      "for": {
        "home": 13,
        "away": 11,
        "total": 24,
        "averageTotal": 2
      },
      "against": {
        "home": 7,
        "away": 8,
        "total": 15,
        "averageTotal": 1.25
      }
    },
    "biggest": {
      "winHome": "4-0",
      "loseAway": "1-2",
      "streakWins": 3,
      "streakDraws": 1,
      "streakLoses": 0
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "lineups": [
      {
        "formation": "3-4-3",
        "played": 8
      },
      {
        "formation": "4-4-2",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 3,
        "31-45": 3,
        "46-60": 2,
        "61-75": 5,
        "76-90": 4
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:newcastle": {
    "competitionSlug": "premier-league",
    "teamId": "newcastle",
    "teamSlug": "newcastle",
    "teamName": "Newcastle United",
    "form": "WDWDW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 4,
        "away": 2,
        "total": 6
      },
      "draws": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "loses": {
        "home": 0,
        "away": 2,
        "total": 2
      }
    },
    "goals": {
      "for": {
        "home": 13,
        "away": 9,
        "total": 22,
        "averageTotal": 1.83
      },
      "against": {
        "home": 6,
        "away": 8,
        "total": 14,
        "averageTotal": 1.17
      }
    },
    "biggest": {
      "winHome": "3-1",
      "loseAway": "0-3",
      "streakWins": 3,
      "streakDraws": 3,
      "streakLoses": 3
    },
    "cleanSheet": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "5-3-2",
        "played": 7
      },
      {
        "formation": "4-4-2",
        "played": 5
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 1,
        "31-45": 0,
        "46-60": 2,
        "61-75": 5,
        "76-90": 6
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:spurs": {
    "competitionSlug": "premier-league",
    "teamId": "spurs",
    "teamSlug": "tottenham",
    "teamName": "Tottenham Hotspur",
    "form": "WLWWD",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 4,
        "away": 2,
        "total": 6
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 1,
        "away": 2,
        "total": 3
      }
    },
    "goals": {
      "for": {
        "home": 12,
        "away": 8,
        "total": 20,
        "averageTotal": 1.67
      },
      "against": {
        "home": 7,
        "away": 10,
        "total": 17,
        "averageTotal": 1.42
      }
    },
    "biggest": {
      "winHome": "4-1",
      "loseAway": "1-2",
      "streakWins": 5,
      "streakDraws": 0,
      "streakLoses": 0
    },
    "cleanSheet": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "failedToScore": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "lineups": [
      {
        "formation": "4-2-3-1",
        "played": 10
      },
      {
        "formation": "4-3-3",
        "played": 2
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 1,
        "16-30": 2,
        "31-45": 3,
        "46-60": 2,
        "61-75": 3,
        "76-90": 4
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:astonvilla": {
    "competitionSlug": "premier-league",
    "teamId": "astonvilla",
    "teamSlug": "aston-villa",
    "teamName": "Aston Villa",
    "form": "DWDLW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 3,
        "away": 2,
        "total": 5
      },
      "draws": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "loses": {
        "home": 1,
        "away": 2,
        "total": 3
      }
    },
    "goals": {
      "for": {
        "home": 10,
        "away": 8,
        "total": 18,
        "averageTotal": 1.5
      },
      "against": {
        "home": 8,
        "away": 8,
        "total": 16,
        "averageTotal": 1.33
      }
    },
    "biggest": {
      "winHome": "4-1",
      "loseAway": "1-3",
      "streakWins": 2,
      "streakDraws": 2,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "failedToScore": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "lineups": [
      {
        "formation": "4-4-2",
        "played": 12
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 1,
        "16-30": 4,
        "31-45": 3,
        "46-60": 0,
        "61-75": 2,
        "76-90": 5
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:nottmforest": {
    "competitionSlug": "premier-league",
    "teamId": "nottmforest",
    "teamSlug": "nottm-forest",
    "teamName": "Nottingham Forest",
    "form": "WLDWL",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 3,
        "away": 2,
        "total": 5
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 2,
        "away": 2,
        "total": 4
      }
    },
    "goals": {
      "for": {
        "home": 9,
        "away": 7,
        "total": 16,
        "averageTotal": 1.33
      },
      "against": {
        "home": 7,
        "away": 9,
        "total": 16,
        "averageTotal": 1.33
      }
    },
    "biggest": {
      "winHome": "3-1",
      "loseAway": "1-2",
      "streakWins": 1,
      "streakDraws": 3,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 2,
      "away": 2,
      "total": 4
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "3-4-3",
        "played": 6
      },
      {
        "formation": "5-3-2",
        "played": 6
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 4,
        "31-45": 1,
        "46-60": 3,
        "61-75": 2,
        "76-90": 4
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:brighton": {
    "competitionSlug": "premier-league",
    "teamId": "brighton",
    "teamSlug": "brighton",
    "teamName": "Brighton",
    "form": "LWWDL",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 3,
        "away": 2,
        "total": 5
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 2,
        "away": 3,
        "total": 5
      }
    },
    "goals": {
      "for": {
        "home": 10,
        "away": 9,
        "total": 19,
        "averageTotal": 1.58
      },
      "against": {
        "home": 9,
        "away": 11,
        "total": 20,
        "averageTotal": 1.67
      }
    },
    "biggest": {
      "winHome": "4-0",
      "loseAway": "0-3",
      "streakWins": 1,
      "streakDraws": 0,
      "streakLoses": 3
    },
    "cleanSheet": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "5-3-2",
        "played": 9
      },
      {
        "formation": "4-2-3-1",
        "played": 3
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 0,
        "31-45": 4,
        "46-60": 1,
        "61-75": 4,
        "76-90": 0
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:fulham": {
    "competitionSlug": "premier-league",
    "teamId": "fulham",
    "teamSlug": "fulham",
    "teamName": "Fulham",
    "form": "DDLWW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "draws": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "loses": {
        "home": 2,
        "away": 2,
        "total": 4
      }
    },
    "goals": {
      "for": {
        "home": 8,
        "away": 6,
        "total": 14,
        "averageTotal": 1.17
      },
      "against": {
        "home": 8,
        "away": 9,
        "total": 17,
        "averageTotal": 1.42
      }
    },
    "biggest": {
      "winHome": "5-0",
      "loseAway": "1-4",
      "streakWins": 6,
      "streakDraws": 2,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "lineups": [
      {
        "formation": "3-4-3",
        "played": 8
      },
      {
        "formation": "4-4-2",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 4,
        "31-45": 0,
        "46-60": 0,
        "61-75": 1,
        "76-90": 1
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:manutd": {
    "competitionSlug": "premier-league",
    "teamId": "manutd",
    "teamSlug": "manchester-united",
    "teamName": "Manchester United",
    "form": "LWDLW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 3,
        "away": 2,
        "total": 5
      }
    },
    "goals": {
      "for": {
        "home": 9,
        "away": 6,
        "total": 15,
        "averageTotal": 1.25
      },
      "against": {
        "home": 8,
        "away": 11,
        "total": 19,
        "averageTotal": 1.58
      }
    },
    "biggest": {
      "winHome": "5-0",
      "loseAway": "0-3",
      "streakWins": 4,
      "streakDraws": 2,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "4-2-3-1",
        "played": 8
      },
      {
        "formation": "3-4-3",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 0,
        "31-45": 1,
        "46-60": 4,
        "61-75": 5,
        "76-90": 0
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:westham": {
    "competitionSlug": "premier-league",
    "teamId": "westham",
    "teamSlug": "west-ham",
    "teamName": "West Ham United",
    "form": "LWLWL",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 3,
        "away": 3,
        "total": 6
      }
    },
    "goals": {
      "for": {
        "home": 7,
        "away": 7,
        "total": 14,
        "averageTotal": 1.17
      },
      "against": {
        "home": 11,
        "away": 11,
        "total": 22,
        "averageTotal": 1.83
      }
    },
    "biggest": {
      "winHome": "3-0",
      "loseAway": "0-3",
      "streakWins": 6,
      "streakDraws": 1,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "failedToScore": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "lineups": [
      {
        "formation": "4-2-3-1",
        "played": 9
      },
      {
        "formation": "3-4-3",
        "played": 3
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 3,
        "31-45": 1,
        "46-60": 1,
        "61-75": 1,
        "76-90": 0
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:bournemouth": {
    "competitionSlug": "premier-league",
    "teamId": "bournemouth",
    "teamSlug": "bournemouth",
    "teamName": "AFC Bournemouth",
    "form": "LDLWL",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 3,
        "away": 3,
        "total": 6
      }
    },
    "goals": {
      "for": {
        "home": 8,
        "away": 5,
        "total": 13,
        "averageTotal": 1.08
      },
      "against": {
        "home": 10,
        "away": 11,
        "total": 21,
        "averageTotal": 1.75
      }
    },
    "biggest": {
      "winHome": "4-0",
      "loseAway": "1-3",
      "streakWins": 3,
      "streakDraws": 0,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "3-5-2",
        "played": 12
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 0,
        "31-45": 0,
        "46-60": 2,
        "61-75": 5,
        "76-90": 5
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:wolves": {
    "competitionSlug": "premier-league",
    "teamId": "wolves",
    "teamSlug": "wolverhampton",
    "teamName": "Wolverhampton",
    "form": "DDLWD",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 2,
        "away": 1,
        "total": 3
      },
      "draws": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "loses": {
        "home": 2,
        "away": 3,
        "total": 5
      }
    },
    "goals": {
      "for": {
        "home": 7,
        "away": 5,
        "total": 12,
        "averageTotal": 1
      },
      "against": {
        "home": 8,
        "away": 11,
        "total": 19,
        "averageTotal": 1.58
      }
    },
    "biggest": {
      "winHome": "2-1",
      "loseAway": "1-2",
      "streakWins": 2,
      "streakDraws": 3,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "failedToScore": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "lineups": [
      {
        "formation": "4-4-2",
        "played": 10
      },
      {
        "formation": "3-5-2",
        "played": 2
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 0,
        "31-45": 4,
        "46-60": 4,
        "61-75": 1,
        "76-90": 4
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:crystalpalace": {
    "competitionSlug": "premier-league",
    "teamId": "crystalpalace",
    "teamSlug": "crystal-palace",
    "teamName": "Crystal Palace",
    "form": "LWDLL",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 2,
        "away": 1,
        "total": 3
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 3,
        "away": 3,
        "total": 6
      }
    },
    "goals": {
      "for": {
        "home": 7,
        "away": 5,
        "total": 12,
        "averageTotal": 1
      },
      "against": {
        "home": 10,
        "away": 11,
        "total": 21,
        "averageTotal": 1.75
      }
    },
    "biggest": {
      "winHome": "2-1",
      "loseAway": "0-2",
      "streakWins": 5,
      "streakDraws": 2,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "failedToScore": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "lineups": [
      {
        "formation": "3-4-3",
        "played": 10
      },
      {
        "formation": "4-4-2",
        "played": 2
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 4,
        "31-45": 1,
        "46-60": 4,
        "61-75": 0,
        "76-90": 2
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:brentford": {
    "competitionSlug": "premier-league",
    "teamId": "brentford",
    "teamSlug": "brentford",
    "teamName": "Brentford",
    "form": "LDLWL",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 2,
        "away": 1,
        "total": 3
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 3,
        "away": 3,
        "total": 6
      }
    },
    "goals": {
      "for": {
        "home": 6,
        "away": 5,
        "total": 11,
        "averageTotal": 0.92
      },
      "against": {
        "home": 10,
        "away": 10,
        "total": 20,
        "averageTotal": 1.67
      }
    },
    "biggest": {
      "winHome": "4-1",
      "loseAway": "1-4",
      "streakWins": 3,
      "streakDraws": 3,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "4-3-3",
        "played": 11
      },
      {
        "formation": "4-2-3-1",
        "played": 1
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 1,
        "16-30": 0,
        "31-45": 2,
        "46-60": 2,
        "61-75": 0,
        "76-90": 3
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:everton": {
    "competitionSlug": "premier-league",
    "teamId": "everton",
    "teamSlug": "everton",
    "teamName": "Everton",
    "form": "LLWDL",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 2,
        "away": 1,
        "total": 3
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 3,
        "away": 4,
        "total": 7
      }
    },
    "goals": {
      "for": {
        "home": 6,
        "away": 4,
        "total": 10,
        "averageTotal": 0.83
      },
      "against": {
        "home": 11,
        "away": 12,
        "total": 23,
        "averageTotal": 1.92
      }
    },
    "biggest": {
      "winHome": "2-0",
      "loseAway": "0-2",
      "streakWins": 5,
      "streakDraws": 2,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "lineups": [
      {
        "formation": "3-4-3",
        "played": 9
      },
      {
        "formation": "3-5-2",
        "played": 3
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 0,
        "31-45": 0,
        "46-60": 0,
        "61-75": 0,
        "76-90": 4
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:leicester": {
    "competitionSlug": "premier-league",
    "teamId": "leicester",
    "teamSlug": "leicester",
    "teamName": "Leicester City",
    "form": "LDLLW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 4,
        "away": 3,
        "total": 7
      }
    },
    "goals": {
      "for": {
        "home": 7,
        "away": 5,
        "total": 12,
        "averageTotal": 1
      },
      "against": {
        "home": 13,
        "away": 13,
        "total": 26,
        "averageTotal": 2.17
      }
    },
    "biggest": {
      "winHome": "3-1",
      "loseAway": "0-2",
      "streakWins": 1,
      "streakDraws": 0,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "5-3-2",
        "played": 8
      },
      {
        "formation": "4-3-3",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 4,
        "31-45": 5,
        "46-60": 3,
        "61-75": 0,
        "76-90": 2
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:ipswich": {
    "competitionSlug": "premier-league",
    "teamId": "ipswich",
    "teamSlug": "ipswich",
    "teamName": "Ipswich Town",
    "form": "LLDLL",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 1,
        "away": 0,
        "total": 1
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 4,
        "away": 4,
        "total": 8
      }
    },
    "goals": {
      "for": {
        "home": 5,
        "away": 4,
        "total": 9,
        "averageTotal": 0.75
      },
      "against": {
        "home": 12,
        "away": 16,
        "total": 28,
        "averageTotal": 2.33
      }
    },
    "biggest": {
      "winHome": "5-0",
      "loseAway": "0-2",
      "streakWins": 5,
      "streakDraws": 2,
      "streakLoses": 3
    },
    "cleanSheet": {
      "home": 2,
      "away": 2,
      "total": 4
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "5-3-2",
        "played": 9
      },
      {
        "formation": "3-5-2",
        "played": 3
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 4,
        "31-45": 2,
        "46-60": 4,
        "61-75": 2,
        "76-90": 2
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "premier-league:southampton": {
    "competitionSlug": "premier-league",
    "teamId": "southampton",
    "teamSlug": "southampton",
    "teamName": "Southampton",
    "form": "LLLDL",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 1,
        "away": 0,
        "total": 1
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 4,
        "away": 5,
        "total": 9
      }
    },
    "goals": {
      "for": {
        "home": 4,
        "away": 4,
        "total": 8,
        "averageTotal": 0.67
      },
      "against": {
        "home": 15,
        "away": 15,
        "total": 30,
        "averageTotal": 2.5
      }
    },
    "biggest": {
      "winHome": "4-1",
      "loseAway": "1-3",
      "streakWins": 1,
      "streakDraws": 0,
      "streakLoses": 3
    },
    "cleanSheet": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "3-4-3",
        "played": 6
      },
      {
        "formation": "5-3-2",
        "played": 6
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 1,
        "31-45": 1,
        "46-60": 4,
        "61-75": 3,
        "76-90": 0
      },
      "red": {
        "total": 2
      }
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  "champions-league:mancity": {
    "competitionSlug": "champions-league",
    "teamId": "mancity",
    "teamSlug": "manchester-city",
    "teamName": "Man City",
    "form": "WWWW",
    "fixtures": {
      "played": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "wins": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "draws": {
        "home": 0,
        "away": 0,
        "total": 0
      },
      "loses": {
        "home": 0,
        "away": 0,
        "total": 0
      }
    },
    "goals": {
      "for": {
        "home": 7,
        "away": 5,
        "total": 12,
        "averageTotal": 3
      },
      "against": {
        "home": 1,
        "away": 2,
        "total": 3,
        "averageTotal": 0.75
      }
    },
    "biggest": {
      "winHome": "5-1",
      "loseAway": "1-2",
      "streakWins": 4,
      "streakDraws": 3,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "3-4-3",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 0,
        "31-45": 3,
        "46-60": 3,
        "61-75": 1,
        "76-90": 4
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-23T22:00:00Z"
  },
  "champions-league:realmadrid": {
    "competitionSlug": "champions-league",
    "teamId": "realmadrid",
    "teamSlug": "real-madrid",
    "teamName": "Real Madrid",
    "form": "WDWW",
    "fixtures": {
      "played": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "wins": {
        "home": 2,
        "away": 1,
        "total": 3
      },
      "draws": {
        "home": 0,
        "away": 1,
        "total": 1
      },
      "loses": {
        "home": 0,
        "away": 0,
        "total": 0
      }
    },
    "goals": {
      "for": {
        "home": 5,
        "away": 4,
        "total": 9,
        "averageTotal": 2.25
      },
      "against": {
        "home": 2,
        "away": 2,
        "total": 4,
        "averageTotal": 1
      }
    },
    "biggest": {
      "winHome": "5-0",
      "loseAway": "1-4",
      "streakWins": 2,
      "streakDraws": 0,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "4-2-3-1",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 0,
        "31-45": 1,
        "46-60": 2,
        "61-75": 0,
        "76-90": 6
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-23T22:00:00Z"
  },
  "champions-league:arsenal": {
    "competitionSlug": "champions-league",
    "teamId": "arsenal",
    "teamSlug": "arsenal",
    "teamName": "Arsenal",
    "form": "WWLW",
    "fixtures": {
      "played": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "wins": {
        "home": 2,
        "away": 1,
        "total": 3
      },
      "draws": {
        "home": 0,
        "away": 0,
        "total": 0
      },
      "loses": {
        "home": 0,
        "away": 1,
        "total": 1
      }
    },
    "goals": {
      "for": {
        "home": 5,
        "away": 3,
        "total": 8,
        "averageTotal": 2
      },
      "against": {
        "home": 2,
        "away": 3,
        "total": 5,
        "averageTotal": 1.25
      }
    },
    "biggest": {
      "winHome": "3-1",
      "loseAway": "0-3",
      "streakWins": 4,
      "streakDraws": 3,
      "streakLoses": 0
    },
    "cleanSheet": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "3-4-3",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 0,
        "31-45": 1,
        "46-60": 2,
        "61-75": 3,
        "76-90": 4
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-23T22:00:00Z"
  },
  "champions-league:barca": {
    "competitionSlug": "champions-league",
    "teamId": "barca",
    "teamSlug": "barcelona",
    "teamName": "Barcelona",
    "form": "WLWW",
    "fixtures": {
      "played": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "wins": {
        "home": 2,
        "away": 1,
        "total": 3
      },
      "draws": {
        "home": 0,
        "away": 0,
        "total": 0
      },
      "loses": {
        "home": 0,
        "away": 1,
        "total": 1
      }
    },
    "goals": {
      "for": {
        "home": 4,
        "away": 3,
        "total": 7,
        "averageTotal": 1.75
      },
      "against": {
        "home": 2,
        "away": 2,
        "total": 4,
        "averageTotal": 1
      }
    },
    "biggest": {
      "winHome": "3-0",
      "loseAway": "0-4",
      "streakWins": 3,
      "streakDraws": 2,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "4-3-3",
        "played": 2
      },
      {
        "formation": "3-5-2",
        "played": 2
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 1,
        "16-30": 1,
        "31-45": 3,
        "46-60": 0,
        "61-75": 2,
        "76-90": 1
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-23T22:00:00Z"
  },
  "champions-league:bayernmunich": {
    "competitionSlug": "champions-league",
    "teamId": "bayernmunich",
    "teamSlug": "bayern-munich",
    "teamName": "Bayern",
    "form": "DWWD",
    "fixtures": {
      "played": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "wins": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 0,
        "away": 0,
        "total": 0
      }
    },
    "goals": {
      "for": {
        "home": 4,
        "away": 3,
        "total": 7,
        "averageTotal": 1.75
      },
      "against": {
        "home": 2,
        "away": 2,
        "total": 4,
        "averageTotal": 1
      }
    },
    "biggest": {
      "winHome": "2-0",
      "loseAway": "0-2",
      "streakWins": 4,
      "streakDraws": 3,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "4-3-3",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 1,
        "16-30": 1,
        "31-45": 5,
        "46-60": 4,
        "61-75": 1,
        "76-90": 4
      },
      "red": {
        "total": 2
      }
    },
    "updatedAt": "2026-11-23T22:00:00Z"
  },
  "champions-league:liverpool": {
    "competitionSlug": "champions-league",
    "teamId": "liverpool",
    "teamSlug": "liverpool",
    "teamName": "Liverpool",
    "form": "WDWL",
    "fixtures": {
      "played": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "wins": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "draws": {
        "home": 0,
        "away": 1,
        "total": 1
      },
      "loses": {
        "home": 1,
        "away": 0,
        "total": 1
      }
    },
    "goals": {
      "for": {
        "home": 4,
        "away": 2,
        "total": 6,
        "averageTotal": 1.5
      },
      "against": {
        "home": 2,
        "away": 3,
        "total": 5,
        "averageTotal": 1.25
      }
    },
    "biggest": {
      "winHome": "4-1",
      "loseAway": "0-3",
      "streakWins": 2,
      "streakDraws": 0,
      "streakLoses": 0
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "5-3-2",
        "played": 3
      },
      {
        "formation": "4-3-3",
        "played": 1
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 3,
        "31-45": 0,
        "46-60": 2,
        "61-75": 0,
        "76-90": 5
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-23T22:00:00Z"
  },
  "champions-league:chelsea": {
    "competitionSlug": "champions-league",
    "teamId": "chelsea",
    "teamSlug": "chelsea",
    "teamName": "Chelsea",
    "form": "WLDW",
    "fixtures": {
      "played": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "wins": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "draws": {
        "home": 0,
        "away": 1,
        "total": 1
      },
      "loses": {
        "home": 1,
        "away": 0,
        "total": 1
      }
    },
    "goals": {
      "for": {
        "home": 3,
        "away": 2,
        "total": 5,
        "averageTotal": 1.25
      },
      "against": {
        "home": 2,
        "away": 2,
        "total": 4,
        "averageTotal": 1
      }
    },
    "biggest": {
      "winHome": "4-0",
      "loseAway": "0-2",
      "streakWins": 6,
      "streakDraws": 2,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "3-5-2",
        "played": 2
      },
      {
        "formation": "4-4-2",
        "played": 2
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 2,
        "31-45": 4,
        "46-60": 2,
        "61-75": 5,
        "76-90": 2
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-23T22:00:00Z"
  },
  "champions-league:dortmund": {
    "competitionSlug": "champions-league",
    "teamId": "dortmund",
    "teamSlug": "borussia-dortmund",
    "teamName": "Dortmund",
    "form": "WLWL",
    "fixtures": {
      "played": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "wins": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "draws": {
        "home": 0,
        "away": 0,
        "total": 0
      },
      "loses": {
        "home": 1,
        "away": 1,
        "total": 2
      }
    },
    "goals": {
      "for": {
        "home": 4,
        "away": 2,
        "total": 6,
        "averageTotal": 1.5
      },
      "against": {
        "home": 3,
        "away": 4,
        "total": 7,
        "averageTotal": 1.75
      }
    },
    "biggest": {
      "winHome": "5-0",
      "loseAway": "1-2",
      "streakWins": 6,
      "streakDraws": 0,
      "streakLoses": 0
    },
    "cleanSheet": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "5-3-2",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 1,
        "16-30": 1,
        "31-45": 2,
        "46-60": 0,
        "61-75": 4,
        "76-90": 2
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-23T22:00:00Z"
  },
  "champions-league:inter": {
    "competitionSlug": "champions-league",
    "teamId": "inter",
    "teamSlug": "inter-milan",
    "teamName": "Inter Milan",
    "form": "DWLD",
    "fixtures": {
      "played": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "wins": {
        "home": 1,
        "away": 0,
        "total": 1
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 0,
        "away": 1,
        "total": 1
      }
    },
    "goals": {
      "for": {
        "home": 3,
        "away": 2,
        "total": 5,
        "averageTotal": 1.25
      },
      "against": {
        "home": 3,
        "away": 3,
        "total": 6,
        "averageTotal": 1.5
      }
    },
    "biggest": {
      "winHome": "4-1",
      "loseAway": "0-3",
      "streakWins": 5,
      "streakDraws": 2,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "3-5-2",
        "played": 2
      },
      {
        "formation": "4-3-3",
        "played": 2
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 1,
        "31-45": 5,
        "46-60": 2,
        "61-75": 5,
        "76-90": 3
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-23T22:00:00Z"
  },
  "champions-league:psg": {
    "competitionSlug": "champions-league",
    "teamId": "psg",
    "teamSlug": "paris-saint-germain",
    "teamName": "PSG",
    "form": "LWDL",
    "fixtures": {
      "played": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "wins": {
        "home": 1,
        "away": 0,
        "total": 1
      },
      "draws": {
        "home": 0,
        "away": 1,
        "total": 1
      },
      "loses": {
        "home": 1,
        "away": 1,
        "total": 2
      }
    },
    "goals": {
      "for": {
        "home": 3,
        "away": 2,
        "total": 5,
        "averageTotal": 1.25
      },
      "against": {
        "home": 3,
        "away": 4,
        "total": 7,
        "averageTotal": 1.75
      }
    },
    "biggest": {
      "winHome": "4-0",
      "loseAway": "1-4",
      "streakWins": 3,
      "streakDraws": 1,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "5-3-2",
        "played": 3
      },
      {
        "formation": "4-4-2",
        "played": 1
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 1,
        "31-45": 2,
        "46-60": 3,
        "61-75": 1,
        "76-90": 3
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-23T22:00:00Z"
  },
  "champions-league:atletico": {
    "competitionSlug": "champions-league",
    "teamId": "atletico",
    "teamSlug": "atletico-madrid",
    "teamName": "Atlético",
    "form": "LDWL",
    "fixtures": {
      "played": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "wins": {
        "home": 1,
        "away": 0,
        "total": 1
      },
      "draws": {
        "home": 0,
        "away": 1,
        "total": 1
      },
      "loses": {
        "home": 1,
        "away": 1,
        "total": 2
      }
    },
    "goals": {
      "for": {
        "home": 2,
        "away": 2,
        "total": 4,
        "averageTotal": 1
      },
      "against": {
        "home": 3,
        "away": 3,
        "total": 6,
        "averageTotal": 1.5
      }
    },
    "biggest": {
      "winHome": "5-0",
      "loseAway": "1-2",
      "streakWins": 2,
      "streakDraws": 0,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "5-3-2",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 3,
        "31-45": 0,
        "46-60": 2,
        "61-75": 2,
        "76-90": 0
      },
      "red": {
        "total": 2
      }
    },
    "updatedAt": "2026-11-23T22:00:00Z"
  },
  "champions-league:juventus": {
    "competitionSlug": "champions-league",
    "teamId": "juventus",
    "teamSlug": "juventus",
    "teamName": "Juventus",
    "form": "LWLL",
    "fixtures": {
      "played": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "wins": {
        "home": 1,
        "away": 0,
        "total": 1
      },
      "draws": {
        "home": 0,
        "away": 0,
        "total": 0
      },
      "loses": {
        "home": 1,
        "away": 2,
        "total": 3
      }
    },
    "goals": {
      "for": {
        "home": 2,
        "away": 1,
        "total": 3,
        "averageTotal": 0.75
      },
      "against": {
        "home": 3,
        "away": 4,
        "total": 7,
        "averageTotal": 1.75
      }
    },
    "biggest": {
      "winHome": "3-0",
      "loseAway": "1-3",
      "streakWins": 4,
      "streakDraws": 2,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "4-3-3",
        "played": 3
      },
      {
        "formation": "4-2-3-1",
        "played": 1
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 0,
        "31-45": 2,
        "46-60": 4,
        "61-75": 0,
        "76-90": 1
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-23T22:00:00Z"
  },
  "la-liga:realmadrid": {
    "competitionSlug": "la-liga",
    "teamId": "realmadrid",
    "teamSlug": "real-madrid",
    "teamName": "Real Madrid",
    "form": "WWDWW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 6,
        "away": 4,
        "total": 10
      },
      "draws": {
        "home": 0,
        "away": 2,
        "total": 2
      },
      "loses": {
        "home": 0,
        "away": 0,
        "total": 0
      }
    },
    "goals": {
      "for": {
        "home": 20,
        "away": 14,
        "total": 34,
        "averageTotal": 2.83
      },
      "against": {
        "home": 5,
        "away": 5,
        "total": 10,
        "averageTotal": 0.83
      }
    },
    "biggest": {
      "winHome": "4-0",
      "loseAway": "1-2",
      "streakWins": 6,
      "streakDraws": 1,
      "streakLoses": 3
    },
    "cleanSheet": {
      "home": 2,
      "away": 2,
      "total": 4
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "4-2-3-1",
        "played": 8
      },
      {
        "formation": "3-4-3",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 1,
        "31-45": 4,
        "46-60": 4,
        "61-75": 5,
        "76-90": 2
      },
      "red": {
        "total": 2
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  "la-liga:barca": {
    "competitionSlug": "la-liga",
    "teamId": "barca",
    "teamSlug": "barcelona",
    "teamName": "FC Barcelona",
    "form": "WDWWL",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 5,
        "away": 4,
        "total": 9
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 0,
        "away": 1,
        "total": 1
      }
    },
    "goals": {
      "for": {
        "home": 19,
        "away": 12,
        "total": 31,
        "averageTotal": 2.58
      },
      "against": {
        "home": 6,
        "away": 6,
        "total": 12,
        "averageTotal": 1
      }
    },
    "biggest": {
      "winHome": "5-0",
      "loseAway": "1-2",
      "streakWins": 4,
      "streakDraws": 3,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "3-4-3",
        "played": 12
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 0,
        "31-45": 0,
        "46-60": 0,
        "61-75": 2,
        "76-90": 4
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  "la-liga:atletico": {
    "competitionSlug": "la-liga",
    "teamId": "atletico",
    "teamSlug": "atletico-madrid",
    "teamName": "Atlético Madrid",
    "form": "WWDWD",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 5,
        "away": 3,
        "total": 8
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 0,
        "away": 1,
        "total": 1
      }
    },
    "goals": {
      "for": {
        "home": 12,
        "away": 10,
        "total": 22,
        "averageTotal": 1.83
      },
      "against": {
        "home": 5,
        "away": 6,
        "total": 11,
        "averageTotal": 0.92
      }
    },
    "biggest": {
      "winHome": "2-1",
      "loseAway": "1-4",
      "streakWins": 1,
      "streakDraws": 2,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "3-5-2",
        "played": 7
      },
      {
        "formation": "4-3-3",
        "played": 5
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 0,
        "31-45": 5,
        "46-60": 2,
        "61-75": 2,
        "76-90": 0
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  "la-liga:bilbao": {
    "competitionSlug": "la-liga",
    "teamId": "bilbao",
    "teamSlug": "athletic-bilbao",
    "teamName": "Athletic Club",
    "form": "DLWDW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 3,
        "away": 2,
        "total": 5
      },
      "draws": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "loses": {
        "home": 1,
        "away": 2,
        "total": 3
      }
    },
    "goals": {
      "for": {
        "home": 10,
        "away": 7,
        "total": 17,
        "averageTotal": 1.42
      },
      "against": {
        "home": 7,
        "away": 9,
        "total": 16,
        "averageTotal": 1.33
      }
    },
    "biggest": {
      "winHome": "5-1",
      "loseAway": "0-4",
      "streakWins": 5,
      "streakDraws": 1,
      "streakLoses": 0
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "lineups": [
      {
        "formation": "3-5-2",
        "played": 10
      },
      {
        "formation": "4-2-3-1",
        "played": 2
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 1,
        "31-45": 2,
        "46-60": 3,
        "61-75": 5,
        "76-90": 6
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  "la-liga:villarreal": {
    "competitionSlug": "la-liga",
    "teamId": "villarreal",
    "teamSlug": "villarreal",
    "teamName": "Villarreal CF",
    "form": "LWDLW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 3,
        "away": 2,
        "total": 5
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 2,
        "away": 2,
        "total": 4
      }
    },
    "goals": {
      "for": {
        "home": 9,
        "away": 6,
        "total": 15,
        "averageTotal": 1.25
      },
      "against": {
        "home": 9,
        "away": 9,
        "total": 18,
        "averageTotal": 1.5
      }
    },
    "biggest": {
      "winHome": "2-1",
      "loseAway": "1-4",
      "streakWins": 5,
      "streakDraws": 2,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 2,
      "away": 2,
      "total": 4
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "4-4-2",
        "played": 8
      },
      {
        "formation": "4-2-3-1",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 0,
        "31-45": 3,
        "46-60": 2,
        "61-75": 4,
        "76-90": 3
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  "la-liga:girona": {
    "competitionSlug": "la-liga",
    "teamId": "girona",
    "teamSlug": "girona",
    "teamName": "Girona FC",
    "form": "WLWDL",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 3,
        "away": 2,
        "total": 5
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 2,
        "away": 3,
        "total": 5
      }
    },
    "goals": {
      "for": {
        "home": 10,
        "away": 6,
        "total": 16,
        "averageTotal": 1.33
      },
      "against": {
        "home": 8,
        "away": 11,
        "total": 19,
        "averageTotal": 1.58
      }
    },
    "biggest": {
      "winHome": "4-0",
      "loseAway": "0-4",
      "streakWins": 1,
      "streakDraws": 1,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "3-5-2",
        "played": 9
      },
      {
        "formation": "4-4-2",
        "played": 3
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 2,
        "31-45": 1,
        "46-60": 0,
        "61-75": 0,
        "76-90": 5
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  "la-liga:betis": {
    "competitionSlug": "la-liga",
    "teamId": "betis",
    "teamSlug": "real-betis",
    "teamName": "Real Betis",
    "form": "DWDLW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 3,
        "away": 1,
        "total": 4
      },
      "draws": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "loses": {
        "home": 1,
        "away": 3,
        "total": 4
      }
    },
    "goals": {
      "for": {
        "home": 9,
        "away": 5,
        "total": 14,
        "averageTotal": 1.17
      },
      "against": {
        "home": 7,
        "away": 10,
        "total": 17,
        "averageTotal": 1.42
      }
    },
    "biggest": {
      "winHome": "4-0",
      "loseAway": "1-2",
      "streakWins": 5,
      "streakDraws": 1,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "failedToScore": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "lineups": [
      {
        "formation": "4-2-3-1",
        "played": 8
      },
      {
        "formation": "4-3-3",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 2,
        "31-45": 2,
        "46-60": 4,
        "61-75": 0,
        "76-90": 6
      },
      "red": {
        "total": 2
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  "la-liga:sociedad": {
    "competitionSlug": "la-liga",
    "teamId": "sociedad",
    "teamSlug": "real-sociedad",
    "teamName": "Real Sociedad",
    "form": "LDWLD",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 3,
        "away": 2,
        "total": 5
      }
    },
    "goals": {
      "for": {
        "home": 7,
        "away": 5,
        "total": 12,
        "averageTotal": 1
      },
      "against": {
        "home": 8,
        "away": 11,
        "total": 19,
        "averageTotal": 1.58
      }
    },
    "biggest": {
      "winHome": "5-0",
      "loseAway": "0-3",
      "streakWins": 2,
      "streakDraws": 1,
      "streakLoses": 3
    },
    "cleanSheet": {
      "home": 2,
      "away": 2,
      "total": 4
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "3-5-2",
        "played": 11
      },
      {
        "formation": "3-4-3",
        "played": 1
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 4,
        "31-45": 3,
        "46-60": 2,
        "61-75": 1,
        "76-90": 3
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  "bundesliga:bayernmunich": {
    "competitionSlug": "bundesliga",
    "teamId": "bayernmunich",
    "teamSlug": "bayern-munich",
    "teamName": "Bayern München",
    "form": "WDWWW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 5,
        "total": 11
      },
      "wins": {
        "home": 5,
        "away": 3,
        "total": 8
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 0,
        "away": 1,
        "total": 1
      }
    },
    "goals": {
      "for": {
        "home": 17,
        "away": 13,
        "total": 30,
        "averageTotal": 2.73
      },
      "against": {
        "home": 4,
        "away": 6,
        "total": 10,
        "averageTotal": 0.91
      }
    },
    "biggest": {
      "winHome": "5-0",
      "loseAway": "0-2",
      "streakWins": 4,
      "streakDraws": 3,
      "streakLoses": 0
    },
    "cleanSheet": {
      "home": 2,
      "away": 2,
      "total": 4
    },
    "failedToScore": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "lineups": [
      {
        "formation": "4-3-3",
        "played": 11
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 1,
        "31-45": 0,
        "46-60": 2,
        "61-75": 1,
        "76-90": 3
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-09T22:00:00Z"
  },
  "bundesliga:dortmund": {
    "competitionSlug": "bundesliga",
    "teamId": "dortmund",
    "teamSlug": "borussia-dortmund",
    "teamName": "B. Dortmund",
    "form": "WWLWD",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 5,
        "total": 11
      },
      "wins": {
        "home": 4,
        "away": 3,
        "total": 7
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 1,
        "away": 1,
        "total": 2
      }
    },
    "goals": {
      "for": {
        "home": 14,
        "away": 10,
        "total": 24,
        "averageTotal": 2.18
      },
      "against": {
        "home": 6,
        "away": 8,
        "total": 14,
        "averageTotal": 1.27
      }
    },
    "biggest": {
      "winHome": "4-0",
      "loseAway": "0-3",
      "streakWins": 3,
      "streakDraws": 0,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "4-3-3",
        "played": 10
      },
      {
        "formation": "4-4-2",
        "played": 1
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 4,
        "31-45": 2,
        "46-60": 1,
        "61-75": 0,
        "76-90": 5
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-09T22:00:00Z"
  },
  "bundesliga:leverkusen": {
    "competitionSlug": "bundesliga",
    "teamId": "leverkusen",
    "teamSlug": "bayer-leverkusen",
    "teamName": "Bayer Leverkusen",
    "form": "DWWDW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 5,
        "total": 11
      },
      "wins": {
        "home": 3,
        "away": 3,
        "total": 6
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 2,
        "away": 0,
        "total": 2
      }
    },
    "goals": {
      "for": {
        "home": 13,
        "away": 9,
        "total": 22,
        "averageTotal": 2
      },
      "against": {
        "home": 6,
        "away": 7,
        "total": 13,
        "averageTotal": 1.18
      }
    },
    "biggest": {
      "winHome": "2-1",
      "loseAway": "1-4",
      "streakWins": 2,
      "streakDraws": 3,
      "streakLoses": 0
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "lineups": [
      {
        "formation": "4-3-3",
        "played": 7
      },
      {
        "formation": "3-4-3",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 1,
        "31-45": 3,
        "46-60": 3,
        "61-75": 3,
        "76-90": 3
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-09T22:00:00Z"
  },
  "bundesliga:frankfurt": {
    "competitionSlug": "bundesliga",
    "teamId": "frankfurt",
    "teamSlug": "eintracht-frankfurt",
    "teamName": "E. Frankfurt",
    "form": "LWDLW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 5,
        "total": 11
      },
      "wins": {
        "home": 3,
        "away": 2,
        "total": 5
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 2,
        "away": 2,
        "total": 4
      }
    },
    "goals": {
      "for": {
        "home": 10,
        "away": 7,
        "total": 17,
        "averageTotal": 1.55
      },
      "against": {
        "home": 9,
        "away": 9,
        "total": 18,
        "averageTotal": 1.64
      }
    },
    "biggest": {
      "winHome": "2-1",
      "loseAway": "0-4",
      "streakWins": 3,
      "streakDraws": 3,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "3-5-2",
        "played": 8
      },
      {
        "formation": "4-3-3",
        "played": 3
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 2,
        "31-45": 1,
        "46-60": 1,
        "61-75": 5,
        "76-90": 0
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-09T22:00:00Z"
  },
  "bundesliga:freiburg": {
    "competitionSlug": "bundesliga",
    "teamId": "freiburg",
    "teamSlug": "freiburg",
    "teamName": "SC Freiburg",
    "form": "DDLWW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 5,
        "total": 11
      },
      "wins": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 3,
        "away": 1,
        "total": 4
      }
    },
    "goals": {
      "for": {
        "home": 7,
        "away": 7,
        "total": 14,
        "averageTotal": 1.27
      },
      "against": {
        "home": 7,
        "away": 8,
        "total": 15,
        "averageTotal": 1.36
      }
    },
    "biggest": {
      "winHome": "3-1",
      "loseAway": "0-3",
      "streakWins": 3,
      "streakDraws": 1,
      "streakLoses": 3
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "lineups": [
      {
        "formation": "4-3-3",
        "played": 11
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 3,
        "31-45": 5,
        "46-60": 1,
        "61-75": 0,
        "76-90": 5
      },
      "red": {
        "total": 2
      }
    },
    "updatedAt": "2026-11-09T22:00:00Z"
  },
  "bundesliga:leipzig": {
    "competitionSlug": "bundesliga",
    "teamId": "leipzig",
    "teamSlug": "rb-leipzig",
    "teamName": "RB Leipzig",
    "form": "LWDLW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 5,
        "total": 11
      },
      "wins": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 3,
        "away": 2,
        "total": 5
      }
    },
    "goals": {
      "for": {
        "home": 9,
        "away": 6,
        "total": 15,
        "averageTotal": 1.36
      },
      "against": {
        "home": 8,
        "away": 10,
        "total": 18,
        "averageTotal": 1.64
      }
    },
    "biggest": {
      "winHome": "4-1",
      "loseAway": "1-2",
      "streakWins": 5,
      "streakDraws": 0,
      "streakLoses": 0
    },
    "cleanSheet": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "failedToScore": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "lineups": [
      {
        "formation": "4-4-2",
        "played": 8
      },
      {
        "formation": "3-4-3",
        "played": 3
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 0,
        "31-45": 1,
        "46-60": 2,
        "61-75": 3,
        "76-90": 6
      },
      "red": {
        "total": 2
      }
    },
    "updatedAt": "2026-11-09T22:00:00Z"
  },
  "bundesliga:stuttgart": {
    "competitionSlug": "bundesliga",
    "teamId": "stuttgart",
    "teamSlug": "vfb-stuttgart",
    "teamName": "VfB Stuttgart",
    "form": "LWLDW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 5,
        "total": 11
      },
      "wins": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "draws": {
        "home": 0,
        "away": 1,
        "total": 1
      },
      "loses": {
        "home": 4,
        "away": 2,
        "total": 6
      }
    },
    "goals": {
      "for": {
        "home": 7,
        "away": 6,
        "total": 13,
        "averageTotal": 1.18
      },
      "against": {
        "home": 9,
        "away": 9,
        "total": 18,
        "averageTotal": 1.64
      }
    },
    "biggest": {
      "winHome": "2-1",
      "loseAway": "0-2",
      "streakWins": 2,
      "streakDraws": 2,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 2,
      "away": 2,
      "total": 4
    },
    "failedToScore": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "lineups": [
      {
        "formation": "3-4-3",
        "played": 7
      },
      {
        "formation": "5-3-2",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 2,
        "31-45": 3,
        "46-60": 3,
        "61-75": 2,
        "76-90": 2
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-09T22:00:00Z"
  },
  "bundesliga:wolfsburg": {
    "competitionSlug": "bundesliga",
    "teamId": "wolfsburg",
    "teamSlug": "wolfsburg",
    "teamName": "VfL Wolfsburg",
    "form": "DLWDL",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 5,
        "total": 11
      },
      "wins": {
        "home": 2,
        "away": 1,
        "total": 3
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 3,
        "away": 2,
        "total": 5
      }
    },
    "goals": {
      "for": {
        "home": 5,
        "away": 5,
        "total": 10,
        "averageTotal": 0.91
      },
      "against": {
        "home": 8,
        "away": 9,
        "total": 17,
        "averageTotal": 1.55
      }
    },
    "biggest": {
      "winHome": "4-0",
      "loseAway": "1-3",
      "streakWins": 1,
      "streakDraws": 1,
      "streakLoses": 0
    },
    "cleanSheet": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "failedToScore": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "lineups": [
      {
        "formation": "4-2-3-1",
        "played": 8
      },
      {
        "formation": "3-4-3",
        "played": 3
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 4,
        "31-45": 1,
        "46-60": 4,
        "61-75": 3,
        "76-90": 1
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-09T22:00:00Z"
  },
  "serie-a:inter": {
    "competitionSlug": "serie-a",
    "teamId": "inter",
    "teamSlug": "inter-milan",
    "teamName": "Inter Milan",
    "form": "WWDWW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 5,
        "away": 4,
        "total": 9
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 0,
        "away": 1,
        "total": 1
      }
    },
    "goals": {
      "for": {
        "home": 17,
        "away": 11,
        "total": 28,
        "averageTotal": 2.33
      },
      "against": {
        "home": 4,
        "away": 5,
        "total": 9,
        "averageTotal": 0.75
      }
    },
    "biggest": {
      "winHome": "5-1",
      "loseAway": "1-4",
      "streakWins": 1,
      "streakDraws": 2,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 2,
      "away": 2,
      "total": 4
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "3-4-3",
        "played": 12
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 2,
        "31-45": 4,
        "46-60": 0,
        "61-75": 4,
        "76-90": 2
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-09T22:30:00Z"
  },
  "serie-a:napoli": {
    "competitionSlug": "serie-a",
    "teamId": "napoli",
    "teamSlug": "napoli",
    "teamName": "SSC Napoli",
    "form": "WDWWW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 5,
        "away": 3,
        "total": 8
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 0,
        "away": 2,
        "total": 2
      }
    },
    "goals": {
      "for": {
        "home": 14,
        "away": 10,
        "total": 24,
        "averageTotal": 2
      },
      "against": {
        "home": 5,
        "away": 6,
        "total": 11,
        "averageTotal": 0.92
      }
    },
    "biggest": {
      "winHome": "2-1",
      "loseAway": "0-2",
      "streakWins": 6,
      "streakDraws": 2,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "3-4-3",
        "played": 7
      },
      {
        "formation": "4-4-2",
        "played": 5
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 1,
        "16-30": 1,
        "31-45": 0,
        "46-60": 1,
        "61-75": 3,
        "76-90": 6
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-09T22:30:00Z"
  },
  "serie-a:juventus": {
    "competitionSlug": "serie-a",
    "teamId": "juventus",
    "teamSlug": "juventus",
    "teamName": "Juventus",
    "form": "WWDWD",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 4,
        "away": 3,
        "total": 7
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 1,
        "away": 1,
        "total": 2
      }
    },
    "goals": {
      "for": {
        "home": 12,
        "away": 8,
        "total": 20,
        "averageTotal": 1.67
      },
      "against": {
        "home": 4,
        "away": 6,
        "total": 10,
        "averageTotal": 0.83
      }
    },
    "biggest": {
      "winHome": "2-0",
      "loseAway": "0-2",
      "streakWins": 6,
      "streakDraws": 1,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "failedToScore": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "lineups": [
      {
        "formation": "4-3-3",
        "played": 9
      },
      {
        "formation": "4-4-2",
        "played": 3
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 0,
        "31-45": 3,
        "46-60": 0,
        "61-75": 0,
        "76-90": 4
      },
      "red": {
        "total": 2
      }
    },
    "updatedAt": "2026-11-09T22:30:00Z"
  },
  "serie-a:milan": {
    "competitionSlug": "serie-a",
    "teamId": "milan",
    "teamSlug": "ac-milan",
    "teamName": "AC Milan",
    "form": "LLWWD",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 4,
        "away": 2,
        "total": 6
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 1,
        "away": 3,
        "total": 4
      }
    },
    "goals": {
      "for": {
        "home": 11,
        "away": 7,
        "total": 18,
        "averageTotal": 1.5
      },
      "against": {
        "home": 7,
        "away": 9,
        "total": 16,
        "averageTotal": 1.33
      }
    },
    "biggest": {
      "winHome": "2-1",
      "loseAway": "0-4",
      "streakWins": 5,
      "streakDraws": 1,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "4-2-3-1",
        "played": 7
      },
      {
        "formation": "3-4-3",
        "played": 5
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 0,
        "31-45": 4,
        "46-60": 0,
        "61-75": 1,
        "76-90": 6
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-09T22:30:00Z"
  },
  "serie-a:roma": {
    "competitionSlug": "serie-a",
    "teamId": "roma",
    "teamSlug": "as-roma",
    "teamName": "AS Roma",
    "form": "DWLDW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 3,
        "away": 2,
        "total": 5
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 2,
        "away": 2,
        "total": 4
      }
    },
    "goals": {
      "for": {
        "home": 9,
        "away": 7,
        "total": 16,
        "averageTotal": 1.33
      },
      "against": {
        "home": 9,
        "away": 8,
        "total": 17,
        "averageTotal": 1.42
      }
    },
    "biggest": {
      "winHome": "2-1",
      "loseAway": "1-4",
      "streakWins": 2,
      "streakDraws": 2,
      "streakLoses": 0
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "4-4-2",
        "played": 12
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 4,
        "31-45": 2,
        "46-60": 2,
        "61-75": 4,
        "76-90": 4
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-09T22:30:00Z"
  },
  "serie-a:lazio": {
    "competitionSlug": "serie-a",
    "teamId": "lazio",
    "teamSlug": "ss-lazio",
    "teamName": "SS Lazio",
    "form": "WDLWL",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 3,
        "away": 2,
        "total": 5
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 2,
        "away": 3,
        "total": 5
      }
    },
    "goals": {
      "for": {
        "home": 10,
        "away": 7,
        "total": 17,
        "averageTotal": 1.42
      },
      "against": {
        "home": 8,
        "away": 10,
        "total": 18,
        "averageTotal": 1.5
      }
    },
    "biggest": {
      "winHome": "2-0",
      "loseAway": "1-3",
      "streakWins": 2,
      "streakDraws": 3,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "failedToScore": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "lineups": [
      {
        "formation": "4-3-3",
        "played": 7
      },
      {
        "formation": "4-2-3-1",
        "played": 5
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 1,
        "16-30": 1,
        "31-45": 3,
        "46-60": 4,
        "61-75": 4,
        "76-90": 6
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-09T22:30:00Z"
  },
  "serie-a:atalanta": {
    "competitionSlug": "serie-a",
    "teamId": "atalanta",
    "teamSlug": "atalanta",
    "teamName": "Atalanta BC",
    "form": "DWDLW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "draws": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "loses": {
        "home": 2,
        "away": 2,
        "total": 4
      }
    },
    "goals": {
      "for": {
        "home": 9,
        "away": 7,
        "total": 16,
        "averageTotal": 1.33
      },
      "against": {
        "home": 9,
        "away": 9,
        "total": 18,
        "averageTotal": 1.5
      }
    },
    "biggest": {
      "winHome": "3-0",
      "loseAway": "1-4",
      "streakWins": 2,
      "streakDraws": 0,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "5-3-2",
        "played": 12
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 4,
        "31-45": 0,
        "46-60": 2,
        "61-75": 5,
        "76-90": 4
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-09T22:30:00Z"
  },
  "serie-a:fiorentina": {
    "competitionSlug": "serie-a",
    "teamId": "fiorentina",
    "teamSlug": "fiorentina",
    "teamName": "Fiorentina",
    "form": "LWDLW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 3,
        "away": 1,
        "total": 4
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 2,
        "away": 3,
        "total": 5
      }
    },
    "goals": {
      "for": {
        "home": 8,
        "away": 6,
        "total": 14,
        "averageTotal": 1.17
      },
      "against": {
        "home": 8,
        "away": 9,
        "total": 17,
        "averageTotal": 1.42
      }
    },
    "biggest": {
      "winHome": "2-0",
      "loseAway": "1-2",
      "streakWins": 5,
      "streakDraws": 0,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "4-3-3",
        "played": 6
      },
      {
        "formation": "3-5-2",
        "played": 6
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 0,
        "31-45": 4,
        "46-60": 3,
        "61-75": 3,
        "76-90": 3
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-09T22:30:00Z"
  },
  "ligue-1:psg": {
    "competitionSlug": "ligue-1",
    "teamId": "psg",
    "teamSlug": "paris-saint-germain",
    "teamName": "PSG",
    "form": "WWWDW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 6,
        "away": 4,
        "total": 10
      },
      "draws": {
        "home": 0,
        "away": 1,
        "total": 1
      },
      "loses": {
        "home": 0,
        "away": 1,
        "total": 1
      }
    },
    "goals": {
      "for": {
        "home": 20,
        "away": 12,
        "total": 32,
        "averageTotal": 2.67
      },
      "against": {
        "home": 3,
        "away": 5,
        "total": 8,
        "averageTotal": 0.67
      }
    },
    "biggest": {
      "winHome": "2-1",
      "loseAway": "1-3",
      "streakWins": 1,
      "streakDraws": 0,
      "streakLoses": 3
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "lineups": [
      {
        "formation": "3-5-2",
        "played": 8
      },
      {
        "formation": "4-2-3-1",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 1,
        "31-45": 3,
        "46-60": 4,
        "61-75": 3,
        "76-90": 3
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  "ligue-1:marseille": {
    "competitionSlug": "ligue-1",
    "teamId": "marseille",
    "teamSlug": "marseille",
    "teamName": "O. Marseille",
    "form": "WLWDW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 4,
        "away": 3,
        "total": 7
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 1,
        "away": 2,
        "total": 3
      }
    },
    "goals": {
      "for": {
        "home": 11,
        "away": 9,
        "total": 20,
        "averageTotal": 1.67
      },
      "against": {
        "home": 6,
        "away": 8,
        "total": 14,
        "averageTotal": 1.17
      }
    },
    "biggest": {
      "winHome": "2-0",
      "loseAway": "1-2",
      "streakWins": 6,
      "streakDraws": 2,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 2,
      "away": 2,
      "total": 4
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "4-4-2",
        "played": 11
      },
      {
        "formation": "3-4-3",
        "played": 1
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 1,
        "16-30": 4,
        "31-45": 2,
        "46-60": 2,
        "61-75": 2,
        "76-90": 3
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  "ligue-1:nice": {
    "competitionSlug": "ligue-1",
    "teamId": "nice",
    "teamSlug": "nice",
    "teamName": "OGC Nice",
    "form": "DWLWW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 3,
        "away": 3,
        "total": 6
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 2,
        "away": 2,
        "total": 4
      }
    },
    "goals": {
      "for": {
        "home": 10,
        "away": 8,
        "total": 18,
        "averageTotal": 1.5
      },
      "against": {
        "home": 8,
        "away": 8,
        "total": 16,
        "averageTotal": 1.33
      }
    },
    "biggest": {
      "winHome": "4-1",
      "loseAway": "0-4",
      "streakWins": 6,
      "streakDraws": 3,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "failedToScore": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "lineups": [
      {
        "formation": "3-4-3",
        "played": 6
      },
      {
        "formation": "4-4-2",
        "played": 6
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 3,
        "16-30": 4,
        "31-45": 5,
        "46-60": 1,
        "61-75": 5,
        "76-90": 5
      },
      "red": {
        "total": 2
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  "ligue-1:lens": {
    "competitionSlug": "ligue-1",
    "teamId": "lens",
    "teamSlug": "lens",
    "teamName": "RC Lens",
    "form": "WDDLW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 3,
        "away": 2,
        "total": 5
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 2,
        "away": 2,
        "total": 4
      }
    },
    "goals": {
      "for": {
        "home": 9,
        "away": 6,
        "total": 15,
        "averageTotal": 1.25
      },
      "against": {
        "home": 6,
        "away": 9,
        "total": 15,
        "averageTotal": 1.25
      }
    },
    "biggest": {
      "winHome": "5-0",
      "loseAway": "1-4",
      "streakWins": 2,
      "streakDraws": 3,
      "streakLoses": 3
    },
    "cleanSheet": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "failedToScore": {
      "home": 1,
      "away": 0,
      "total": 1
    },
    "lineups": [
      {
        "formation": "4-4-2",
        "played": 11
      },
      {
        "formation": "4-2-3-1",
        "played": 1
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 0,
        "16-30": 3,
        "31-45": 4,
        "46-60": 2,
        "61-75": 0,
        "76-90": 0
      },
      "red": {
        "total": 2
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  "ligue-1:monaco": {
    "competitionSlug": "ligue-1",
    "teamId": "monaco",
    "teamSlug": "monaco",
    "teamName": "AS Monaco",
    "form": "LWWLD",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 3,
        "away": 2,
        "total": 5
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 2,
        "away": 3,
        "total": 5
      }
    },
    "goals": {
      "for": {
        "home": 10,
        "away": 7,
        "total": 17,
        "averageTotal": 1.42
      },
      "against": {
        "home": 8,
        "away": 10,
        "total": 18,
        "averageTotal": 1.5
      }
    },
    "biggest": {
      "winHome": "5-1",
      "loseAway": "0-2",
      "streakWins": 4,
      "streakDraws": 0,
      "streakLoses": 0
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "lineups": [
      {
        "formation": "4-4-2",
        "played": 8
      },
      {
        "formation": "3-4-3",
        "played": 4
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 3,
        "31-45": 4,
        "46-60": 2,
        "61-75": 4,
        "76-90": 5
      },
      "red": {
        "total": 1
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  "ligue-1:lyon": {
    "competitionSlug": "ligue-1",
    "teamId": "lyon",
    "teamSlug": "olympique-lyonnais",
    "teamName": "O. Lyon",
    "form": "WLDWL",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 3,
        "away": 2,
        "total": 5
      },
      "draws": {
        "home": 0,
        "away": 1,
        "total": 1
      },
      "loses": {
        "home": 3,
        "away": 3,
        "total": 6
      }
    },
    "goals": {
      "for": {
        "home": 10,
        "away": 6,
        "total": 16,
        "averageTotal": 1.33
      },
      "against": {
        "home": 10,
        "away": 10,
        "total": 20,
        "averageTotal": 1.67
      }
    },
    "biggest": {
      "winHome": "4-1",
      "loseAway": "1-4",
      "streakWins": 5,
      "streakDraws": 1,
      "streakLoses": 2
    },
    "cleanSheet": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "failedToScore": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "lineups": [
      {
        "formation": "4-2-3-1",
        "played": 10
      },
      {
        "formation": "5-3-2",
        "played": 2
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 1,
        "31-45": 0,
        "46-60": 4,
        "61-75": 3,
        "76-90": 3
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  "ligue-1:rennes": {
    "competitionSlug": "ligue-1",
    "teamId": "rennes",
    "teamSlug": "stade-rennais",
    "teamName": "Stade Rennais",
    "form": "DLWWD",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 2,
        "away": 2,
        "total": 4
      },
      "draws": {
        "home": 1,
        "away": 2,
        "total": 3
      },
      "loses": {
        "home": 3,
        "away": 2,
        "total": 5
      }
    },
    "goals": {
      "for": {
        "home": 9,
        "away": 5,
        "total": 14,
        "averageTotal": 1.17
      },
      "against": {
        "home": 8,
        "away": 9,
        "total": 17,
        "averageTotal": 1.42
      }
    },
    "biggest": {
      "winHome": "4-1",
      "loseAway": "0-2",
      "streakWins": 6,
      "streakDraws": 1,
      "streakLoses": 0
    },
    "cleanSheet": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "failedToScore": {
      "home": 1,
      "away": 1,
      "total": 2
    },
    "lineups": [
      {
        "formation": "4-2-3-1",
        "played": 6
      },
      {
        "formation": "4-4-2",
        "played": 6
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 2,
        "16-30": 0,
        "31-45": 4,
        "46-60": 0,
        "61-75": 1,
        "76-90": 4
      },
      "red": {
        "total": 0
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  "ligue-1:lille": {
    "competitionSlug": "ligue-1",
    "teamId": "lille",
    "teamSlug": "losc-lille",
    "teamName": "LOSC Lille",
    "form": "LWDLW",
    "fixtures": {
      "played": {
        "home": 6,
        "away": 6,
        "total": 12
      },
      "wins": {
        "home": 3,
        "away": 1,
        "total": 4
      },
      "draws": {
        "home": 1,
        "away": 1,
        "total": 2
      },
      "loses": {
        "home": 2,
        "away": 4,
        "total": 6
      }
    },
    "goals": {
      "for": {
        "home": 7,
        "away": 6,
        "total": 13,
        "averageTotal": 1.08
      },
      "against": {
        "home": 8,
        "away": 11,
        "total": 19,
        "averageTotal": 1.58
      }
    },
    "biggest": {
      "winHome": "5-0",
      "loseAway": "1-4",
      "streakWins": 6,
      "streakDraws": 2,
      "streakLoses": 1
    },
    "cleanSheet": {
      "home": 0,
      "away": 0,
      "total": 0
    },
    "failedToScore": {
      "home": 2,
      "away": 1,
      "total": 3
    },
    "lineups": [
      {
        "formation": "3-5-2",
        "played": 6
      },
      {
        "formation": "4-3-3",
        "played": 6
      }
    ],
    "cards": {
      "yellow": {
        "0-15": 1,
        "16-30": 2,
        "31-45": 4,
        "46-60": 4,
        "61-75": 1,
        "76-90": 4
      },
      "red": {
        "total": 2
      }
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  }
}

/** 대회 + 팀으로 시즌 통계 조회 */
export function getTeamStats(competitionSlug, teamId) {
  return TEAM_SEASON_STATS[`${competitionSlug}:${teamId}`] ?? null
}

/** 한 팀이 참가한 모든 대회의 시즌 통계 */
export function getTeamStatsAll(teamId) {
  return Object.values(TEAM_SEASON_STATS).filter(s => s.teamId === teamId)
}
