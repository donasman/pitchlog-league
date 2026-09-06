export class ApiFootballError extends Error {
  constructor(
    message: string,
    readonly path: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'ApiFootballError';
  }
}

/** 일일 한도 소진 — 재시도해도 소용없다. 스케줄러가 이걸 받으면 오늘은 멈춘다 */
export class ApiQuotaExhaustedError extends ApiFootballError {
  constructor(path: string) {
    super('API-Football 일일 한도 소진', path, 429, false);
    this.name = 'ApiQuotaExhaustedError';
  }
}
