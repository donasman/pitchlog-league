/**
 * 선수 포지션 로컬라이즈 · i18n 1판 (feat/i18n-names-enums).
 *
 * API-Football 는 두 표기를 모두 준다:
 *   - 4-letter 코드: GK · DEF · MID · FWD (팀 상세·라인업)
 *   - 긴 이름: Goalkeeper · Defender · Midfielder · Attacker (선수 상세)
 * 둘 다 정규화해 common.position.* 로 매핑. 매칭 실패 시 원문 폴백 (dev 에서 console.warn 1회).
 */

const CODE_TO_KEY = {
  GK:  'common.position.gk',
  DEF: 'common.position.def',
  MID: 'common.position.mid',
  FWD: 'common.position.fwd',
  ATT: 'common.position.fwd',
}

const LONG_TO_KEY = {
  goalkeeper: 'common.position.goalkeeper',
  keeper:     'common.position.goalkeeper',
  defender:   'common.position.defender',
  midfielder: 'common.position.midfielder',
  attacker:   'common.position.attacker',
  forward:    'common.position.attacker',
  striker:    'common.position.attacker',
}

const warned = new Set()
function warnOnce(raw) {
  if (!import.meta.env?.DEV) return
  if (warned.has(raw)) return
  warned.add(raw)
  console.warn(`[positionLabel] unmapped position: "${raw}" — falling back to original`)
}

/**
 * @param {string|null|undefined} raw
 * @returns {{ key: string, matched: boolean, original: string, isCode: boolean }}
 */
export function parsePositionLabel(raw) {
  const original = String(raw ?? '').trim()
  if (!original) return { key: '', matched: false, original, isCode: false }
  const upper = original.toUpperCase()
  if (CODE_TO_KEY[upper]) return { key: CODE_TO_KEY[upper], matched: true, original, isCode: true }
  const lower = original.toLowerCase()
  if (LONG_TO_KEY[lower]) return { key: LONG_TO_KEY[lower], matched: true, original, isCode: false }
  warnOnce(original)
  return { key: '', matched: false, original, isCode: false }
}

/**
 * 편의: 원문 → 로컬라이즈된 문자열 (t 필요).
 * @param {string|null|undefined} raw
 * @param {(k:string) => string} t
 */
export function formatPositionLabel(raw, t) {
  const p = parsePositionLabel(raw)
  if (!p.matched) return p.original
  return t(p.key)
}
