import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StandingService } from './standing.service.js';
import { StandingsListDto, StandingsQueryDto } from './standing.dto.js';

@ApiTags('standings')
@Controller('standings')
export class StandingController {
  constructor(private readonly standings: StandingService) {}

  @Get()
  @ApiOperation({ summary: '순위표 — competition 생략 시 화면 6대회 전부. 컵(KNOCKOUT)은 200 + rows 빈 배열 + unavailableReason' })
  @ApiOkResponse({ type: StandingsListDto })
  @ApiBadRequestResponse({ description: 'ref 형식 오류 · season 범위 밖 · 모르는 파라미터' })
  @ApiNotFoundResponse({ description: '추적 대회가 아니거나 그 시즌이 없다' })
  list(@Query() q: StandingsQueryDto): Promise<StandingsListDto> {
    return this.standings.list(q);
  }
}
