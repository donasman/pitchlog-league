/**
 * 날짜·시각 포맷 유틸리티
 * 발표 화면이 실행 시각에 따라 달라지지 않도록 KST 기준 포맷을 고정.
 * locale 인자: 'ko' → 'ko-KR', 'en' → 'en-US' (기본값 'ko')
 * timeZone: 'Asia/Seoul' 항상 유지.
 */

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
 * 선수 생년월일로 나이 계산 (고정 기준일 사용)
 * @param {string} dateOfBirth  ISO date (YYYY-MM-DD)
 * @param {string} [referenceDate='2026-09-01']
 * @returns {number}
 */
export function calcAge(dateOfBirth, referenceDate = '2026-09-01') {
  const birth = new Date(dateOfBirth)
  const ref = new Date(referenceDate)
  let age = ref.getFullYear() - birth.getFullYear()
  const m = ref.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--
  return age
}
