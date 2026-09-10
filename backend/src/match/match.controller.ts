import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { MatchService } from './match.service.js';
import { MatchDto, MatchFullDetailDto, MatchListDto, MatchListQueryDto } from './match.dto.js';

@ApiTags('matches')
@Controller('matches')
export class MatchController {
  constructor(private readonly matches: MatchService) {}

  @Get()
  @ApiOperation({ summary: '경기 목록 — competition 생략 시 화면 6대회 · season 생략 시 현재 시즌 · from/to 는 KST 날짜(포함). 페이지 없음, 킥오프 오름차순' })
  @ApiOkResponse({ type: MatchListDto })
  @ApiBadRequestResponse({ description: 'ref 형식 오류 · season 범위 밖 · from/to 형식 오류 또는 역순 · 모르는 파라미터' })
  @ApiNotFoundResponse({ description: '추적 대회가 아니거나 그 시즌이 없다 · 팀이 없다' })
  list(@Query() q: MatchListQueryDto): Promise<MatchListDto> {
    return this.matches.list(q);
  }

  @Get(':ref')
  @ApiOperation({ summary: '경기 단건 — 스코어 5종 · 상태 원문 · statsState. 이벤트·라인업·통계는 아직 없다' })
  @ApiParam({ name: 'ref', example: '1234567', description: 'API-Football fixture id. `<id>-<slug>` 도 받는다' })
  @ApiOkResponse({ type: MatchDto })
  @ApiBadRequestResponse({ description: 'ref 형식 오류' })
  @ApiNotFoundResponse({ description: '경기가 없다' })
  detail(@Param('ref') ref: string): Promise<MatchDto> {
    return this.matches.detail(ref);
  }

  // 정적 세그먼트 'detail' 이 파라미터 ':ref' 뒤에 온다 — Nest 는 등록 순서 그대로 매칭한다.
  // ':ref/detail' 은 ':ref' 보다 더 구체적인 패턴이므로 GET /api/matches/123 은 detail 로,
  // GET /api/matches/123/detail 은 fullDetail 로 라우팅된다.
  @Get(':ref/detail')
  @ApiOperation({ summary: '경기 상세 (라인업·이벤트·팀 통계·선수 통계). MatchDto 위에 availability 3값 · 4갈래 배열이 얹혀 나온다' })
  @ApiParam({ name: 'ref', example: '1234567', description: 'API-Football fixture id. `<id>-<slug>` 도 받는다' })
  @ApiOkResponse({ type: MatchFullDetailDto })
  @ApiBadRequestResponse({ description: 'ref 형식 오류' })
  @ApiNotFoundResponse({ description: '경기가 없다' })
  fullDetail(@Param('ref') ref: string): Promise<MatchFullDetailDto> {
    return this.matches.fullDetail(ref);
  }
}
