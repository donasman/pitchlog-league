/**
 * Mock AI 어시스턴트 샘플 대화
 * ⚠ scripts/genMockScreens.mjs 가 생성한다. 직접 수정하지 않는다.
 *
 * 원칙 (V2_DESIGN 5-8 · design-briefs/08-assistant.md):
 *   AI는 숫자를 만들지 않는다. 답변에는 근거 카드·데이터 기준 시각·신뢰도 표기가
 *   반드시 붙고, 숫자는 문장이 아니라 데이터 카드로 렌더링한다.
 *
 * 샘플 4건이 각각 다른 상태를 보여준다:
 *   c1 confirmed    확정된 데이터
 *   c2 live         진행 중 — 숫자가 계속 바뀐다
 *   c3 recheck      재검증 중 ★ 이 서비스의 존재 이유를 보여주는 화면
 *   c4 unanswerable 조회 도구로 답할 수 없는 질문 — 예측하지 않는다
 */

export const SUGGESTED_QUESTIONS = [
  "손흥민 이번 시즌 기록 알려줘",
  "리버풀 다음 경기 언제야?",
  "EPL 상위 4팀 최근 5경기 비교해줘",
  "챔피언스리그 16강 올라간 팀은?"
]

export const ASSISTANT_SAMPLES = [
  {
    "id": "c1",
    "question": "EPL 순위 알려줘",
    "thinking": "순위표를 조회하는 중",
    "answer": "프리미어리그 13라운드 진행 중입니다. 상위 5팀입니다.",
    "cards": [
      {
        "type": "standings",
        "competitionSlug": "premier-league",
        "rows": [
          {
            "rank": 1,
            "teamName": "Manchester City",
            "teamInitials": "MC",
            "teamColor": "#6CABDD",
            "points": 29,
            "zone": "champions_league"
          },
          {
            "rank": 2,
            "teamName": "Arsenal",
            "teamInitials": "ARS",
            "teamColor": "#EF0107",
            "points": 27,
            "zone": "champions_league"
          },
          {
            "rank": 3,
            "teamName": "Liverpool",
            "teamInitials": "LIV",
            "teamColor": "#C8102E",
            "points": 26,
            "zone": "champions_league"
          },
          {
            "rank": 4,
            "teamName": "Chelsea",
            "teamInitials": "CHE",
            "teamColor": "#034694",
            "points": 24,
            "zone": "champions_league"
          },
          {
            "rank": 5,
            "teamName": "Newcastle United",
            "teamInitials": "NEW",
            "teamColor": "#241F20",
            "points": 22,
            "zone": "europa_league"
          }
        ]
      }
    ],
    "evidence": {
      "tool": "순위 조회",
      "args": "competition=premier-league, season=2026-27",
      "asOf": "2026-11-10T23:15:00Z",
      "source": "API-Football → PitchLog DB"
    },
    "dataStatus": "confirmed"
  },
  {
    "id": "c2",
    "question": "맨시티 아스날 경기 어때?",
    "thinking": "경기 통계를 조회하는 중",
    "answer": "현재 2-1로 맨체스터 시티가 앞서고 있습니다. 다만 기대 득점은 아스날이 더 높습니다.",
    "cards": [
      {
        "type": "match",
        "matchId": "m001",
        "homeName": "Manchester City",
        "awayName": "Arsenal",
        "homeScore": 2,
        "awayScore": 1,
        "minute": 67,
        "displayState": "live"
      },
      {
        "type": "stats",
        "rows": [
          [
            "점유율",
            "56%",
            "44%"
          ],
          [
            "슈팅",
            9,
            13
          ],
          [
            "유효 슈팅",
            4,
            3
          ],
          [
            "기대 득점 (xG)",
            0.9,
            1.04
          ]
        ]
      }
    ],
    "evidence": {
      "tool": "경기 통계 조회",
      "args": "fixture=m001",
      "asOf": "2026-11-23T14:42:00Z",
      "source": "API-Football → PitchLog DB"
    },
    "dataStatus": "live",
    "note": "진행 중인 경기입니다. 숫자는 계속 바뀝니다."
  },
  {
    "id": "c3",
    "question": "Chelsea 어제 경기 결과는?",
    "thinking": "경기 기록을 조회하는 중",
    "answer": "Chelsea 1 - 1 Newcastle United 입니다. 다만 이 경기는 공식 기록이 아직 확정되지 않았습니다.",
    "cards": [
      {
        "type": "match",
        "matchId": "m004",
        "homeName": "Chelsea",
        "awayName": "Newcastle United",
        "homeScore": 1,
        "awayScore": 1,
        "displayState": "recheck"
      }
    ],
    "evidence": {
      "tool": "경기 조회",
      "args": "fixture=m004",
      "asOf": "2026-11-23T14:42:00Z",
      "source": "API-Football → PitchLog DB"
    },
    "dataStatus": "recheck",
    "note": "재검증 중인 값이 포함돼 있습니다. 공식 기록이 확정되면 바뀔 수 있습니다."
  },
  {
    "id": "c4",
    "question": "다음 시즌 우승 누가 할 것 같아?",
    "thinking": null,
    "answer": "예측은 하지 않습니다. 이 서비스는 조회된 기록만 다루고, 없는 숫자를 만들지 않습니다.",
    "cards": [],
    "evidence": null,
    "dataStatus": "unanswerable",
    "suggestions": [
      "현재 순위 보기",
      "최근 5경기 폼 비교",
      "득점 순위 보기"
    ]
  }
]

export function getSample(id) { return ASSISTANT_SAMPLES.find(s => s.id === id) ?? null }
