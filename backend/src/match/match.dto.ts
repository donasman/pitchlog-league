/**
 * 경기 응답 DTO — Swagger 스펙이 계약이다 (NEXT_STEPS 6장).
 * 스코어 5종은 원문 그대로(null 유지 — DATA_RULES 3장) · has_* 는 3값 그대로 · statsState 는 recheck/confirmed 배지의 유일한 소스.
 * CompetitionRefDto · SeasonRefDto · ScoreDto · RoundDto · MatchVenueDto 는 standing 도 같이 쓴다.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CompetitionFormat, CompetitionType, MatchLeg, StatsState, type Competition } from '../generated/prisma/client.js';
import { NamesDto, names } from '../common/names.dto.js';
import { toRef } from '../common/ref.js';
import { COMPETITION_BY_API_ID } from '../ingestion/l0/competitions.catalog.js';
import { SeasonSummaryDto } from '../competition/competition.dto.js';
import { TeamSummaryDto } from '../team/team.dto.js';

export class MatchListQueryDto {
  @ApiPropertyOptional({ description: '대회 ref. 생략하면 화면 6대회(리그 5 + UCL) 전부', example: '39-premier-league' })
  @IsOptional()
  @IsString()
  competition?: string;

  @ApiPropertyOptional({ description: '시즌(시작 연도). 생략하면 현재 시즌', example: 2026 })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  season?: number;

  @ApiPropertyOptional({ description: 'KST 날짜(포함) `YYYY-MM-DD` — 이 날 00:00 KST 부터', example: '2026-11-23' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'KST 날짜(포함) `YYYY-MM-DD` — 이 날 23:59:59 KST 까지', example: '2026-11-29' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: '팀 ref — 홈·원정 어느 쪽이든', example: '33-manchester-united' })
  @IsOptional()
  @IsString()
  team?: string;

  @ApiPropertyOptional({ description: '한 응답의 최대 경기 수. 기본 100, 최대 500', minimum: 1, maximum: 500, default: 100, example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class CompetitionRefDto extends NamesDto {
  @ApiProperty({ example: '39-premier-league' })
  ref!: string;

  @ApiProperty({ description: 'API-Football league id', example: 39 })
  apiId!: number;

  @ApiProperty({ enum: CompetitionType })
  type!: CompetitionType;

  @ApiProperty({ enum: CompetitionFormat, description: 'ROUND_ROBIN=순위표 · KNOCKOUT=대진표 · LEAGUE_PHASE_KNOCKOUT=둘 다' })
  format!: CompetitionFormat;
}

/** 대회 행 → 참조 조각. shortDisplayName 은 카탈로그 상수(competition.service 와 같은 방식) */
export function competitionRef(c: Competition): CompetitionRefDto {
  return {
    ref: toRef(c.apiCompetitionId, c.name),
    apiId: c.apiCompetitionId,
    ...names(c.name, COMPETITION_BY_API_ID.get(c.apiCompetitionId)?.shortName),
    type: c.type,
    format: c.format,
  };
}

export class SeasonRefDto {
  @ApiProperty({ description: 'API-Football 시즌 값 = 시작 연도', example: 2026 })
  year!: number;

  @ApiProperty({ description: '표시 라벨', example: '2026-27' })
  label!: string;
}

/** 스코어 한 쌍. 없으면 둘 다 null — 0 이 아니다 (DATA_RULES 3장) */
export class ScoreDto {
  @ApiPropertyOptional({ type: Number, nullable: true, example: 2 })
  home!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 1 })
  away!: number | null;
}

export class RoundDto {
  @ApiProperty({ description: 'API 원문', example: 'Regular Season - 12' })
  name!: string;

  @ApiProperty({ description: '시간순', example: 12 })
  ordinal!: number;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 10 })
  matchCount!: number | null;

  @ApiProperty({ description: '16강 이상(컵)' })
  isLateStage!: boolean;
}

export class MatchVenueDto {
  @ApiProperty({ example: 'Old Trafford' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Manchester' })
  city!: string | null;
}

export class MatchDto {
  @ApiProperty({ description: 'API-Football fixture id = 경기 ref', example: 1234567 })
  id!: number;

  @ApiProperty({ description: '킥오프 (ISO 8601, UTC)', example: '2026-11-22T15:00:00.000Z' })
  kickoffAt!: string;

  @ApiProperty({ description: 'API 상태 코드 원문 — NS · 1H · HT · 2H · FT · AET · PEN · PST …', example: 'FT' })
  statusShort!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Match Finished' })
  statusLong!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, description: '진행 분', example: 90 })
  elapsed!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, description: '추가 시간 분' })
  extraElapsed!: number | null;

  @ApiProperty({ enum: StatsState, description: '통계 확정 상태 — 프론트 recheck/confirmed 배지의 유일한 소스. L2 는 NONE 만 쓴다' })
  statsState!: StatsState;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'CONFIRMED 가 된 시각 (ISO 8601)' })
  confirmedAt!: string | null;

  @ApiProperty({ type: ScoreDto, description: '현재 스코어 (연장·승부차기 반영된 API goals)' })
  goals!: ScoreDto;

  @ApiProperty({ type: ScoreDto, description: '전반 종료' })
  ht!: ScoreDto;

  @ApiProperty({ type: ScoreDto, description: '후반 종료' })
  ft!: ScoreDto;

  @ApiProperty({ type: ScoreDto, description: '연장. 없었으면 null/null' })
  et!: ScoreDto;

  @ApiProperty({ type: ScoreDto, description: '승부차기. 없었으면 null/null' })
  pen!: ScoreDto;

  @ApiPropertyOptional({ type: String, nullable: true, description: '승자 팀 ref. 무승부·미종료면 null', example: '33-manchester-united' })
  winnerTeamRef!: string | null;

  @ApiProperty({ type: TeamSummaryDto })
  home!: TeamSummaryDto;

  @ApiProperty({ type: TeamSummaryDto })
  away!: TeamSummaryDto;

  @ApiProperty({ type: CompetitionRefDto })
  competition!: CompetitionRefDto;

  @ApiProperty({ type: SeasonRefDto })
  season!: SeasonRefDto;

  @ApiProperty({ type: RoundDto })
  round!: RoundDto;

  @ApiPropertyOptional({ type: MatchVenueDto, nullable: true })
  venue!: MatchVenueDto | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'M. Oliver' })
  referee!: string | null;

  @ApiPropertyOptional({ enum: MatchLeg, nullable: true, description: '녹아웃 1차전/2차전/단판. 리그는 null' })
  leg!: MatchLeg | null;

  @ApiProperty({ description: '컷오프 규칙 결과 — false 면 이벤트·라인업·통계를 받지 않는다' })
  detailEligible!: boolean;

  @ApiPropertyOptional({ type: Boolean, nullable: true, description: '3값: null=미확인 · false=확인했고 없음 · true=있음' })
  hasEvents!: boolean | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true, description: '3값: null=미확인 · false=확인했고 없음 · true=있음' })
  hasLineups!: boolean | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true, description: '3값: null=미확인 · false=확인했고 없음 · true=있음' })
  hasTeamStats!: boolean | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true, description: '3값: null=미확인 · false=확인했고 없음 · true=있음' })
  hasPlayerStats!: boolean | null;

  @ApiProperty({ description: '데이터 기준 시각 (ISO 8601)' })
  asOf!: string;
}

export class MatchListDto {
  @ApiProperty({ type: [MatchDto], description: '킥오프 오름차순. limit 만큼 앞에서 자른다' })
  items!: MatchDto[];

  @ApiProperty({ description: '필터 조건을 만족하는 전체 경기 수 (limit 적용 전)', example: 342 })
  total!: number;

  @ApiProperty({ description: 'items.length < total — 잘렸는지 여부. 프론트가 limit 을 늘려 다시 부르는 판단에 쓴다' })
  hasMore!: boolean;

  @ApiPropertyOptional({ type: SeasonSummaryDto, nullable: true, description: 'competition 지정 시 실제로 적용된 시즌. 생략 시 null' })
  season!: SeasonSummaryDto | null;

  @ApiProperty({ description: '목록 전체의 데이터 기준 시각 (ISO 8601)' })
  asOf!: string;
}

// ─────────────────────────────────────────────────────────────
// GET /api/matches/:ref/detail — 라인업 · 이벤트 · 팀 통계 · 선수 통계
// ─────────────────────────────────────────────────────────────
//
// 3-값 availability (D3):
//   ok            = has_* = true  (수집했고 있다)
//   not_provided  = has_* = false (수집했으나 없다 — API 가 안 준다)
//   not_collected = has_* = null  (아직 확인 안 함)
//
// Prisma Decimal 필드(rating · expectedGoals · goalsPrevented)는 null 유지한다 —
// 0 과 null 은 다르다 (평점 0 은 실제 평점이 아니라 "없음" 이거나 실제로 0 인 경우가 있다,
// schema.prisma player_match_stats.rating 주석). 통계도 마찬가지.

export type MatchAvailability = 'ok' | 'not_provided' | 'not_collected';

export class MatchAvailabilityDto {
  @ApiProperty({ enum: ['ok', 'not_provided', 'not_collected'], description: 'lineups 수집 상태' })
  lineups!: MatchAvailability;

  @ApiProperty({ enum: ['ok', 'not_provided', 'not_collected'], description: 'events 수집 상태' })
  events!: MatchAvailability;

  @ApiProperty({ enum: ['ok', 'not_provided', 'not_collected'], description: 'team_match_stats 수집 상태' })
  teamStats!: MatchAvailability;

  @ApiProperty({ enum: ['ok', 'not_provided', 'not_collected'], description: 'player_match_stats 수집 상태' })
  playerStats!: MatchAvailability;
}

export class CoachRefDto {
  @ApiProperty({ example: 'J. Klopp' })
  name!: string;
}

export class LineupEntryDto {
  @ApiProperty({ description: '선수 ref = `<apiPlayerId>-<slug>`', example: '186-mo-salah' })
  playerRef!: string;

  @ApiProperty({ example: 'Mohamed Salah' })
  playerName!: string;

  @ApiPropertyOptional({ type: Number, nullable: true, description: '등번호', example: 11 })
  number!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: '포지션 코드 (G·D·M·F)', example: 'F' })
  position!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: '포메이션 좌표. 벤치는 null', example: '4:2' })
  grid!: string | null;
}

export class MatchLineupDto {
  @ApiProperty({ description: '팀 ref', example: '33-manchester-united' })
  teamRef!: string;

  @ApiProperty({ example: 'Manchester United' })
  teamName!: string;

  @ApiPropertyOptional({ type: String, nullable: true, description: '포메이션', example: '4-3-3' })
  formation!: string | null;

  @ApiPropertyOptional({ type: CoachRefDto, nullable: true, description: '감독. 없으면 null' })
  coach!: CoachRefDto | null;

  @ApiProperty({ type: [LineupEntryDto], description: '선발 11명 — jerseyNumber asc' })
  startXI!: LineupEntryDto[];

  @ApiProperty({ type: [LineupEntryDto], description: '벤치 선수 — 시드 순 (id asc)' })
  bench!: LineupEntryDto[];
}

export class MatchEventDto {
  @ApiProperty({ description: '경기 내 순서 (0 부터, 오름차순). WHERE (match_id, seq) unique', example: 12 })
  seq!: number;

  @ApiProperty({ description: '경기 시각 분', example: 47 })
  minute!: number;

  @ApiPropertyOptional({ type: Number, nullable: true, description: '추가 시간 분 (있으면)', example: 3 })
  minuteExtra!: number | null;

  @ApiProperty({ description: '팀 ref', example: '33-manchester-united' })
  teamRef!: string;

  @ApiPropertyOptional({ type: String, nullable: true, description: '주 선수 ref. VAR 같이 팀 단위 이벤트는 null' })
  playerRef!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  playerName!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: '어시스트/부(補) 선수 ref' })
  assistPlayerRef!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  assistPlayerName!: string | null;

  @ApiProperty({ description: '이벤트 종류 원문 — Goal · Card · subst · Var', example: 'Goal' })
  type!: string;

  @ApiPropertyOptional({ type: String, nullable: true, description: '세부 원문 — "Normal Goal" · "Yellow Card"' })
  detail!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  comments!: string | null;
}

export class TeamStatDto {
  @ApiProperty({ description: '팀 ref', example: '33-manchester-united' })
  teamRef!: string;

  @ApiProperty({ example: 'Manchester United' })
  teamName!: string;

  @ApiProperty({ example: 5 })
  shotsOnGoal!: number;

  @ApiProperty({ example: 3 })
  shotsOffGoal!: number;

  @ApiProperty({ example: 12 })
  totalShots!: number;

  @ApiProperty({ example: 2 })
  blockedShots!: number;

  @ApiProperty({ example: 8 })
  shotsInsidebox!: number;

  @ApiProperty({ example: 4 })
  shotsOutsidebox!: number;

  @ApiProperty({ example: 11 })
  fouls!: number;

  @ApiProperty({ example: 6 })
  cornerKicks!: number;

  @ApiProperty({ example: 3 })
  offsides!: number;

  @ApiProperty({ description: '점유율 (%)', example: 58 })
  ballPossession!: number;

  @ApiProperty({ example: 2 })
  yellowCards!: number;

  @ApiProperty({ example: 0 })
  redCards!: number;

  @ApiProperty({ example: 4 })
  goalkeeperSaves!: number;

  @ApiProperty({ example: 512 })
  totalPasses!: number;

  @ApiProperty({ example: 458 })
  passesAccurate!: number;

  @ApiProperty({ description: '패스 정확도 (%)', example: 89 })
  passesPercentage!: number;

  @ApiPropertyOptional({ type: Number, nullable: true, description: '기대 득점 xG. API 가 안 주면 null (0 이 아니다)', example: 1.87 })
  expectedGoals!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, description: '골키퍼 세이브 xG. API 가 안 주면 null (0 이 아니다)', example: 0.42 })
  goalsPrevented!: number | null;
}

export class PlayerStatDto {
  @ApiProperty({ description: '선수 ref', example: '186-mo-salah' })
  playerRef!: string;

  @ApiProperty({ example: 'Mohamed Salah' })
  playerName!: string;

  @ApiProperty({ description: '팀 ref (이 경기에서 뛴 팀)', example: '40-liverpool' })
  teamRef!: string;

  @ApiProperty({ example: 90 })
  minutes!: number;

  @ApiPropertyOptional({ type: Number, nullable: true, description: '평점. null 은 없음이며 0 이 아니다 (schema.prisma 주석)', example: 8.4 })
  rating!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 11 })
  jerseyNumber!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'F' })
  position!: string | null;

  @ApiProperty({ example: false })
  isCaptain!: boolean;

  @ApiProperty({ example: false })
  isSubstitute!: boolean;

  @ApiProperty({ example: 4 })
  shotsTotal!: number;

  @ApiProperty({ example: 3 })
  shotsOn!: number;

  @ApiProperty({ example: 1 })
  goalsTotal!: number;

  @ApiProperty({ example: 0 })
  goalsConceded!: number;

  @ApiProperty({ example: 1 })
  assists!: number;

  @ApiProperty({ example: 0 })
  saves!: number;

  @ApiProperty({ example: 42 })
  passesTotal!: number;

  @ApiProperty({ example: 3 })
  passesKey!: number;

  @ApiPropertyOptional({ type: Number, nullable: true, description: '패스 정확도 (%). 패스 0회면 null (schema.prisma 주석)', example: 88 })
  passesAccuracy!: number | null;

  @ApiProperty({ example: 2 })
  tacklesTotal!: number;

  @ApiProperty({ example: 1 })
  blocks!: number;

  @ApiProperty({ example: 2 })
  interceptions!: number;

  @ApiProperty({ example: 12 })
  duelsTotal!: number;

  @ApiProperty({ example: 7 })
  duelsWon!: number;

  @ApiProperty({ example: 4 })
  dribblesAttempts!: number;

  @ApiProperty({ example: 3 })
  dribblesSuccess!: number;

  @ApiProperty({ example: 1 })
  dribblesPast!: number;

  @ApiProperty({ example: 3 })
  foulsDrawn!: number;

  @ApiProperty({ example: 1 })
  foulsCommitted!: number;

  @ApiProperty({ example: 1 })
  yellowCards!: number;

  @ApiProperty({ example: 0 })
  redCards!: number;

  @ApiProperty({ example: 1 })
  penaltyWon!: number;

  @ApiProperty({ example: 0 })
  penaltyCommitted!: number;

  @ApiProperty({ example: 1 })
  penaltyScored!: number;

  @ApiProperty({ example: 0 })
  penaltyMissed!: number;

  @ApiProperty({ example: 0 })
  penaltySaved!: number;

  @ApiProperty({ example: 0 })
  offsides!: number;
}

export class MatchFullDetailDto extends MatchDto {
  @ApiProperty({ type: MatchAvailabilityDto, description: '4갈래 3값 상태 — has_* 원본이 그대로 3값 을 만든다' })
  availability!: MatchAvailabilityDto;

  @ApiProperty({
    type: [MatchLineupDto],
    description: '팀별 라인업(최대 2개, 홈·원정 순). has_lineups 가 true 여도 배열이 비어 있을 수 있다',
  })
  lineups!: MatchLineupDto[];

  @ApiProperty({ type: [MatchEventDto], description: 'seq 오름차순' })
  events!: MatchEventDto[];

  @ApiProperty({ type: [TeamStatDto], description: '팀별 통계 (최대 2개, 홈·원정 순)' })
  teamStats!: TeamStatDto[];

  @ApiProperty({ type: [PlayerStatDto], description: '선수별 통계. 시드 순 (id asc)' })
  playerStats!: PlayerStatDto[];
}
