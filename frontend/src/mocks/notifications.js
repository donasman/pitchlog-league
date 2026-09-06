/**
 * Mock 알림
 * ⚠ scripts/genMockScreens.mjs 가 생성한다. 직접 수정하지 않는다.
 *
 * 종류 4가지 — kickoff · goal · fulltime · confirmed.
 * confirmed(기록 확정)가 이 서비스만의 알림이다. 경기 종료 몇 시간 뒤에 오므로
 * 골 알림과 시각적으로 구분해야 한다 (design-briefs/07-notifications.md).
 *
 * 로그인이 없어 설정은 브라우저 단위다. permission 세 상태
 * (default·granted·denied)를 화면이 모두 처리해야 한다.
 */

export const NOTIFICATIONS = [
  {
    "id": "n01",
    "type": "confirmed",
    "read": false,
    "at": "2026-11-23T14:36:00.000Z",
    "matchId": "m004",
    "competitionSlug": "premier-league",
    "title": "기록이 확정됐습니다",
    "body": "Chelsea 1-1 Newcastle United",
    "detail": "어시스트 1건이 정정됐습니다"
  },
  {
    "id": "n02",
    "type": "goal",
    "read": false,
    "at": "2026-11-23T14:33:00.000Z",
    "matchId": "m010",
    "competitionSlug": "champions-league",
    "title": "골!",
    "body": "바이에른 뮌헨 3 - 2 파리 생제르맹",
    "detail": "78' 사네"
  },
  {
    "id": "n03",
    "type": "goal",
    "read": false,
    "at": "2026-11-23T14:28:00.000Z",
    "matchId": "m001",
    "competitionSlug": "premier-league",
    "title": "골!",
    "body": "맨체스터 시티 2 - 1 아스날",
    "detail": "62' 홀란"
  },
  {
    "id": "n04",
    "type": "kickoff",
    "read": true,
    "at": "2026-11-23T14:04:00.000Z",
    "matchId": "m023",
    "competitionSlug": "ligue-1",
    "title": "경기가 시작됐습니다",
    "body": "올랭피크 리옹 vs AS 모나코",
    "detail": "리그 1"
  },
  {
    "id": "n05",
    "type": "fulltime",
    "read": true,
    "at": "2026-11-23T13:07:00.000Z",
    "matchId": "m003",
    "competitionSlug": "premier-league",
    "title": "경기 종료",
    "body": "Arsenal 3-2 Tottenham Hotspur",
    "detail": "공식 기록 확정까지 시간이 걸립니다"
  },
  {
    "id": "n06",
    "type": "kickoff",
    "read": true,
    "at": "2026-11-23T12:02:00.000Z",
    "matchId": "m009",
    "competitionSlug": "la-liga",
    "title": "경기가 시작됐습니다",
    "body": "레알 마드리드 vs FC 바르셀로나",
    "detail": "라리가"
  }
]

export const NOTIFICATION_SETTINGS = {
  "permission": "default",
  "pushEnabled": false,
  "teams": [
    "mancity",
    "spurs"
  ],
  "competitions": [
    "premier-league",
    "champions-league"
  ],
  "events": {
    "kickoff": true,
    "goal": true,
    "fulltime": true,
    "confirmed": true
  },
  "deviceNote": "이 브라우저에서만 적용됩니다"
}

export function getUnreadCount() { return NOTIFICATIONS.filter(n => !n.read).length }
