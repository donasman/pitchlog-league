/**
 * 수집·노출 범위 4층 정의 — feat/scope-expansion 판 (2026-09-17).
 *
 * "무엇을 결정하는가" 표:
 *
 * | 상수                       | displayOrder | 결정 대상                              | 사용처                                        |
 * |----------------------------|--------------|----------------------------------------|----------------------------------------------|
 * | ingestScopeWhere           | 전체         | 수집 (L2·L6·백필 워커)                 | l2.service · l6.service · match-details-backfill |
 * | matchVisibleWhere          | 전체         | 경기 노출 + 로고                       | match.service · logo.service                 |
 * | competitionVisibleWhere    | <= 60        | 대회 탭·순위표·시즌 선택기             | standing.service                             |
 * |                            |              | (랭킹은 별도 — statistics.service 가        |                                              |
 * |                            |              |  competition 을 필수로 받아 19대회 전부     |                                              |
 * |                            |              |  열림 · 09-20 실측 · statistics.service.ts:14) |                                       |
 * | squadScopeWhere            | <= 60        | L1 스쿼드                              | l1.service                                   |
 *
 * ## 왜 4개인가
 * 화면 대회는 리그5+UCL 6개인데 · 수집·경기 노출은 컵 6·슈퍼컵 5·유로파·컨퍼런스 포함 19개.
 * 한 상수로는 이 둘을 표현 못 한다. 종전 `screenCompetitionWhere` 는 "화면=수집" 등식에 묶여 있었다.
 *
 * ## 한쪽만 바꾸면 무엇이 깨지는가
 * - `matchVisibleWhere` 만 넓히고 `ingestScopeWhere` 를 안 넓히면: 프론트가 요구하는 경기가 DB 에 없어 500 or 빈 응답.
 * - `ingestScopeWhere` 만 넓히고 `matchVisibleWhere` 를 안 넓히면: DB 는 채우지만 화면에 안 나옴 · 헛수집.
 * - `matchVisibleWhere` 만 넓히고 로고 서비스가 옛 상수를 쓰면: 유럽 대항전 팀 로고가 화면에 빈 자리로.
 * - `squadScopeWhere` 를 안 좁히면: 컵 하위·유럽 예선 팀 155 → 300+ 팀 스쿼드를 매주 받게 됨 (콜 폭발).
 * - `competitionVisibleWhere` 를 넓히면: 대회 탭에 유로파·컨퍼런스 대회 페이지가 뜨는데 화면이 없다.
 *
 * ## 이 판이 결정하지 않은 것
 * - 컵 대회 페이지 (별도 판) · 대진표 화면 (2027-02 UCL 녹아웃 뒤).
 * - 프론트 `VISIBLE_COMPETITION_API_IDS` 는 `normalize.js:21` 에 별도로 있다 — 위 표와 동기.
 */

/** 화면에 대회 페이지·순위표가 노출되는 경계 (리그5+UCL). L1 스쿼드도 이 범위. */
export const COMPETITION_VISIBLE_DISPLAY_ORDER_MAX = 60;

/** 수집 (L2·L6·백필 워커): 추적하는 모든 대회. isTracked 전부. */
export const ingestScopeWhere = {
  isTracked: true,
} as const;

/** 경기 노출 + 로고: 추적하는 모든 대회. 홈·경기 목록·팀 일정·어시스턴트에서 씀. */
export const matchVisibleWhere = {
  isTracked: true,
} as const;

/** 대회 탭·순위표·랭킹·시즌 선택기: 리그5+UCL 만 (displayOrder <= 60). */
export const competitionVisibleWhere = {
  isTracked: true,
  displayOrder: { lte: COMPETITION_VISIBLE_DISPLAY_ORDER_MAX },
} as const;

/** L1 스쿼드: 매주 받는 팀은 리그5+UCL 참가팀만. 컵 하위·유럽 예선 팀 스쿼드 폭발 방지. */
export const squadScopeWhere = {
  isTracked: true,
  displayOrder: { lte: COMPETITION_VISIBLE_DISPLAY_ORDER_MAX },
} as const;
