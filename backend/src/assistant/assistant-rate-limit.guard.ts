/**
 * IP 당 분당 10회 상한. 커스텀 구현 — @nestjs/throttler 를 새로 넣지 않는다.
 *
 * 왜 커스텀인가:
 *   - throttler 도입은 스코프 초과 (assistant 라우트 하나만 제한).
 *   - Redis 도 안 붙어 단일 인스턴스 · 프로세스 메모리 Map 만으로 충분하다 (BACKEND_GUIDE).
 *
 * 정확성:
 *   - 슬라이딩 윈도우 60초. Map<ip, number[]> — 요청 timestamp 를 push, 오래된 것은 shift.
 *   - Nest 인젝터가 이 가드를 싱글턴으로 만든다 — Map 도 같이 싱글턴.
 *   - request.ip 는 express Trust proxy 를 안 켠 기본 상태에서 socket.remoteAddress 이다.
 *     프록시 뒤라면 X-Forwarded-For 를 신뢰하도록 별도 설정이 필요하지만, 이 서비스는
 *     현재 CORS·GET 만 열린 상태라 소켓 주소로 충분하다.
 */
import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX = 10;

@Injectable()
export class AssistantRateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const now = Date.now();
    const bucket = this.hits.get(ip) ?? [];
    // 윈도우 밖의 오래된 timestamp 제거 — 앞에서부터 shift
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    while (bucket.length > 0 && bucket[0]! <= cutoff) bucket.shift();
    if (bucket.length >= RATE_LIMIT_MAX) {
      throw new HttpException('assistant.error.rate_limited', HttpStatus.TOO_MANY_REQUESTS);
    }
    bucket.push(now);
    this.hits.set(ip, bucket);
    return true;
  }
}
