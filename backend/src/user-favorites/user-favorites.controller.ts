/**
 * GET/PUT /api/me/favorites — SupabaseAuthGuard 로 보호.
 *
 * 계약:
 *   - Authorization: Bearer <ES256 JWT>
 *   - `?locale=ko|en` (기본 ko)
 *   - PUT body: { teamRefs: string[] }
 *   - 401·400(code) 는 서비스·가드가 던짐 · 성공은 FavoritesResponseDto
 *
 * CacheHeaderInterceptor 가 `/api/me/*` 는 `private, no-store` · Vary: Authorization 으로 분기.
 */
import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard, type AuthenticatedUser } from '../auth/supabase-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { parseLocale } from '../common/locale.js';
import { UserFavoritesService } from './user-favorites.service.js';
import { PutFavoritesDto } from './dto/put-favorites.dto.js';
import type { FavoritesResponseDto } from './dto/favorites-response.dto.js';

@ApiTags('me')
@UseGuards(SupabaseAuthGuard)
@Controller('me/favorites')
export class UserFavoritesController {
  constructor(private readonly service: UserFavoritesService) {}

  @Get()
  @ApiOperation({ summary: '즐겨찾기 팀 목록' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('locale') localeRaw?: string,
  ): Promise<FavoritesResponseDto> {
    return this.service.list(user.id, parseLocale(localeRaw));
  }

  @Put()
  @ApiOperation({ summary: '즐겨찾기 팀 전체 교체 (순서 = 배열 index)' })
  async replace(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PutFavoritesDto,
    @Query('locale') localeRaw?: string,
  ): Promise<FavoritesResponseDto> {
    return this.service.replace(user.id, body, parseLocale(localeRaw));
  }
}
