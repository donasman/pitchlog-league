/**
 * 로그로 나가기 직전, API 키·Bearer 토큰을 마스킹한다.
 *
 * 지침 (D1 · Q5 조건):
 *   - Google API 키:  `AIza[0-9A-Za-z_-]{35}` → `AIza***MASKED***`
 *   - 쿼리스트링 key: `key=<임의문자>` → `key=***MASKED***`
 *   - Authorization:  `Authorization: Bearer <임의>` → `Authorization: Bearer ***MASKED***`
 *   - 헤더 없는 자리:  단독 `Bearer <임의>` → `Bearer ***MASKED***`
 *
 * 순서 주의:
 *   - `Authorization: Bearer ...` 을 먼저 마스킹해야 뒤이어 오는 단독 Bearer 규칙에
 *     `Authorization: ` 접두사가 통째로 들어가 이중 처리되는 걸 막는다.
 *   - `AIza...` 는 별도 · `key=...` 는 URL 쿼리 인자만.
 */
export function maskSecrets(text: string): string {
  if (!text) return text;
  return text
    .replace(/(Authorization:\s*Bearer)\s+[^\s"',;)}\]]+/gi, '$1 ***MASKED***')
    .replace(/\bBearer\s+[^\s"',;)}\]]+/g, 'Bearer ***MASKED***')
    // AIza + 35 chars — word boundary 는 뒷 문자가 계속 word 문자면 실패하므로 앞만 검사.
    // greedy `[0-9A-Za-z_-]{35,}` 로 이어지는 문자를 전부 삼켜 남기지 않는다.
    .replace(/AIza[0-9A-Za-z_-]{35,}/g, 'AIza***MASKED***')
    .replace(/([?&])key=[^&\s"',;)}\]]+/g, '$1key=***MASKED***');
}
