/**
 * 팀 응답 DTO. 목록은 대회 필터가 필수다 — 컵 하위 라운드까지 팀이 1,888개라 전체 목록은 화면이 없다.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { NamesDto } from '../common/names.dto.js';
import { SeasonSummaryDto } from '../competition/competition.dto.js';

export class TeamListQueryDto {
  @ApiProperty({ description: '대회 ref — 필수', example: '39-premier-league' })
  @IsString()
  competition!: string;

  @ApiPropertyOptional({ description: '시즌(시작 연도). 생략하면 그 대회의 현재 시즌', example: 2026 })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  season?: number;
}

export class TeamSummaryDto extends NamesDto {
  @ApiProperty({ example: '33-manchester-united' })
  ref!: string;

  @ApiProperty({ description: 'API-Football team id', example: 33 })
  apiId!: number;

  @ApiPropertyOptional({ type: String, nullable: true, description: '3글자 코드. 컵 하위 팀은 대개 null', example: 'MUN' })
  code!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'England' })
  country!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 1878 })
  founded!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  logoUrl!: string | null;
}

export class TeamListDto {
  @ApiProperty({ description: '요청한 대회의 ref', example: '39-premier-league' })
  competitionRef!: string;

  @ApiProperty({ type: SeasonSummaryDto, description: '실제로 적용된 시즌 (생략 시 현재 시즌)' })
  season!: SeasonSummaryDto;

  @ApiProperty({ type: [TeamSummaryDto], description: '이름순' })
  items!: TeamSummaryDto[];

  @ApiProperty({ description: '데이터 기준 시각 (ISO 8601)' })
  asOf!: string;
}

export class VenueDto {
  @ApiProperty({ example: 'Old Trafford' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Manchester' })
  city!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 76212 })
  capacity!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'grass' })
  surface!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  imageUrl!: string | null;
}

export class ParticipationDto {
  @ApiProperty({ example: '39-premier-league' })
  competitionRef!: string;

  @ApiProperty({ example: 'Premier League' })
  competitionName!: string;

  @ApiProperty({ type: [Number], description: '참가한 시즌(시작 연도), 최신 먼저', example: [2026, 2025, 2024] })
  seasons!: number[];
}

export class TeamDetailDto extends TeamSummaryDto {
  @ApiPropertyOptional({ type: VenueDto, nullable: true, description: '경기장. 컵 하위 팀은 대개 null' })
  venue!: VenueDto | null;

  @ApiProperty({ type: [ParticipationDto], description: '추적 대회 참가 이력 — displayOrder 순' })
  participations!: ParticipationDto[];

  @ApiProperty({ description: '데이터 기준 시각 (ISO 8601)' })
  asOf!: string;
}
