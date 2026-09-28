/**
 * `@CurrentUser()` — SupabaseAuthGuard 가 req.user 에 심은 { id, email } 을 컨트롤러 파라미터로 뽑는다.
 *
 * Guard 를 통과했다는 전제라 정의상 undefined 가 아니지만, 방어적으로 검사한다.
 */
import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import type { AuthenticatedUser, RequestWithUser } from './supabase-auth.guard.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (!req.user) {
      // Guard 가 통과했는데 여기가 undefined 이면 배선 실수다 — 클라이언트가 볼 일 없어야 한다
      throw new InternalServerErrorException('current_user_missing');
    }
    return req.user;
  },
);
