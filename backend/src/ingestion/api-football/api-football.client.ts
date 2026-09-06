/**
 * API-Football 공통 HTTP client — 수집 기능보다 먼저 만든다 (NEXT_STEPS 5단계).
 * v1 은 보호장치 없이 수집부터 만들었고 회고가 그걸 지목했다.
 *
 *   · timeout 10초 (AbortController)
 *   · 분당 호출 제한 — Pro 플랜 450/분. 넘기기 전에 스스로 기다린다
 *   · 재시도 3회, 지수 백오프 1s·2s·4s — 네트워크 오류·429·5xx 만. 4xx 는 재시도하지 않는다
 *   · 200 이어도 body.errors 가 비어 있지 않으면 실패로 본다 (API-Football 의 방식)
 *   · 호출 수를 센다 — ingestion_runs.calls_used 와 경고선 판단의 근거
 *
 * 이 클래스만 외부 API 를 부른다. 서비스 계층이 직접 fetch 하지 않는다 (CLAUDE.md 백엔드 규칙).
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { ApiFootballError, ApiQuotaExhaustedError } from './api-football.errors.js';
import type { ApiEnvelope } from './api-football.types.js';

const BASE_URL = 'https://v3.football.api-sports.io';
const TIMEOUT_MS = 10_000;
const PER_MINUTE_LIMIT = 450;
const MAX_ATTEMPTS = 3;

@Injectable()
export class ApiFootballClient {
  private readonly logger = new Logger(ApiFootballClient.name);
  private readonly key: string;
  /** 최근 60초 호출 시각 — 분당 제한 판단 */
  private readonly window: number[] = [];
  /** 프로세스 시작 이후 누적. 서비스가 run 단위로 차분을 계산한다 */
  private total = 0;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    const key = config.get('API_FOOTBALL_KEY', { infer: true });
    if (!key) throw new Error('API_FOOTBALL_KEY 가 없다 — 수집 기능을 켜려면 필수');
    this.key = key;
  }

  get callCount(): number {
    return this.total;
  }

  /**
   * GET /path?query. 응답의 response 배열(또는 객체)만 돌려준다.
   * 페이지네이션이 필요한 엔드포인트는 getPaged 를 쓴다.
   */
  async get<T>(path: string, query: Record<string, string | number> = {}): Promise<ApiEnvelope<T>> {
    const qs = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString();
    const url = `${BASE_URL}${path}${qs ? `?${qs}` : ''}`;
    const label = `${path}${qs ? `?${qs}` : ''}`;

    let lastErr: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await this.throttle();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        this.total++;
        this.window.push(Date.now());
        const res = await fetch(url, { headers: { 'x-apisports-key': this.key }, signal: ctrl.signal });
        clearTimeout(timer);

        if (res.status === 429) {
          // 분당 제한이면 잠시 후 재시도, 일일 한도면 포기
          const body = (await res.json().catch(() => ({}))) as Partial<ApiEnvelope<unknown>>;
          if (this.isDailyLimit(body.errors)) throw new ApiQuotaExhaustedError(label);
          throw new ApiFootballError('분당 호출 제한', label, 429, true);
        }
        if (res.status >= 500) throw new ApiFootballError(`HTTP ${res.status}`, label, res.status, true);
        if (!res.ok) throw new ApiFootballError(`HTTP ${res.status}`, label, res.status, false);

        const body = (await res.json()) as ApiEnvelope<T>;
        if (this.hasErrors(body.errors)) {
          if (this.isDailyLimit(body.errors)) throw new ApiQuotaExhaustedError(label);
          throw new ApiFootballError(`API errors: ${JSON.stringify(body.errors)}`, label, 200, false);
        }
        return body;
      } catch (err) {
        clearTimeout(timer);
        lastErr = err;
        const retryable =
          (err instanceof ApiFootballError && err.retryable) ||
          (err instanceof Error && (err.name === 'AbortError' || err.name === 'TypeError')); // timeout · 네트워크
        if (!retryable || attempt === MAX_ATTEMPTS) throw err;
        const wait = 1000 * 2 ** (attempt - 1);
        this.logger.warn(`${label} 실패 (${attempt}/${MAX_ATTEMPTS}) — ${wait}ms 후 재시도: ${(err as Error).message}`);
        await sleep(wait);
      }
    }
    throw lastErr;
  }

  /** paging.total 만큼 전부 받아 response 를 합친다 (/players 등) */
  async getAllPages<T>(path: string, query: Record<string, string | number> = {}): Promise<T[]> {
    const first = await this.get<T[]>(path, { ...query, page: 1 });
    const out = [...first.response];
    for (let page = 2; page <= (first.paging?.total ?? 1); page++) {
      const next = await this.get<T[]>(path, { ...query, page });
      out.push(...next.response);
    }
    return out;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    while (this.window.length && now - this.window[0] > 60_000) this.window.shift();
    if (this.window.length >= PER_MINUTE_LIMIT) {
      const wait = 60_000 - (now - this.window[0]) + 50;
      this.logger.warn(`분당 ${PER_MINUTE_LIMIT}콜 도달 — ${wait}ms 대기`);
      await sleep(wait);
    }
  }

  private hasErrors(errors: ApiEnvelope<unknown>['errors'] | undefined): boolean {
    if (!errors) return false;
    return Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0;
  }

  private isDailyLimit(errors: ApiEnvelope<unknown>['errors'] | undefined): boolean {
    const text = JSON.stringify(errors ?? '').toLowerCase();
    return text.includes('daily') || text.includes('limit_day') || text.includes('quota');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
