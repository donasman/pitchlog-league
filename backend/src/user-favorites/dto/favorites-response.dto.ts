/**
 * GET/PUT /api/me/favorites 응답 DTO.
 *
 * FavoriteItemDto = TeamSummaryDto (src/team/team.dto.ts) 필드 + position.
 * TeamSummaryDto 상속 대신 명시적으로 필드를 다시 선언한다 — Swagger 문서가 명확해지고,
 * TeamSummaryDto 가 확장될 때 즐겨찾기 계약이 조용히 함께 확장되지 않게.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FavoriteItemDto {
  @ApiProperty({ description: '순서. 0..N-1', example: 0 })
  position!: number;

  @ApiProperty({ example: '33-manchester-united' })
  ref!: string;

  @ApiProperty({ description: 'API-Football team id', example: 33 })
  apiId!: number;

  @ApiProperty({ description: '표시 이름 (현재 언어). 번역이 없으면 원본', example: 'Manchester United' })
  displayName!: string;

  @ApiProperty({ description: '짧은 표시 이름. 없으면 displayName', example: 'Man Utd' })
  shortDisplayName!: string;

  @ApiProperty({ description: '소스 원본 이름 (영어)', example: 'Manchester United' })
  originalName!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'MUN' })
  code!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'England' })
  country!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 1878 })
  founded!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  logoUrl!: string | null;
}

export class FavoritesResponseDto {
  @ApiProperty({ description: '데이터 기준 시각 (ISO 8601)' })
  asOf!: string;

  @ApiProperty({ type: [FavoriteItemDto], description: 'position 오름차순' })
  items!: FavoriteItemDto[];
}
