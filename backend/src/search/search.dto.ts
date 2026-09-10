/**
 * 검색 응답 DTO — 팀·선수·대회 3분류. 이름 3종(NamesDto) · ref = `<apiId>-<slug>`.
 *
 * q 분기 (search.service.ts 에서 실행):
 *   · q.length >= 3  → GIN trgm ILIKE '%q%' (부분 일치)
 *   · q.length === 2 → btree lower_prefix, LOWER(col) LIKE LOWER($1) || '%'  (접두만)
 *   · q.length <= 1  → 빈 items · asOf 만 있는 200
 *
 * 정렬 (D2, 팀·선수 공통):
 *   1. 접두 일치 우선 (prefix match 는 0, 부분 매칭은 1 로 rank)
 *   2. 이름 길이 짧은 순
 *   3. 팀만 추가: 화면 6대회 참가팀 우선 (competition_entries JOIN, isTracked=true 대회)
 *
 * TeamSummaryDto 에서 founded · code · logoUrl 을 빼고 country · logoUrl 은 남긴다는 요구에 맞춰
 * SearchTeamDto 를 별도로 만든다 (기존 TeamSummaryDto 재사용 금지 — code · founded 필요 없다).
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { NamesDto } from '../common/names.dto.js';

export class SearchQueryDto {
  @ApiProperty({ description: '검색어. 1자 이하면 빈 결과. 최대 100자', example: 'man' })
  @IsString()
  @MaxLength(100)
  q!: string;

  @ApiPropertyOptional({ description: '분류당 최대 결과 수. 기본 5, 최대 20', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

/** 팀 검색 결과 — TeamSummaryDto 축약본 (founded · code 제외 · logoUrl 유지) */
export class SearchTeamDto extends NamesDto {
  @ApiProperty({ example: '33-manchester-united' })
  ref!: string;

  @ApiProperty({ description: 'API-Football team id', example: 33 })
  apiId!: number;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'England' })
  country!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  logoUrl!: string | null;
}

/** 선수 검색 결과 — PlayerRefDto 확장 (teamName = 현재 소속 팀 이름, 없으면 null) */
export class SearchPlayerDto extends NamesDto {
  @ApiProperty({ example: '909-lionel-messi' })
  ref!: string;

  @ApiProperty({ description: 'API-Football player id', example: 909 })
  apiId!: number;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'API 원본 프로필 사진' })
  photoUrl!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: '현재 소속 팀 (SquadEntry.validTo IS NULL · 최신 시즌) — 없으면 최근 출전 경기의 팀으로 폴백. squad_entries 가 놓친 선수(살라·레반도프스키 등 · 2026-09-10 실측)도 랭킹 6대회 판정과 어긋나지 않도록.', example: 'Liverpool' })
  teamName!: string | null;
}

/** 대회 검색 결과 — CompetitionSummaryDto 축약본 (currentSeason 등 제외) */
export class SearchCompetitionDto extends NamesDto {
  @ApiProperty({ example: '39-premier-league' })
  ref!: string;

  @ApiProperty({ description: 'API-Football league id', example: 39 })
  apiId!: number;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'England' })
  country!: string | null;
}

export class SearchResultsDto {
  @ApiProperty({ description: '원본 검색어', example: 'man' })
  q!: string;

  @ApiProperty({ type: [SearchTeamDto] })
  teams!: SearchTeamDto[];

  @ApiProperty({ type: [SearchPlayerDto] })
  players!: SearchPlayerDto[];

  @ApiProperty({ type: [SearchCompetitionDto] })
  competitions!: SearchCompetitionDto[];

  @ApiProperty({ description: '데이터 기준 시각 (ISO 8601). 결과 비어도 값 있음' })
  asOf!: string;
}
