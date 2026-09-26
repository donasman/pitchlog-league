/**
 * GET /api/live — 진행 중 경기 + 종료 후 3시간 이내 경기.
 * CacheHeaderInterceptor 가 이 경로만 `Cache-Control: public, max-age=0, s-maxage=5` 로 취급한다.
 */
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LiveService } from './live.service.js';
import { LiveResponseDto } from './dto/live-match.dto.js';

@ApiTags('live')
@Controller('live')
export class LiveController {
  constructor(private readonly live: LiveService) {}

  @Get()
  @ApiOkResponse({ type: LiveResponseDto })
  async list(): Promise<LiveResponseDto> {
    return this.live.list();
  }
}
