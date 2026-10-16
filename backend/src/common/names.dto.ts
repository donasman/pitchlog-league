/**
 * 이름 3종 (BACKEND_FEATURES 2장 공통 규칙) — 프론트가 언어에 따라 고른다.
 *
 * feat/localized-names-api (2026-09-17) 이후:
 *   - `?locale=ko` (기본) 이면 `NameLookup` 이 준 override 로 `displayName` 을 채운다.
 *   - override 가 없으면 (해당 엔티티에 로케일 이름이 시드되지 않았으면) 원본으로 폴백.
 *   - `originalName` 은 항상 원본 (변경 금지 · 계약 2).
 */
import { ApiProperty } from '@nestjs/swagger';
import type { NameOverride } from './name-lookup.js';

export class NamesDto {
  @ApiProperty({ description: '표시 이름 (현재 언어). 번역이 없으면 원본', example: 'Manchester United' })
  displayName!: string;

  @ApiProperty({ description: '짧은 표시 이름 — 칩·모바일. 없으면 displayName', example: 'Man Utd' })
  shortDisplayName!: string;

  @ApiProperty({ description: '소스 원본 이름 (영어)', example: 'Manchester United' })
  originalName!: string;
}

/**
 * 이름 3종 조립.
 *   - override 없음 → 종전 동작 (displayName=original · shortDisplayName=short?.trim() ?? original).
 *   - override.name 있음 → displayName = override.name.
 *   - override.shortName 있음 → shortDisplayName = override.shortName; 없으면 원본 short → 원본 name 폴백.
 */
export function names(original: string, short?: string | null, override?: NameOverride): NamesDto {
  const displayName = override?.name ?? original;
  const shortDisplayName = override?.shortName?.trim() || short?.trim() || displayName;
  return { displayName, shortDisplayName, originalName: original };
}
