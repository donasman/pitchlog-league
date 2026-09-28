/**
 * Supabase 클라이언트 — 로그인·세션·즐겨찾기 저장의 유일한 진입점.
 *
 * `VITE_SUPABASE_URL` · `VITE_SUPABASE_PUBLISHABLE_KEY` 두 값이 모두 truthy 여야
 * 실제 SupabaseClient 를 만든다. 하나라도 비어 있으면 `null` 을 export 한다 —
 * 이때 로그인 기능은 통째로 비활성화되고 즐겨찾기도 서버 저장으로 넘어가지 않는다.
 *
 * env 부족 시 부작용은 모듈이 처음 로드될 때 한 번만 콘솔 경고를 남긴다.
 * 무음 실패 금지 — 브라우저 콘솔에서 이유가 곧바로 보여야 한다.
 */

import { createClient } from '@supabase/supabase-js'

const env = import.meta.env ?? {}
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY

/** @type {import('@supabase/supabase-js').SupabaseClient|null} */
export const supabase = url && key ? createClient(url, key) : null

/** true 면 로그인 UI·서버 저장이 활성화. false 면 모든 로그인 관련 훅이 no-op. */
export const isAuthEnabled = supabase !== null

if (!isAuthEnabled) {
  // 모듈 스코프에서 한 번만. React 마운트마다 반복 경고하지 않는다.
  console.warn('[auth] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing — auth disabled.')
}
