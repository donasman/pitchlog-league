import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { TeamService } from './team.service.js';
import { TeamDetailDto, TeamListDto, TeamListQueryDto } from './team.dto.js';

@ApiTags('teams')
@Controller('teams')
export class TeamController {
  constructor(private readonly teams: TeamService) {}

  @Get()
  @ApiOperation({ summary: '대회시즌 참가팀 — competition 필수, season 생략 시 현재 시즌' })
  @ApiOkResponse({ type: TeamListDto })
  @ApiBadRequestResponse({ description: 'competition 누락 · ref 형식 오류 · season 범위 밖' })
  @ApiNotFoundResponse({ description: '추적 대회가 아니거나 그 시즌이 없다' })
  list(@Query() q: TeamListQueryDto): Promise<TeamListDto> {
    return this.teams.list(q);
  }

  @Get(':ref')
  @ApiOperation({ summary: '팀 상세 — 경기장 · 추적 대회 참가 이력' })
  @ApiParam({ name: 'ref', example: '33-manchester-united' })
  @ApiOkResponse({ type: TeamDetailDto })
  @ApiBadRequestResponse({ description: 'ref 형식 오류' })
  @ApiNotFoundResponse({ description: '팀이 없다' })
  detail(@Param('ref') ref: string): Promise<TeamDetailDto> {
    return this.teams.detail(ref);
  }
}
