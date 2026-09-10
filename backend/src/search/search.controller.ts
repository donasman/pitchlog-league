import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service.js';
import { SearchQueryDto, SearchResultsDto } from './search.dto.js';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @ApiOperation({
    summary: '통합 검색 — 팀·선수·대회. q 1자 이하는 빈 결과 200, 2자 접두 매칭, 3자 이상 부분 매칭',
  })
  @ApiOkResponse({ type: SearchResultsDto })
  @ApiBadRequestResponse({ description: 'q 누락 · 100자 초과 · limit 범위 밖 · 알 수 없는 필드' })
  query(@Query() q: SearchQueryDto): Promise<SearchResultsDto> {
    return this.search.search(q);
  }
}
