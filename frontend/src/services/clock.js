/**
 * 시계 — "지금" 을 한 곳에서 정한다.
 *
 * Mock 모드는 발표용 고정 기준일(2026-11-23 KST 정오)로 멈춰 있다. 화면 곳곳에 흩어져 있던
 * `'2026-11-23'`·`'2026-11-24'`·`'2026-09-01'` 리터럴을 이 파일로 모았다.
 * 실 API 모드는 실제 시각을 쓴다. "오늘"·"내일" 판정은 항상 KST 날짜 키로 한다.
 */

import { USE_MOCK } from './env.js'
// dateFormat.js 와 서로 import 한다 — 양쪽 다 top-level 에서는 부르지 않는다 (함수 본문·기본 인자 안에서만)
import { kstDateKey } from '../utils/dateFormat.js'

/** Mock 기준 시각 — `src/mocks/*` 의 기준일(2026-11-23) 과 같아야 한다 */
export const MOCK_NOW = '2026-11-23T12:00:00Z'

const DAY_MS = 86_400_000

/** @returns {Date} */
export function now() {
  return USE_MOCK ? new Date(MOCK_NOW) : new Date()
}

/** 오늘의 KST 날짜 키 `YYYY-MM-DD` */
export function todayKstKey() {
  return kstDateKey(now())
}

/** 내일의 KST 날짜 키 `YYYY-MM-DD` */
export function tomorrowKstKey() {
  return kstDateKey(new Date(now().getTime() + DAY_MS))
}
