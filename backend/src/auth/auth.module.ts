/**
 * Auth 모듈 — JWKS provider · SupabaseAuthGuard 를 export.
 * 다른 모듈이 SupabaseAuthGuard 를 `@UseGuards()` 로 걸려면 이 모듈을 import 해야 한다.
 */
import { Module } from '@nestjs/common';
import { supabaseJwksProvider } from './jwks.provider.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';

@Module({
  providers: [supabaseJwksProvider, SupabaseAuthGuard],
  exports: [supabaseJwksProvider, SupabaseAuthGuard],
})
export class AuthModule {}
