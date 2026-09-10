/**
 * 경기 조회 — 목록(대회·시즌·KST 날짜·팀 필터, 페이지 없음)과 단건.
 * 응답 조립 규칙은 match.dto.ts 주석. 이 서비스는 DB 만 본다 — 외부 API 호출 금지 (CLAUDE.md).
 * has_* · statsState · leg 는 읽기만 한다 — 올리는 쪽은 L2/L5 수집이다.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { earliestOf, latestOf } from '../common/as-of.js';
import { kstDayRange } from '../common/kst-date.js';
import { parseRef, toRef } from '../common/ref.js';
import { seasonLabel } from '../common/season-label.js';
import { CompetitionService } from '../competition/competition.service.js';
import { TeamService } from '../team/team.service.js';
import { screenCompetitionWhere } from '../ingestion/screen-scope.js';
import type { Competition, CompetitionRound, CompetitionSeason, Match, Prisma, Season, Team, Venue } from '../generated/prisma/client.js';
import {
  competitionRef,
  type LineupEntryDto,
  type MatchAvailability,
  type MatchDto,
  type MatchEventDto,
  type MatchFullDetailDto,
  type MatchLineupDto,
  type MatchListDto,
  type MatchListQueryDto,
  type PlayerStatDto,
  type ScoreDto,
  type TeamStatDto,
} from './match.dto.js';

type MatchRow = Match & {
  homeTeam: Team;
  awayTeam: Team;
  venue: Venue | null;
  round: CompetitionRound;
  competitionSeason: CompetitionSeason & { competition: Competition; season: Season };
};

const MATCH_INCLUDE = {
  homeTeam: true,
  awayTeam: true,
  venue: true,
  round: true,
  competitionSeason: { include: { competition: true, season: true } },
} as const;

const score = (home: number | null, away: number | null): ScoreDto => ({ home, away });

@Injectable()
export class MatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly competitions: CompetitionService,
    private readonly teams: TeamService,
  ) {}

  async list(q: MatchListQueryDto): Promise<MatchListDto> {
    const where: Prisma.MatchWhereInput = {};
    let season: MatchListDto['season'] = null;

    if (q.competition !== undefined) {
      // 대회 지정 → 시즌을 하나로 확정한다 (team.service 와 같은 규칙)
      const comp = await this.competitions.resolve(q.competition);
      const cs =
        q.season !== undefined
          ? comp.seasons.find((s) => s.season.year === q.season)
          : (comp.seasons.find((s) => s.isCurrent) ?? comp.seasons[0]);
      if (!cs) throw new NotFoundException(`${q.competition} 에 ${q.season ?? '현재'} 시즌이 없다`);
      where.competitionSeasonId = cs.id;
      season = this.competitions.season(cs);
    } else {
      // 생략 → 화면 6대회. season 생략이면 각 대회의 현재 시즌
      where.competitionSeason = {
        competition: screenCompetitionWhere,
        ...(q.season !== undefined ? { season: { year: q.season } } : { isCurrent: true }),
      };
    }

    const range = kstDayRange(q.from, q.to);
    if (range.gte || range.lt) where.kickoffAt = range;

    if (q.team !== undefined) {
      const apiTeamId = parseRef(q.team, '팀 ref');
      const team = await this.prisma.team.findUnique({ where: { apiTeamId }, select: { id: true } });
      if (!team) throw new NotFoundException(`팀이 없다: ${q.team}`);
      where.OR = [{ homeTeamId: team.id }, { awayTeamId: team.id }];
    }

    // 페이지 상한 — 기본 100 · 최대 500 (DTO 에서 검증됨). total 은 limit 적용 전 카운트.
    // $transaction 은 Supabase pgbouncer 세션 모드에서 커넥션을 오래 잡아 (EMAXCONNSESSION) 상한을 밟는다 —
    // 조회 API 라 count 와 findMany 사이의 짧은 갭은 허용된다 (asOf 는 rows 기준).
    const limit = q.limit ?? 100;
    const [total, rows] = await Promise.all([
      this.prisma.match.count({ where }),
      this.prisma.match.findMany({
        where,
        include: MATCH_INCLUDE,
        orderBy: [{ kickoffAt: 'asc' }, { apiFixtureId: 'asc' }],
        take: limit,
      }),
    ]);
    const items = rows.map((m) => this.toDto(m));
    return {
      items,
      total,
      hasMore: total > items.length,
      season,
      asOf: latestOf(...rows.flatMap((m) => [m.asOf, m.updatedAt])),
    };
  }

  async detail(ref: string): Promise<MatchDto> {
    const apiFixtureId = parseRef(ref, '경기 ref');
    const row = await this.prisma.match.findUnique({ where: { apiFixtureId }, include: MATCH_INCLUDE });
    if (!row) throw new NotFoundException(`경기가 없다: ${ref}`);
    return this.toDto(row);
  }

  /**
   * 경기 상세 — 라인업 · 이벤트 · 팀 통계 · 선수 통계 를 한 응답에 담는다 (D3·D4·D6).
   * detail 과 같은 MatchDto 형태에 availability·lineups·events·teamStats·playerStats 를 얹는다.
   *
   * availability (D3):
   *   has_lineups/events/teamStats/playerStats 3값 을 그대로 3상태(ok/not_provided/not_collected) 로.
   *
   * Prisma Decimal (rating · expectedGoals · goalsPrevented) 는 null 유지 (D6) —
   * null 은 "없음", 0 은 실제 값이라 절대 섞지 않는다.
   *
   * 이벤트는 seq asc 로 (unique(match_id, seq) 는 이미 있고 include.orderBy 로 보장).
   * 선발/벤치 구분: LineupEntry.isStarter · jerseyNumber asc.
   */
  async fullDetail(ref: string): Promise<MatchFullDetailDto> {
    const apiFixtureId = parseRef(ref, '경기 ref');
    const row = await this.prisma.match.findUnique({
      where: { apiFixtureId },
      include: {
        ...MATCH_INCLUDE,
        lineups: { include: { coach: true } },
        lineupEntries: { include: { player: true }, orderBy: { id: 'asc' } },
        events: { include: { player: true, assist: true }, orderBy: { seq: 'asc' } },
        teamStats: true,
        playerStats: { include: { player: true } },
      },
    });
    if (!row) throw new NotFoundException(`경기가 없다: ${ref}`);

    const base = this.toDto(row);
    const home = this.teams.summary(row.homeTeam);
    const away = this.teams.summary(row.awayTeam);
    const teamRefById = new Map<number, { ref: string; name: string }>([
      [row.homeTeamId, { ref: home.ref, name: row.homeTeam.name }],
      [row.awayTeamId, { ref: away.ref, name: row.awayTeam.name }],
    ]);
    const teamRefFor = (teamId: number): { ref: string; name: string } =>
      teamRefById.get(teamId) ?? { ref: toRef(teamId, ''), name: '' };

    // ── lineups ─────────────────────────────────────────────
    // 팀별로 startXI/bench 를 lineupEntries 에서 골라 조립. 홈·원정 순.
    const lineupsByTeam = new Map<number, (typeof row.lineups)[number]>();
    for (const l of row.lineups) lineupsByTeam.set(l.teamId, l);
    const orderedTeamIds = [row.homeTeamId, row.awayTeamId];
    const lineups: MatchLineupDto[] = [];
    for (const teamId of orderedTeamIds) {
      const l = lineupsByTeam.get(teamId);
      if (!l) continue;
      const t = teamRefFor(teamId);
      const entries = row.lineupEntries.filter((e) => e.teamId === teamId);
      const toEntry = (e: (typeof row.lineupEntries)[number]): LineupEntryDto => ({
        playerRef: toRef(e.player.apiPlayerId, e.player.name),
        playerName: e.player.name,
        number: e.jerseyNumber,
        position: e.position,
        grid: e.grid,
      });
      // jerseyNumber asc — null 은 뒤로.
      const byJersey = (a: (typeof entries)[number], b: (typeof entries)[number]): number => {
        const av = a.jerseyNumber ?? Number.POSITIVE_INFINITY;
        const bv = b.jerseyNumber ?? Number.POSITIVE_INFINITY;
        return av - bv;
      };
      const startXI = entries.filter((e) => e.isStarter).sort(byJersey).map(toEntry);
      const bench = entries.filter((e) => !e.isStarter).map(toEntry); // id asc 는 include.orderBy 로 이미 보장
      lineups.push({
        teamRef: t.ref,
        teamName: t.name,
        formation: l.formation,
        coach: l.coach ? { name: l.coach.name } : null,
        startXI,
        bench,
      });
    }

    // ── events ─────────────────────────────────────────────
    const events: MatchEventDto[] = row.events.map((ev) => ({
      seq: ev.seq,
      minute: ev.minute,
      minuteExtra: ev.minuteExtra,
      teamRef: teamRefFor(ev.teamId).ref,
      playerRef: ev.player ? toRef(ev.player.apiPlayerId, ev.player.name) : null,
      playerName: ev.player ? ev.player.name : null,
      assistPlayerRef: ev.assist ? toRef(ev.assist.apiPlayerId, ev.assist.name) : null,
      assistPlayerName: ev.assist ? ev.assist.name : null,
      type: ev.type,
      detail: ev.detail,
      comments: ev.comments,
    }));

    // ── teamStats ─────────────────────────────────────────
    const teamStatsByTeam = new Map<number, (typeof row.teamStats)[number]>();
    for (const s of row.teamStats) teamStatsByTeam.set(s.teamId, s);
    const teamStats: TeamStatDto[] = [];
    for (const teamId of orderedTeamIds) {
      const s = teamStatsByTeam.get(teamId);
      if (!s) continue;
      const t = teamRefFor(teamId);
      teamStats.push({
        teamRef: t.ref,
        teamName: t.name,
        shotsOnGoal: s.shotsOnGoal,
        shotsOffGoal: s.shotsOffGoal,
        totalShots: s.totalShots,
        blockedShots: s.blockedShots,
        shotsInsidebox: s.shotsInsidebox,
        shotsOutsidebox: s.shotsOutsidebox,
        fouls: s.fouls,
        cornerKicks: s.cornerKicks,
        offsides: s.offsides,
        ballPossession: s.ballPossession,
        yellowCards: s.yellowCards,
        redCards: s.redCards,
        goalkeeperSaves: s.goalkeeperSaves,
        totalPasses: s.totalPasses,
        passesAccurate: s.passesAccurate,
        passesPercentage: s.passesPercentage,
        // Decimal? → number|null (D6: null 은 null 유지, 0 이 아니다)
        expectedGoals: s.expectedGoals === null ? null : s.expectedGoals.toNumber(),
        goalsPrevented: s.goalsPrevented === null ? null : s.goalsPrevented.toNumber(),
      });
    }

    // ── playerStats ─────────────────────────────────────────
    const playerStats: PlayerStatDto[] = row.playerStats.map((p) => ({
      playerRef: toRef(p.player.apiPlayerId, p.player.name),
      playerName: p.player.name,
      teamRef: teamRefFor(p.teamId).ref,
      minutes: p.minutes,
      // Decimal? → number|null. rating 은 D6 — null 은 없음, 0 은 실제 값
      rating: p.rating === null ? null : p.rating.toNumber(),
      jerseyNumber: p.jerseyNumber,
      position: p.position,
      isCaptain: p.isCaptain,
      isSubstitute: p.isSubstitute,
      shotsTotal: p.shotsTotal,
      shotsOn: p.shotsOn,
      goalsTotal: p.goalsTotal,
      goalsConceded: p.goalsConceded,
      assists: p.assists,
      saves: p.saves,
      passesTotal: p.passesTotal,
      passesKey: p.passesKey,
      // passesAccuracy 는 이미 Int?  — 패스 0회면 null (schema 주석)
      passesAccuracy: p.passesAccuracy,
      tacklesTotal: p.tacklesTotal,
      blocks: p.blocks,
      interceptions: p.interceptions,
      duelsTotal: p.duelsTotal,
      duelsWon: p.duelsWon,
      dribblesAttempts: p.dribblesAttempts,
      dribblesSuccess: p.dribblesSuccess,
      dribblesPast: p.dribblesPast,
      foulsDrawn: p.foulsDrawn,
      foulsCommitted: p.foulsCommitted,
      yellowCards: p.yellowCards,
      redCards: p.redCards,
      penaltyWon: p.penaltyWon,
      penaltyCommitted: p.penaltyCommitted,
      penaltyScored: p.penaltyScored,
      penaltyMissed: p.penaltyMissed,
      penaltySaved: p.penaltySaved,
      offsides: p.offsides,
    }));

    const availability: MatchFullDetailDto['availability'] = {
      lineups: toAvailability(row.hasLineups),
      events: toAvailability(row.hasEvents),
      teamStats: toAvailability(row.hasTeamStats),
      playerStats: toAvailability(row.hasPlayerStats),
    };

    // asOf — 4갈래는 자체 updatedAt 이 없다 (schema.prisma: match_lineups·lineup_entries·match_events·
    // team_match_stats·player_match_stats 는 @updatedAt 없음). 대신 match.updatedAt 을 각 갈래의
    // 갱신 시각으로 사용한다: L3·L5 서비스가 갈래를 채우면 has_* 를 갱신하며 match 도 갱신되기 때문.
    // 4갈래가 다 비어 있으면 latestOf 처럼 match.updatedAt (또는 지금 시각) 을 준다.
    const lineupsMax = row.lineups.length > 0 ? row.updatedAt : null;
    const eventsMax = row.events.length > 0 ? row.updatedAt : null;
    const teamStatsMax = row.teamStats.length > 0 ? row.updatedAt : null;
    const playerStatsMax = row.playerStats.length > 0 ? row.updatedAt : null;
    const anyPopulated = lineupsMax || eventsMax || teamStatsMax || playerStatsMax;
    const asOf = anyPopulated
      ? earliestOf(lineupsMax, eventsMax, teamStatsMax, playerStatsMax)
      : earliestOf(row.updatedAt);

    return { ...base, availability, lineups, events, teamStats, playerStats, asOf };
  }

  toDto(m: MatchRow): MatchDto {
    const home = this.teams.summary(m.homeTeam);
    const away = this.teams.summary(m.awayTeam);
    const winnerTeamRef =
      m.winnerTeamId === null ? null : m.winnerTeamId === m.homeTeamId ? home.ref : m.winnerTeamId === m.awayTeamId ? away.ref : null;
    return {
      id: m.apiFixtureId,
      kickoffAt: m.kickoffAt.toISOString(),
      statusShort: m.statusShort,
      statusLong: m.statusLong,
      elapsed: m.elapsed,
      extraElapsed: m.extraElapsed,
      statsState: m.statsState,
      confirmedAt: m.confirmedAt ? m.confirmedAt.toISOString() : null,
      goals: score(m.goalsHome, m.goalsAway),
      ht: score(m.htHome, m.htAway),
      ft: score(m.ftHome, m.ftAway),
      et: score(m.etHome, m.etAway),
      pen: score(m.penHome, m.penAway),
      winnerTeamRef,
      home,
      away,
      competition: competitionRef(m.competitionSeason.competition),
      season: { year: m.competitionSeason.season.year, label: seasonLabel(m.competitionSeason.season.year) },
      round: { name: m.round.name, ordinal: m.round.ordinal, matchCount: m.round.matchCount, isLateStage: m.round.isLateStage },
      venue: m.venue ? { name: m.venue.name, city: m.venue.city } : null,
      referee: m.referee,
      leg: m.leg,
      detailEligible: m.detailEligible,
      hasEvents: m.hasEvents,
      hasLineups: m.hasLineups,
      hasTeamStats: m.hasTeamStats,
      hasPlayerStats: m.hasPlayerStats,
      asOf: latestOf(m.asOf, m.updatedAt),
    };
  }
}

/**
 * has_* 3값 → availability 3상태 (D3).
 *   true  → 'ok'            (수집했고 있다)
 *   false → 'not_provided'  (수집했으나 없다 — API 가 안 준다)
 *   null  → 'not_collected' (아직 확인 안 함)
 */
function toAvailability(v: boolean | null): MatchAvailability {
  if (v === true) return 'ok';
  if (v === false) return 'not_provided';
  return 'not_collected';
}
