import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service.js';
import { RankingListDto, RankingsQueryDto } from './statistics.dto.js';

@ApiTags('stats')
@Controller('stats')
export class StatisticsController {
  constructor(private readonly stats: StatisticsService) {}

  @Get('scorers')
  @ApiOperation({ summary: '득점 랭킹 — competition 지정 시 그 대회, 생략 시 화면 6대회 합산 (모드 B: items[].breakdown 필수)' })
  @ApiOkResponse({ type: RankingListDto })
  @ApiBadRequestResponse({ description: 'ref 형식 오류 · season/limit 범위 밖 · 모르는 파라미터' })
  @ApiNotFoundResponse({ description: '추적 대회가 아니거나 그 시즌이 없다' })
  scorers(@Query() q: RankingsQueryDto): Promise<RankingListDto> {
    return this.stats.scorers(q);
  }

  @Get('assisters')
  @ApiOperation({ summary: '도움 랭킹 — 규약은 /stats/scorers 와 동일 (category 만 ASSISTS)' })
  @ApiOkResponse({ type: RankingListDto })
  @ApiBadRequestResponse({ description: 'ref 형식 오류 · season/limit 범위 밖 · 모르는 파라미터' })
  @ApiNotFoundResponse({ description: '추적 대회가 아니거나 그 시즌이 없다' })
  assisters(@Query() q: RankingsQueryDto): Promise<RankingListDto> {
    return this.stats.assisters(q);
  }
}
