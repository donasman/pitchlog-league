import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CompetitionService } from './competition.service.js';
import { CompetitionDetailDto, CompetitionListDto } from './competition.dto.js';
import { parseLocale } from '../common/locale.js';

@ApiTags('competitions')
@Controller('competitions')
export class CompetitionController {
  constructor(private readonly competitions: CompetitionService) {}

  @Get()
  @ApiOperation({ summary: '추적 대회 목록 — displayOrder 순. 각 대회의 현재 시즌 포함' })
  @ApiQuery({ name: 'locale', required: false, enum: ['ko', 'en'], description: '응답 로케일. 유효하지 않으면 조용히 기본 ko 로 폴백' })
  @ApiOkResponse({ type: CompetitionListDto })
  list(@Query('locale') localeQ?: string): Promise<CompetitionListDto> {
    return this.competitions.list(parseLocale(localeQ));
  }

  @Get(':ref')
  @ApiOperation({ summary: '대회 상세 + 시즌 목록(최신 먼저, dataState 포함)' })
  @ApiParam({ name: 'ref', example: '39-premier-league', description: '`<apiId>-<slug>` 또는 `<apiId>`' })
  @ApiQuery({ name: 'locale', required: false, enum: ['ko', 'en'] })
  @ApiOkResponse({ type: CompetitionDetailDto })
  @ApiBadRequestResponse({ description: 'ref 형식 오류' })
  @ApiNotFoundResponse({ description: '추적 대회가 아니다' })
  detail(@Param('ref') ref: string, @Query('locale') localeQ?: string): Promise<CompetitionDetailDto> {
    return this.competitions.detail(ref, parseLocale(localeQ));
  }
}
