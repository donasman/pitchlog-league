/**
 * "화면에 나오는 대회" 의 단일 정의.
 *
 * 리그 5개 + UCL (displayOrder 10~60). 컵·슈퍼컵(110~)은 아직 화면이 없다.
 * 프론트 `services/normalize.js` 의 `VISIBLE_COMPETITION_API_IDS` 와 같은 범위여야 한다 —
 * 한쪽만 바뀌면 로고가 비거나 스쿼드가 안 들어온다.
 *
 * 수집 계층이 여기 묶이는 이유: 컵 하부 라운드까지 팀이 1,888개인데
 * 화면에 나오지 않는 팀의 스쿼드·로고를 매주 받을 이유가 없다.
 */
export const SCREEN_DISPLAY_ORDER_MAX = 100;

/** Prisma where 조각 — 화면에 나오는 추적 대회 */
export const screenCompetitionWhere = {
  isTracked: true,
  displayOrder: { lte: SCREEN_DISPLAY_ORDER_MAX },
} as const;
