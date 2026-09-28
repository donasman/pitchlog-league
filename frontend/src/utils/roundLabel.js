/**
 * 라운드 이름 파서 · i18n 1판 (feat/i18n-names-enums).
 * API-Football 원문 round.name → i18n 키 + 파라미터 로 매핑.
 *
 * 사용:
 *   const { key, params, original, matched } = parseRoundLabel(round)
 *   // matched=false 이면 original 을 그대로 노출 (개발 모드에서만 console.warn 1회)
 *   const label = matched ? t(key, params) : original
 *
 * 실 API 실측(2026-09-28 · 245경기 창) distinct 목록 전부 매칭:
 *   Regular Season - N · League Stage - Matchday N · Round of N · 1/N-finals
 *   Quarter-finals · Semi-finals · Final · Group X · Preliminary Round · Playoff round
 *   Play-offs · Qualifying Round N · 3rd Qualifying Round · Nth Round · Grand Final 등.
 */

const warned = new Set()
function warnOnce(raw) {
  if (!import.meta.env?.DEV) return
  if (warned.has(raw)) return
  warned.add(raw)
  console.warn(`[roundLabel] unmapped round: "${raw}" — falling back to original`)
}

/** 서수형 접미어 (1st·2nd·3rd·Nth) → 숫자 */
function parseOrdinal(s) {
  const m = s.match(/^(\d+)(?:st|nd|rd|th)$/i)
  return m ? Number(m[1]) : null
}

/**
 * @typedef {{ key: string, params?: Record<string, string|number>, original: string, matched: boolean }} RoundLabelParsed
 */

/**
 * 라운드 원문 → { i18n 키, params, matched }.
 * @param {string|null|undefined} raw
 * @returns {RoundLabelParsed}
 */
export function parseRoundLabel(raw) {
  const original = String(raw ?? '').trim()
  if (!original) return { key: '', params: undefined, original: '', matched: false }

  // Regular Season - N
  let m = original.match(/^Regular Season\s*-\s*(\d+)$/i)
  if (m) return { key: 'round.regularSeason', params: { n: Number(m[1]) }, original, matched: true }

  // League Stage - Matchday N (UCL/UEL 리그 페이즈)
  m = original.match(/^League Stage\s*-\s*Matchday\s+(\d+)$/i)
  if (m) return { key: 'round.leaguePhaseMatchday', params: { n: Number(m[1]) }, original, matched: true }
  // 그냥 Matchday N (일부 대회)
  m = original.match(/^Matchday\s+(\d+)$/i)
  if (m) return { key: 'round.matchday', params: { n: Number(m[1]) }, original, matched: true }

  // 1/N-finals · 1/8-finals · 1/128-finals
  m = original.match(/^1\/(\d+)-?finals?$/i)
  if (m) return { key: 'round.oneOverN', params: { n: Number(m[1]) }, original, matched: true }

  // Round of N (16·32·64·128 등)
  m = original.match(/^Round of\s+(\d+)$/i)
  if (m) return { key: 'round.roundOfN', params: { n: Number(m[1]) }, original, matched: true }

  // Quarter-finals · Semi-finals · Final
  if (/^Quarter[-\s]?finals?$/i.test(original)) return { key: 'round.quarterFinals', original, matched: true }
  if (/^Semi[-\s]?finals?$/i.test(original))    return { key: 'round.semiFinals',    original, matched: true }
  if (/^Grand\s+Final$/i.test(original))        return { key: 'round.grandFinal',    original, matched: true }
  if (/^Final$/i.test(original))                return { key: 'round.final',         original, matched: true }
  if (/^3rd[-\s]place[-\s]?final?$/i.test(original)) return { key: 'round.thirdPlaceFinal', original, matched: true }

  // Group Stage / League Stage / Knockout Round Play-offs (Group X 보다 먼저 · "Group Stage" 가 group="Stage" 로 잡히지 않게)
  if (/^Group\s+Stage$/i.test(original))                  return { key: 'round.groupStage',       original, matched: true }
  if (/^League\s+Stage$/i.test(original))                 return { key: 'round.leaguePhase',      original, matched: true }
  if (/^Knockout\s+Round\s+Play-?offs?$/i.test(original)) return { key: 'round.knockoutPlayoffs', original, matched: true }

  // Group X (Group A · Group B ...) — 한 글자·숫자 그룹만 매칭
  m = original.match(/^Group\s+([A-Z0-9])$/i)
  if (m) return { key: 'round.groupX', params: { group: m[1].toUpperCase() }, original, matched: true }

  // Preliminary Round
  if (/^Preliminary\s+Round$/i.test(original)) return { key: 'round.preliminaryRound', original, matched: true }
  if (/^Preliminary\s+Final$/i.test(original)) return { key: 'round.preliminaryFinal', original, matched: true }

  // Playoff · Play-offs · Playoff round
  if (/^(Play-?offs?|Playoff\s+round)$/i.test(original)) return { key: 'round.playoffs', original, matched: true }
  // Promotion / Relegation Playoff — 실측 확장 대비
  if (/^Relegation\s+Play-?offs?$/i.test(original)) return { key: 'round.relegationPlayoff', original, matched: true }
  if (/^Promotion\s+Play-?offs?$/i.test(original)) return { key: 'round.promotionPlayoff',  original, matched: true }

  // Nth Qualifying Round (3rd · 1st · 2nd · 4th)
  m = original.match(/^(\d+)(?:st|nd|rd|th)\s+Qualifying\s+Round$/i)
  if (m) return { key: 'round.qualifyingRoundOrdinal', params: { n: Number(m[1]) }, original, matched: true }
  // Qualifying Round N
  m = original.match(/^Qualifying\s+Round\s+(\d+)$/i)
  if (m) return { key: 'round.qualifyingRoundOrdinal', params: { n: Number(m[1]) }, original, matched: true }

  // Nth Round (컵 · "1st Round" · "5th Round" 등)
  const ord = parseOrdinal(original.replace(/\s+Round$/i, ''))
  if (ord != null && /Round$/i.test(original)) {
    return { key: 'round.ordinalRound', params: { n: ord }, original, matched: true }
  }
  // "Round N" (단순 형태 · 백엔드가 컵을 "Round 3" 처럼 줄 때)
  const m2 = original.match(/^Round\s+(\d+)$/i)
  if (m2) return { key: 'round.ordinalRound', params: { n: Number(m2[1]) }, original, matched: true }

  // 컵 결승 이전 라운드 관례 표기
  if (/^Final\s+Round$/i.test(original))         return { key: 'round.final', original, matched: true }
  if (/^Semifinal(s)?$/i.test(original))         return { key: 'round.semiFinals', original, matched: true }
  if (/^Quarterfinal(s)?$/i.test(original))      return { key: 'round.quarterFinals', original, matched: true }

  warnOnce(original)
  return { key: '', params: undefined, original, matched: false }
}

/**
 * 편의 함수 — t 를 받아 바로 라벨 문자열을 돌려준다.
 * matched=false 면 원문 폴백.
 * @param {string|null|undefined} raw
 * @param {(k:string, params?:object) => string} t
 */
export function formatRoundLabel(raw, t) {
  const p = parseRoundLabel(raw)
  if (!p.matched) return p.original
  return t(p.key, p.params)
}
