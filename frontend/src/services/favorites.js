/**
 * 팀 즐겨찾기 상수 — 상한만 남긴다.
 *
 * localStorage 저장 계층은 서버 저장(Supabase auth + backend `/api/me/favorites`)으로 이관되며 삭제됐다.
 * 즐겨찾기 상태와 서버 동기화는 `FavoritesContext` 가 담당하고, 이 파일은 상한 상수만 노출한다.
 */

export const FAVORITE_TEAMS_LIMIT = 10
