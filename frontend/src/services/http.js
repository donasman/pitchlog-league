/**
 * HTTP 클라이언트 — 실 API 호출의 유일한 통로
 *
 * 규칙 (FRONTEND_GUIDE §5):
 *   오류를 빈 배열·null 로 숨기지 않고 throw 한다. 페이지가 catch 해서 ErrorState 를 띄운다.
 *   무음 catch 는 CI 검사가 막는다.
 *
 * 메시지는 화면에 그대로 뜨므로 i18n 을 거친다. 서비스 계층은 React 밖이라
 * useTranslation 대신 i18next 인스턴스를 직접 쓴다.
 */

import i18n from '@/i18n'

/** 끝 슬래시를 떼서 `${BASE}/api/...` 가 항상 한 겹이 되게 한다 */
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

/** 백엔드가 아직 제공하지 않는 데이터임을 나타낸다 — 네트워크 오류와 구분한다 */
export class NotImplementedError extends Error {
  /** @param {string} featureKey  i18n 키 (errors.feature.*) */
  constructor(featureKey) {
    super(i18n.t('errors.notImplemented', { what: i18n.t(featureKey) }))
    this.name = 'NotImplementedError'
    this.featureKey = featureKey
    this.notImplemented = true
  }
}

/** null·undefined·빈 문자열인 값은 쿼리에서 뺀다 */
function toQuery(params) {
  const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (entries.length === 0) return ''
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
}

/**
 * GET 요청. 2xx 가 아니면 백엔드가 준 message 를 살려 throw 한다.
 * @param {string} path  `/api/` 로 시작하는 경로
 * @param {Record<string, string|number|undefined|null>} [params]
 */
export async function apiGet(path, params) {
  const url = `${BASE}${path}${toQuery(params)}`

  let res
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch (cause) {
    // fetch 는 네트워크·CORS 실패에서만 reject 한다. 4xx·5xx 는 아래에서 처리
    throw new Error(i18n.t('errors.networkFailed', { detail: `${url} — ${cause.message}` }), { cause })
  }

  if (!res.ok) {
    const detail = await readErrorMessage(res)
    throw new Error(
      i18n.t('errors.requestFailed', { status: res.status, detail: detail ?? `${res.statusText} ${path}` }),
    )
  }

  return res.json()
}

/** Nest 예외 필터가 { message } 를 준다. 본문이 없거나 JSON 이 아니면 조용히 포기한다 */
async function readErrorMessage(res) {
  try {
    const body = await res.json()
    const m = body?.message
    return Array.isArray(m) ? m.join(', ') : (m ?? null)
  } catch {
    // 본문 파싱 실패는 그 자체로 알릴 것이 없다 — 상태 코드가 이미 오류를 말한다
    return null
  }
}
