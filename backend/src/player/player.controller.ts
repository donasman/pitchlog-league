import { Controller, Get, Param } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PlayerService } from './player.service.js';
import { PlayerDetailDto } from './player.dto.js';

@ApiTags('players')
@Controller('players')
export class PlayerController {
  constructor(private readonly players: PlayerService) {}

  @Get(':ref')
  @ApiOperation({ summary: '선수 상세 — 프로필 · 현재 소속 · 시즌 통계 · 커리어 합계' })
  @ApiParam({ name: 'ref', example: '909-lionel-messi', description: 'API-Football player id. `<id>-<slug>` 도 받는다' })
  @ApiOkResponse({ type: PlayerDetailDto })
  @ApiBadRequestResponse({ description: 'ref 형식 오류' })
  @ApiNotFoundResponse({ description: '선수가 없다' })
  detail(@Param('ref') ref: string): Promise<PlayerDetailDto> {
    return this.players.detail(ref);
  }
}
