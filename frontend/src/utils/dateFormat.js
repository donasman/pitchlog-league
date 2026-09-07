/**
 * 날짜·시각 포맷 유틸리티
 * 발표 화면이 실행 시각에 따라 달라지지 않도록 KST 기준 포맷을 고정.
 * locale 인자: 'ko' → 'ko-KR', 'en' → 'en-US' (기본값 'ko')
 * timeZone: 'Asia/Seoul' 항상 유지.
 */

// clock.js 와 서로 import 한다 — 양쪽 다 top-level 에서는 부르지 않는다 (함수 본문·기본 인자 안에서만)
import { now } from '../services/clock.js'

const LOCALE_MAP = { ko: 'ko-KR', en: 'en-US' }
function toIntl(locale) { return LOCALE_MAP[locale] ?? 'ko-KR' }

/**
 * ISO datetime을 KST 시각 문자열로 변환
 * ko: "오후 11:00"  en: "11:00 PM"
 * @param {string} isoString
 * @param {'ko'|'en'} [locale='ko']
 */
export function toKSTTime(isoString, locale = 'ko') {
  const date = new Date(isoString)
  return date.toLocaleTimeString(toIntl(locale), {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  })
}

/**
 * ISO datetime을 KST 날짜 문자열로 변환
 * ko: "11월 23일 (일)"  en: "Nov 23 (Sun)"
 * @param {string} isoString
 * @param {'ko'|'en'} [locale='ko']
 */
export function toKSTDate(isoString, locale = 'ko') {
  const date = new Date(isoString)
  return date.toLocaleDateString(toIntl(locale), {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Seoul',
  })
}

/**
 * ISO datetime을 KST 날짜+시각 문자열로 변환
 * ko: "11월 11일 오전 08:15"  en: "Nov 11, 08:15 AM"
 * @param {string} isoString
 * @param {'ko'|'en'} [locale='ko']
 */
export function toKSTDateTime(isoString, locale = 'ko') {
  const date = new Date(isoString)
  return date.toLocaleString(toIntl(locale), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  })
}

/**
 * ISO datetime(또는 Date)을 KST 날짜 키로 변환 — "오늘"·"같은 날" 판정의 유일한 기준
 * '2026-03-01T15:00:00Z' → '2026-03-02' (KST = UTC+9)
 * @param {string|Date} isoOrDate
 * @returns {string} YYYY-MM-DD
 */
export function kstDateKey(isoOrDate) {
  return new Date(isoOrDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
}

/**
 * 선수 생년월일로 나이 계산. 기준일은 `services/clock.js` 의 now() — Mock 은 고정, 실 API 는 실제 시각
 * @param {string|null|undefined} dateOfBirth  ISO date (YYYY-MM-DD)
 * @param {string|Date} [referenceDate=now()]
 * @returns {number|null}  생년월일이 없으면 null — 0 이 아니다
 */
export function calcAge(dateOfBirth, referenceDate = now()) {
  if (dateOfBirth == null) return null
  const birth = new Date(dateOfBirth)
  const ref = new Date(referenceDate)
  let age = ref.getFullYear() - birth.getFullYear()
  const m = ref.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--
  return age
}
