/**
 * 순위표 조회 — API 공식 순위를 그대로 낸다(자체 계산 없음, SCHEMA_DESIGN 9장).
 * 응답 조립 규칙은 standing.dto.ts 주석. 이 서비스는 DB 만 본다 — 외부 API 호출 금지 (CLAUDE.md).
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { latestOf } from '../common/as-of.js';
import { CompetitionService } from '../competition/competition.service.js';
import { competitionRef } from '../match/match.dto.js';
import { TeamService } from '../team/team.service.js';
import { screenCompetitionWhere } from '../ingestion/screen-scope.js';
import { CompetitionFormat, type Standing, type Team } from '../generated/prisma/client.js';
import type { StandingRowDto, StandingsListDto, StandingsQueryDto, StandingsTableDto } from './standing.dto.js';

type CompetitionRow = Awaited<ReturnType<CompetitionService['resolve']>>;
type SeasonRow = CompetitionRow['seasons'][number];
type StandingRow = Standing & { team: Team };

@Injectable()
export class StandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly competitions: CompetitionService,
    private readonly teams: TeamService,
  ) {}

  async list(q: StandingsQueryDto): Promise<StandingsListDto> {
    let items: StandingsTableDto[];
    if (q.competition !== undefined) {
      const comp = await this.competitions.resolve(q.competition);
      const cs = this.pickSeason(comp, q.season);
      if (!cs) throw new NotFoundException(`${q.competition} 에 ${q.season ?? '현재'} 시즌이 없다`);
      items = [await this.table(comp, cs)];
    } else {
      // 화면 6대회 전부. 시즌이 없는 대회(등록 전 컵)는 표를 내지 않는다 — 실패가 아니다
      const comps = await this.prisma.competition.findMany({
        where: screenCompetitionWhere,
        include: { seasons: { include: { season: true, backfillJob: true }, orderBy: { season: { year: 'desc' } } }, topFlight: true },
        orderBy: { displayOrder: 'asc' },
      });
      items = [];
      for (const comp of comps) {
        const cs = this.pickSeason(comp, q.season);
        if (cs) items.push(await this.table(comp, cs));
      }
    }
    return { items, asOf: latestOf(...items.map((t) => new Date(t.asOf))) };
  }

  /** season 지정 → 그 해, 생략 → 현재 → 최신 (team.service 와 같은 규칙) */
  private pickSeason(comp: CompetitionRow, year: number | undefined): SeasonRow | undefined {
    return year !== undefined ? comp.seasons.find((s) => s.season.year === year) : (comp.seasons.find((s) => s.isCurrent) ?? comp.seasons[0]);
  }

  private async table(comp: CompetitionRow, cs: SeasonRow): Promise<StandingsTableDto> {
    const base = { competition: competitionRef(comp), season: this.competitions.season(cs) };
    // 컵은 순위표가 없다 — 정상 (DATA_RULES 5-3). DB 를 보지 않는다
    if (comp.format === CompetitionFormat.KNOCKOUT) {
      return { ...base, unavailableReason: 'KNOCKOUT', rows: [], asOf: latestOf(cs.asOf) };
    }
    const rows = await this.prisma.standing.findMany({
      where: { competitionSeasonId: cs.id },
      include: { team: true },
      orderBy: [{ groupName: 'asc' }, { rank: 'asc' }],
    });
    return {
      ...base,
      unavailableReason: rows.length === 0 ? 'EMPTY' : null,
      rows: rows.map((r) => this.row(r)),
      asOf: latestOf(...rows.map((r) => r.asOf), cs.asOf),
    };
  }

  private row(r: StandingRow): StandingRowDto {
    return {
      team: this.teams.summary(r.team),
      groupName: r.groupName,
      rank: r.rank,
      points: r.points,
      played: r.played,
      win: r.win,
      draw: r.draw,
      lose: r.lose,
      goalsFor: r.goalsFor,
      goalsAgainst: r.goalsAgainst,
      goalDiff: r.goalDiff,
      home: { played: r.homePlayed, win: r.homeWin, draw: r.homeDraw, lose: r.homeLose, gf: r.homeGf, ga: r.homeGa },
      away: { played: r.awayPlayed, win: r.awayWin, draw: r.awayDraw, lose: r.awayLose, gf: r.awayGf, ga: r.awayGa },
      form: r.form,
      description: r.description,
      status: r.status,
      asOf: latestOf(r.asOf),
    };
  }
}
