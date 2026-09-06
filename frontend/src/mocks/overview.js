/**
 * Mock 홈 화면 데이터
 * ⚠ scripts/genMockScreens.mjs 가 생성한다. 직접 수정하지 않는다.
 *
 * 홈은 제품 앞장이다 — 경기 탭의 요약이 아니다 (docs/IA_HOME_RESTRUCTURE.md).
 * 라이브 펄스는 경기 카드가 아니라 얇은 스코어 줄이다 (design-briefs/03-home.md).
 */

export const COMPETITION_OVERVIEW = [
  {
    "slug": "premier-league",
    "id": "epl",
    "name": "Premier League",
    "shortName": "EPL",
    "stage": {
      "label": "Matchweek 13",
      "status": "ongoing"
    },
    "liveCount": 1,
    "upcomingCount": 3,
    "nextKickoff": "2026-11-23T12:00:00Z",
    "leader": {
      "teamId": "mancity",
      "teamSlug": "manchester-city",
      "teamName": "Manchester City",
      "teamInitials": "MC",
      "teamColor": "#6CABDD",
      "points": 29
    },
    "topScorer": {
      "playerSlug": "erling-haaland",
      "playerName": "E. Haaland",
      "value": 14
    },
    "updatedAt": "2026-11-10T23:15:00Z"
  },
  {
    "slug": "la-liga",
    "id": "laliga",
    "name": "La Liga",
    "shortName": "LaLiga",
    "stage": {
      "label": "Jornada 13",
      "status": "ongoing"
    },
    "liveCount": 1,
    "upcomingCount": 2,
    "nextKickoff": "2026-11-23T16:00:00Z",
    "leader": {
      "teamId": "realmadrid",
      "teamSlug": "real-madrid",
      "teamName": "Real Madrid",
      "teamInitials": "RMA",
      "teamColor": "#FEBE10",
      "points": 32
    },
    "topScorer": {
      "playerSlug": "robert-lewandowski",
      "playerName": "R. Lewandowski",
      "value": 11
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  {
    "slug": "bundesliga",
    "id": "bundesliga",
    "name": "Bundesliga",
    "shortName": "BL",
    "stage": {
      "label": "Spieltag 11",
      "status": "completed"
    },
    "liveCount": 1,
    "upcomingCount": 2,
    "nextKickoff": "2026-11-24T17:30:00Z",
    "leader": {
      "teamId": "bayernmunich",
      "teamSlug": "bayern-munich",
      "teamName": "Bayern München",
      "teamInitials": "BAY",
      "teamColor": "#DC052D",
      "points": 26
    },
    "topScorer": {
      "playerSlug": "harry-kane",
      "playerName": "H. Kane",
      "value": 11
    },
    "updatedAt": "2026-11-09T22:00:00Z"
  },
  {
    "slug": "serie-a",
    "id": "seriea",
    "name": "Serie A",
    "shortName": "SA",
    "stage": {
      "label": "Giornata 12",
      "status": "completed"
    },
    "liveCount": 1,
    "upcomingCount": 2,
    "nextKickoff": "2026-11-23T14:00:00Z",
    "leader": {
      "teamId": "inter",
      "teamSlug": "inter-milan",
      "teamName": "Inter Milan",
      "teamInitials": "INT",
      "teamColor": "#0068A8",
      "points": 29
    },
    "topScorer": {
      "playerSlug": "victor-osimhen",
      "playerName": "V. Osimhen",
      "value": 10
    },
    "updatedAt": "2026-11-09T22:30:00Z"
  },
  {
    "slug": "ligue-1",
    "id": "ligue1",
    "name": "Ligue 1",
    "shortName": "L1",
    "stage": {
      "label": "Journée 12",
      "status": "completed"
    },
    "liveCount": 1,
    "upcomingCount": 2,
    "nextKickoff": "2026-11-24T17:00:00Z",
    "leader": {
      "teamId": "psg",
      "teamSlug": "paris-saint-germain",
      "teamName": "PSG",
      "teamInitials": "PSG",
      "teamColor": "#004170",
      "points": 31
    },
    "topScorer": {
      "playerSlug": "ousmane-dembele",
      "playerName": "O. Dembélé",
      "value": 8
    },
    "updatedAt": "2026-11-09T23:00:00Z"
  },
  {
    "slug": "champions-league",
    "id": "ucl",
    "name": "UEFA Champions League",
    "shortName": "UCL",
    "stage": {
      "label": "League Phase — Matchday 4",
      "status": "completed"
    },
    "liveCount": 1,
    "upcomingCount": 1,
    "nextKickoff": "2026-11-24T20:00:00Z",
    "leader": {
      "teamId": "mancity",
      "teamSlug": "manchester-city",
      "teamName": "Man City",
      "teamInitials": "MC",
      "teamColor": "#6CABDD",
      "points": 12
    },
    "topScorer": {
      "playerSlug": "erling-haaland",
      "playerName": "E. Haaland",
      "value": 5
    },
    "updatedAt": "2026-11-23T22:00:00Z"
  }
]

export const LIVE_PULSE = [
  {
    "matchId": "m001",
    "competitionSlug": "premier-league",
    "home": {
      "name": "Manchester City",
      "initials": "MC",
      "color": "#6CABDD",
      "score": 2
    },
    "away": {
      "name": "Arsenal",
      "initials": "ARS",
      "color": "#EF0107",
      "score": 1
    },
    "minute": 67,
    "displayState": "live"
  },
  {
    "matchId": "m009",
    "competitionSlug": "la-liga",
    "home": {
      "name": "Real Madrid",
      "initials": "RMA",
      "color": "#FEBE10",
      "score": 1
    },
    "away": {
      "name": "FC Barcelona",
      "initials": "FCB",
      "color": "#004D98",
      "score": 1
    },
    "minute": 41,
    "displayState": "live"
  },
  {
    "matchId": "m011",
    "competitionSlug": "bundesliga",
    "home": {
      "name": "Borussia Dortmund",
      "initials": "BVB",
      "color": "#FDE100",
      "score": 1
    },
    "away": {
      "name": "Bayer Leverkusen",
      "initials": "LEV",
      "color": "#E32221",
      "score": 0
    },
    "minute": 54,
    "displayState": "live"
  },
  {
    "matchId": "m021",
    "competitionSlug": "serie-a",
    "home": {
      "name": "SSC Napoli",
      "initials": "NAP",
      "color": "#12A0D7",
      "score": 1
    },
    "away": {
      "name": "AS Roma",
      "initials": "ROM",
      "color": "#8B0000",
      "score": 0
    },
    "minute": 73,
    "displayState": "live"
  },
  {
    "matchId": "m023",
    "competitionSlug": "ligue-1",
    "home": {
      "name": "Olympique Lyonnais",
      "initials": "OL",
      "color": "#CC0033",
      "score": 0
    },
    "away": {
      "name": "AS Monaco",
      "initials": "MON",
      "color": "#CF3731",
      "score": 0
    },
    "minute": 38,
    "displayState": "live"
  },
  {
    "matchId": "m010",
    "competitionSlug": "champions-league",
    "home": {
      "name": "FC Bayern München",
      "initials": "BAY",
      "color": "#DC052D",
      "score": 3
    },
    "away": {
      "name": "Paris Saint-Germain",
      "initials": "PSG",
      "color": "#004170",
      "score": 2
    },
    "minute": 78,
    "displayState": "live"
  }
]

/** 진행 중 경기가 0건일 때 히어로 오른쪽을 채운다 — 비어 보이면 안 된다 */
export const NEXT_KICKOFF = {
  "matchId": "m007",
  "competitionSlug": "premier-league",
  "homeName": "Everton",
  "awayName": "Brighton",
  "date": "2026-11-23T12:00:00Z"
}

export const DATA_AS_OF = '2026-11-23T14:42:00Z'
