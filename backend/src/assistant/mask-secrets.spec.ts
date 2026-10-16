/**
 * mask-secrets 단위 — 지침 D1 · Q5 조건 잠금.
 * 가짜 API 키(AIza + 35 chars) · Bearer 토큰 · ?key= 가 로그 문자열에 그대로 새어 나가면 실패.
 */
import { maskSecrets } from './mask-secrets.js';

describe('maskSecrets', () => {
  const fakeGoogleKey = 'AIzaSyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; // AIza + 35 chars

  it('빈 문자열은 그대로', () => {
    expect(maskSecrets('')).toBe('');
  });

  it('AIza + 35 chars 키를 마스킹', () => {
    const input = `something before ${fakeGoogleKey} after`;
    const out = maskSecrets(input);
    expect(out).not.toContain(fakeGoogleKey);
    expect(out).toContain('AIza***MASKED***');
  });

  it('쿼리스트링 key=... 를 마스킹', () => {
    const input = 'https://api/x?key=SECRET_TOKEN_123&foo=bar';
    const out = maskSecrets(input);
    expect(out).not.toContain('SECRET_TOKEN_123');
    expect(out).toContain('key=***MASKED***');
    // foo=bar 는 보존
    expect(out).toContain('foo=bar');
  });

  it('Authorization: Bearer 헤더를 마스킹', () => {
    const input = 'req headers: Authorization: Bearer eyJhbGci.body.sig, X-Trace: 1';
    const out = maskSecrets(input);
    expect(out).not.toContain('eyJhbGci.body.sig');
    expect(out).toContain('Authorization: Bearer ***MASKED***');
    expect(out).toContain('X-Trace: 1');
  });

  it('단독 Bearer 도 마스킹 (헤더 없는 자리)', () => {
    const input = 'Token was Bearer abcd1234efgh in body';
    const out = maskSecrets(input);
    expect(out).not.toContain('abcd1234efgh');
    expect(out).toContain('Bearer ***MASKED***');
  });

  it('SDK ApiError 본문에 든 가짜 키가 로그 문자열에 안 남는다', () => {
    // 실제 wrapSdkError 는 error.message 를 로그에 붙인다 — 그 문자열 시뮬레이션
    const bodyJson = JSON.stringify({
      error: {
        code: 429,
        status: 'RESOURCE_EXHAUSTED',
        message: `Quota exceeded for key=${fakeGoogleKey}`,
        details: [{ '@type': 'quota', quotaMetric: 'x', quotaValue: '10' }],
      },
    });
    const logLine = `Gemini call failed (status=429, errStatus=RESOURCE_EXHAUSTED): ${bodyJson}`;
    const out = maskSecrets(logLine);
    expect(out).not.toContain(fakeGoogleKey);
    // errStatus 등 안전 필드는 보존
    expect(out).toContain('RESOURCE_EXHAUSTED');
    expect(out).toContain('quotaMetric');
  });

  it('키·Bearer·쿼리 셋 다 섞여도 각각 마스킹', () => {
    const input = `A ${fakeGoogleKey} B Authorization: Bearer eyToken C https://x?key=abc D Bearer standalone-tok`;
    const out = maskSecrets(input);
    expect(out).not.toContain(fakeGoogleKey);
    expect(out).not.toContain('eyToken');
    expect(out).not.toContain('key=abc');
    expect(out).not.toContain('standalone-tok');
  });
});
