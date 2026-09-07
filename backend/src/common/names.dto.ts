/**
 * 이름 3종 (BACKEND_FEATURES 2장 공통 규칙) — 프론트가 언어에 따라 고른다.
 * localized_names 적재 전까지는 셋 다 원본에서 나온다. 적재 후 displayName 만 바뀐다.
 */
import { ApiProperty } from '@nestjs/swagger';

export class NamesDto {
  @ApiProperty({ description: '표시 이름 (현재 언어). 번역이 없으면 원본', example: 'Manchester United' })
  displayName!: string;

  @ApiProperty({ description: '짧은 표시 이름 — 칩·모바일. 없으면 displayName', example: 'Man Utd' })
  shortDisplayName!: string;

  @ApiProperty({ description: '소스 원본 이름 (영어)', example: 'Manchester United' })
  originalName!: string;
}

export function names(original: string, short?: string | null): NamesDto {
  return { displayName: original, shortDisplayName: short?.trim() || original, originalName: original };
}
