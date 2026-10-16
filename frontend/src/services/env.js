/**
 * 환경변수 해석 — 서비스 계층 전체가 공유하는 스위치.
 *
 * `api.js` 가 아니라 여기 둔 이유: `clock.js` 가 USE_MOCK 을 읽는데 `api.js → live.js → clock.js`
 * 경로 위에 있어서 `api.js` 에서 읽으면 순환 import 가 된다.
 * `api.js` 는 기존 import 경로를 위해 이 값을 다시 export 한다.
 */

/** Vite 밖(순수 node 로 유틸을 돌릴 때)에는 import.meta.env 가 없다 — 그때는 Mock 으로 본다 */
const env = import.meta.env ?? {}

/** 문자열 'false' 만 실 API 로 본다 — 오타로 실 API 가 켜지지 않게 */
export const USE_MOCK = String(env.VITE_USE_MOCK ?? 'true') !== 'false'
