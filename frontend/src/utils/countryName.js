/**
 * 영문 국가명 → 로케일별 표시 · i18n 1판 (feat/i18n-names-enums).
 *
 * 규칙:
 *   - locale === 'en' → 원문(정리한 영문) 그대로.
 *   - locale === 'ko' → Intl.DisplayNames('ko', {type:'region'})(ISO2) 로 한글화.
 *   - England · Scotland · Wales · Northern Ireland 는 ISO region 이 아니라 i18n 키로 별도 (country.<en>).
 *   - ISO2 매핑도 실패하면 원문 폴백 (개발 모드 console.warn 1회).
 *
 * 소비: player.nationality · team.country · competition.country ·
 *      player.birthCountry (필요 시).
 */

const warned = new Set()
function warnOnce(raw) {
  if (!import.meta.env?.DEV) return
  if (warned.has(raw)) return
  warned.add(raw)
  console.warn(`[countryName] unmapped country: "${raw}" — falling back to original`)
}

/**
 * 영문 국가명(API-Football 원문) → ISO 3166-1 alpha-2.
 * 실 API 실측(2026-09-28) distinct 46 개 + 자주 나오는 것 위주.
 * 값이 null 이면 ISO 매핑 불가(사용자 영역 · i18n 키로 처리).
 */
const NAME_TO_ISO2 = {
  Albania:'AL', Andorra:'AD', Argentina:'AR', Armenia:'AM', Australia:'AU', Austria:'AT', Azerbaijan:'AZ',
  Belarus:'BY', Belgium:'BE', 'Bosnia':'BA', 'Bosnia-Herzegovina':'BA', Brazil:'BR', Bulgaria:'BG',
  Cameroon:'CM', Canada:'CA', Chile:'CL', China:'CN', Colombia:'CO', 'Costa-Rica':'CR', 'Costa Rica':'CR',
  Croatia:'HR', Cyprus:'CY', 'Czech-Republic':'CZ', 'Czech Republic':'CZ', 'Czechia':'CZ',
  Denmark:'DK', Ecuador:'EC', Egypt:'EG', Estonia:'EE', 'Faroe-Islands':'FO', Finland:'FI', France:'FR',
  Georgia:'GE', Germany:'DE', Ghana:'GH', Gibraltar:'GI', Greece:'GR', Guadeloupe:'GP', Hungary:'HU',
  Iceland:'IS', India:'IN', Ireland:'IE', Israel:'IL', Italy:'IT', 'Ivory-Coast':'CI', 'Ivory Coast':'CI',
  Japan:'JP', Kazakhstan:'KZ', Kosovo:'XK', Latvia:'LV', Liechtenstein:'LI', Lithuania:'LT', Luxembourg:'LU',
  Malta:'MT', Martinique:'MQ', Mexico:'MX', Moldova:'MD', Montenegro:'ME', Morocco:'MA',
  Netherlands:'NL', 'New-Caledonia':'NC', 'New Caledonia':'NC', 'New-Zealand':'NZ', Nigeria:'NG',
  'North-Macedonia':'MK', 'North Macedonia':'MK', Norway:'NO',
  Panama:'PA', Paraguay:'PY', Peru:'PE', Poland:'PL', Portugal:'PT', Reunion:'RE', Romania:'RO', Russia:'RU',
  'San-Marino':'SM', 'Saudi-Arabia':'SA', Senegal:'SN', Serbia:'RS', Slovakia:'SK', Slovenia:'SI',
  'South-Africa':'ZA', 'South-Korea':'KR', 'Korea Republic':'KR', 'Korea-Republic':'KR', Korea:'KR',
  Spain:'ES', Sweden:'SE', Switzerland:'CH', Tahiti:'PF',
  Tunisia:'TN', Turkey:'TR', 'Türkiye':'TR',
  Ukraine:'UA', 'United-States':'US', USA:'US', Uruguay:'UY', Uzbekistan:'UZ', Venezuela:'VE', Wales:'GB',
  // "World" · "Europe" 같은 값은 국가가 아니라 대회 개최 범위 — 매핑 없이 원문 폴백.
}

/** ISO region 이 아니라 별도 i18n 키로 다뤄야 하는 것 (영국 하위 · CONMEBOL 지역 등) */
const KEY_ONLY = new Set([
  'England', 'Scotland', 'Wales', 'Northern-Ireland', 'Northern Ireland',
])

/**
 * 국가명 로컬라이즈.
 * @param {string|null|undefined} raw
 * @param {'ko'|'en'} locale
 * @param {(k:string) => string} [t]  i18n t (KEY_ONLY 처리용)
 * @returns {string}
 */
export function localizeCountry(raw, locale = 'ko', t) {
  const original = String(raw ?? '').trim()
  if (!original) return ''

  // en 은 원문 그대로 (하이픈만 공백으로 정리)
  if (locale === 'en') return original.replace(/-/g, ' ')

  // KEY_ONLY (England 등) — t 를 통해 i18n
  if (KEY_ONLY.has(original)) {
    if (typeof t === 'function') {
      const key = `country.${original.replace(/[- ]/g, '')}`  // country.England · country.NorthernIreland
      const v = t(key)
      if (v && v !== key) return v
    }
    return original.replace(/-/g, ' ')
  }

  const iso2 = NAME_TO_ISO2[original]
  if (!iso2) {
    warnOnce(original)
    return original.replace(/-/g, ' ')
  }

  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
      const dn = new Intl.DisplayNames([locale === 'ko' ? 'ko' : 'en'], { type: 'region' })
      const name = dn.of(iso2)
      if (name) return name
    }
  } catch {
    /* Intl 미지원 환경 (구형 브라우저) — 원문 폴백 */
  }
  return original.replace(/-/g, ' ')
}
