/**
 * 대회 응답 DTO — Swagger 스펙이 계약이다 (NEXT_STEPS 6장). 별도 문서를 쓰지 않는다.
 * 공통 규칙: asOf 필수(C-1) · 이름 3종 · ref = `<apiId>-<slug>` · 대회시즌엔 dataState.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompetitionFormat, CompetitionType, SeasonStatus } from '../generated/prisma/client.js';
import { NamesDto } from '../common/names.dto.js';
import { DATA_STATES, type DataState } from '../common/data-state.js';

export class SeasonSummaryDto {
  @ApiProperty({ description: 'API-Football 시즌 값 = 시작 연도', example: 2026 })
  year!: number;

  @ApiProperty({ description: '표시 라벨', example: '2026-27' })
  label!: string;

  @ApiProperty({ enum: SeasonStatus, description: '시즌 진행 상태 — 우리가 받았는지와 무관' })
  status!: SeasonStatus;

  @ApiProperty({ description: '대회의 현재 시즌인가 (대회당 하나)' })
  isCurrent!: boolean;

  @ApiProperty({
    enum: DATA_STATES,
    description: '데이터 완성도. NONE=아직 안 받음 · PARTIAL=백필 중/일부 · COMPLETE=백필 완료. 프론트 시즌 선택기는 COMPLETE 만 노출',
  })
  dataState!: DataState;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-08-21' })
  startDate!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2027-05-30' })
  endDate!: string | null;
}

export class CompetitionSummaryDto extends NamesDto {
  @ApiProperty({ description: '공개 식별자 `<apiId>-<slug>`. 숫자만 써도 된다', example: '39-premier-league' })
  ref!: string;

  @ApiProperty({ description: 'API-Football league id', example: 39 })
  apiId!: number;

  @ApiProperty({ example: 'England' })
  country!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'GB-ENG' })
  countryCode!: string | null;

  @ApiProperty({ enum: CompetitionType })
  type!: CompetitionType;

  @ApiProperty({ enum: CompetitionFormat, description: 'ROUND_ROBIN=순위표 · KNOCKOUT=대진표 · LEAGUE_PHASE_KNOCKOUT=둘 다' })
  format!: CompetitionFormat;

  @ApiPropertyOptional({ type: String, nullable: true })
  logoUrl!: string | null;

  @ApiProperty({ description: '목록 정렬 순서 (리그 → 컵 → 슈퍼컵)' })
  displayOrder!: number;

  @ApiPropertyOptional({ type: SeasonSummaryDto, nullable: true, description: '현재 시즌. 등록 전 컵이면 null' })
  currentSeason!: SeasonSummaryDto | null;
}

export class CompetitionListDto {
  @ApiProperty({ type: [CompetitionSummaryDto] })
  items!: CompetitionSummaryDto[];

  @ApiProperty({ description: '목록 전체의 데이터 기준 시각 (ISO 8601)' })
  asOf!: string;
}

export class CompetitionDetailDto extends CompetitionSummaryDto {
  @ApiProperty({ type: [SeasonSummaryDto], description: '수집 대상 시즌 전부, 최신 먼저' })
  seasons!: SeasonSummaryDto[];

  @ApiPropertyOptional({ type: String, nullable: true, description: '컵이면 그 나라 1부 리그의 ref — 컷오프 판정 근거', example: '39-premier-league' })
  topFlightRef!: string | null;

  @ApiProperty({ description: '데이터 기준 시각 (ISO 8601)' })
  asOf!: string;
}
