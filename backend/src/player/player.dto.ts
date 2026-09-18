/**
 * 선수 응답 DTO — Swagger 스펙이 계약이다 (NEXT_STEPS 6장).
 * PlayerRefDto 는 순수 함수 playerRef() 로 만든다 — match.dto.ts:59 competitionRef 관례.
 * seasonStats 의 assists / yellowredCards 는 원문 그대로 null 을 유지한다 (DATA_RULES 3장 3상태).
 * totals.assists 는 seasonStats 중 하나라도 null 이면 null — SUM 안 한다 (측정 안 됨과 0 을 섞지 않는다).
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NamesDto, names } from '../common/names.dto.js';
import type { NameLookup } from '../common/name-lookup.js';
import { toRef } from '../common/ref.js';
import type { Player } from '../generated/prisma/client.js';
import { CompetitionRefDto, SeasonRefDto } from '../match/match.dto.js';
import { TeamSummaryDto } from '../team/team.dto.js';

export class PlayerRefDto extends NamesDto {
  @ApiProperty({ description: '공개 식별자 `<apiId>-<slug>`. 숫자만 써도 된다', example: '909-lionel-messi' })
  ref!: string;

  @ApiProperty({ description: 'API-Football player id', example: 909 })
  apiId!: number;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'API 원본 프로필 사진' })
  photoUrl!: string | null;
}

/**
 * 선수 행 → 참조 조각. names() 는 shortName 이 없으니 원본 이름 하나로 3종을 채운다.
 * `lookup` 을 넘기면 로케일 이름을 적용한다 — 넘기지 않으면 종전 동작 (원본).
 */
export function playerRef(p: Player, lookup?: NameLookup): PlayerRefDto {
  return {
    ref: toRef(p.apiPlayerId, p.name),
    apiId: p.apiPlayerId,
    ...names(p.name, null, lookup?.player(p.id)),
    photoUrl: p.photoUrl,
  };
}

export class PlayerSummaryDto extends PlayerRefDto {
  @ApiPropertyOptional({ type: String, nullable: true, example: 'Lionel Andrés' })
  firstname!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Messi' })
  lastname!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Argentina' })
  nationality!: string | null;
}

/**
 * 시즌 통계 한 줄. assists · yellowredCards 는 null 유지 (DATA_RULES 3장 3상태) —
 * "측정 안 됨" 과 "0" 을 섞지 않는다. starts = lineupsCount.
 */
export class PlayerSeasonStatDto {
  @ApiProperty({ type: CompetitionRefDto })
  competition!: CompetitionRefDto;

  @ApiProperty({ type: SeasonRefDto })
  season!: SeasonRefDto;

  @ApiProperty({ type: TeamSummaryDto })
  team!: TeamSummaryDto;

  @ApiProperty({ example: 30 })
  appearances!: number;

  @ApiProperty({ description: 'lineups_count — 선발 출전', example: 28 })
  starts!: number;

  @ApiProperty({ example: 2500 })
  minutes!: number;

  @ApiProperty({ example: 12 })
  goals!: number;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'null = 측정 안 됨 (과거 시즌은 goals.assists 커버리지가 없다)', example: 7 })
  assists!: number | null;

  @ApiProperty({ example: 4 })
  yellowCards!: number;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'null = 측정 안 됨', example: 1 })
  yellowredCards!: number | null;

  @ApiProperty({ example: 0 })
  redCards!: number;
}

/**
 * 커리어 합계. assists 는 seasonStats 중 하나라도 null 이면 null — SUM 하지 않는다.
 * (측정 안 된 시즌을 0 으로 덮어씌워 "0 개" 로 보이면 커리어가 왜곡된다)
 */
export class PlayerTotalsDto {
  @ApiProperty({ example: 300 })
  appearances!: number;

  @ApiProperty({ example: 25000 })
  minutes!: number;

  @ApiProperty({ example: 250 })
  goals!: number;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'null = 하나라도 측정 안 된 시즌이 있으면 합계도 null' })
  assists!: number | null;

  @ApiProperty({ example: 40 })
  yellowCards!: number;

  @ApiProperty({ example: 2 })
  redCards!: number;
}

/** 그 선수가 시즌에 뛴 대회 하나의 요약 (feat/statistics-per-competition · 2026-09-17) */
export class SeasonBreakdownDto {
  @ApiProperty({ type: CompetitionRefDto })
  competition!: CompetitionRefDto;

  @ApiProperty({ example: 4 })
  goals!: number;

  @ApiProperty({ example: 0 })
  assists!: number;

  @ApiProperty({ description: '출전 경기 수', example: 4 })
  apps!: number;

  @ApiProperty({ description: '출전시간 SUM (분)', example: 360 })
  minutes!: number;
}

/**
 * 그 시즌 · 그 선수가 뛴 추적 대회 전부에서 pms 합산 (feat/statistics-per-competition · 2026-09-17).
 * 랭킹 API 는 대회별로 갈렸으므로 시즌 통합 수치는 여기서만 볼 수 있다.
 * `breakdown` 은 **출전한 모든 대회**를 넣는다 — 득점 0인 대회도 포함 (출전 사실이 정보다).
 */
export class SeasonTotalsDto {
  @ApiProperty({ type: SeasonRefDto })
  season!: SeasonRefDto;

  @ApiProperty({ example: 6 })
  goals!: number;

  @ApiProperty({ example: 0 })
  assists!: number;

  @ApiProperty({ example: 6 })
  apps!: number;

  @ApiProperty({ example: 503 })
  minutes!: number;

  @ApiProperty({ example: 1 })
  yellowCards!: number;

  @ApiProperty({ example: 0 })
  redCards!: number;

  @ApiProperty({ type: [SeasonBreakdownDto], description: '출전한 모든 대회 (goals=0 대회도 포함) · displayOrder 오름차순' })
  breakdown!: SeasonBreakdownDto[];
}

export class PlayerDetailDto extends PlayerSummaryDto {
  @ApiPropertyOptional({ type: String, nullable: true, description: 'ISO 8601 날짜 `YYYY-MM-DD`', example: '1987-06-24' })
  birthDate!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Rosario' })
  birthPlace!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Argentina' })
  birthCountry!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 170 })
  heightCm!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 72 })
  weightKg!: number | null;

  @ApiPropertyOptional({ type: TeamSummaryDto, nullable: true, description: '현재 소속 (SquadEntry.validTo IS NULL). 없으면 null' })
  primaryTeam!: TeamSummaryDto | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 10 })
  jerseyNumber!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'API 원문 그대로. 화이트리스트하지 않는다 (R3)', example: 'Attacker' })
  position!: string | null;

  @ApiProperty({ type: [PlayerSeasonStatDto], description: '시즌 최신 먼저, 같은 시즌 안에서는 대회 displayOrder 오름차순' })
  seasonStats!: PlayerSeasonStatDto[];

  @ApiProperty({ type: PlayerTotalsDto })
  totals!: PlayerTotalsDto;

  @ApiPropertyOptional({ type: SeasonTotalsDto, nullable: true, description: '현재 시즌의 추적 대회 통합 (feat/statistics-per-competition 2026-09-17). 현재 시즌 pms 가 하나도 없으면 null' })
  seasonTotals!: SeasonTotalsDto | null;

  @ApiProperty({ description: '데이터 기준 시각 (ISO 8601)' })
  asOf!: string;
}
