import { Controller, Get, Param } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CompetitionService } from './competition.service.js';
import { CompetitionDetailDto, CompetitionListDto } from './competition.dto.js';

@ApiTags('competitions')
@Controller('competitions')
export class CompetitionController {
  constructor(private readonly competitions: CompetitionService) {}

  @Get()
  @ApiOperation({ summary: '추적 대회 목록 — 리그 6 · 컵 6 · 슈퍼컵 5, displayOrder 순. 각 대회의 현재 시즌 포함' })
  @ApiOkResponse({ type: CompetitionListDto })
  list(): Promise<CompetitionListDto> {
    return this.competitions.list();
  }

  @Get(':ref')
  @ApiOperation({ summary: '대회 상세 + 시즌 목록(최신 먼저, dataState 포함)' })
  @ApiParam({ name: 'ref', example: '39-premier-league', description: '`<apiId>-<slug>` 또는 `<apiId>`' })
  @ApiOkResponse({ type: CompetitionDetailDto })
  @ApiBadRequestResponse({ description: 'ref 형식 오류' })
  @ApiNotFoundResponse({ description: '추적 대회가 아니다' })
  detail(@Param('ref') ref: string): Promise<CompetitionDetailDto> {
    return this.competitions.detail(ref);
  }
}
