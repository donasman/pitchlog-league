/**
 * L4 3판 — LiveFinalizerService.
 *
 * FT/AET/PEN 첫 진입 시 관측자(LiveObserverService)가 호출한다. /fixtures?ids= 응답 안에 이미 들어 있는
 * lineups · events · statistics · players 4개 배열을 각각 L3·L5 서비스의 `persist(...)` 로 저장한다.
 * 추가 API 콜 없다.
 *
 * refreshStandings(csIds) 는 tick 끝에 관측자가 부른다 — csId dedup 은 관측자 쪽에서 이미 함.
 * KNOCKOUT 대회는 순위표가 없다 (DATA_RULES 5-3) — 여기서 건너뛴다. LEAGUE_PHASE_KNOCKOUT 은 대상.
 *
 * ## 소유권
 *   · L3·L5 persist 는 `{ promote: false }` 로 부른다 — 라이브에서 아직 다른 갈래가 채워지지 않았을 수 있다.
 *     승격은 백필/스케줄러가 나중에 부른다.
 *   · standings 는 L2.collectStandings 를 그대로 재사용 — 대회당 1콜 (/standings).
 *
 * ## 실패 격리
 *   갈래별 · 대회별 try/catch — 하나가 실패해도 다른 것을 막지 않는다. counts=0 · gate='error'.
 *
 * ## teamIdByApi
 *   refreshStandings 호출당 1회 만든다 (팀 목록은 이 호출 사이에 안 바뀐다는 가정).
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CompetitionFormat } from '../../generated/prisma/client.js';
import { L3LineupsService } from '../l3/lineups.service.js';
import { L3EventsService } from '../l3/events.service.js';
import { L5TeamStatsService } from '../l5/team-stats.service.js';
import { L5PlayerStatsService } from '../l5/player-stats.service.js';
import { L2Service } from '../l2/l2.service.js';
import type {
  ApiFixtureLineupItem,
  ApiFixtureEventItem,
  ApiFixtureStatisticsItem,
  ApiFixturePlayersItem,
} from '../api-football/api-football.types.js';

export type FinalizeGate = 'ok' | 'skip' | 'error';

export interface FinalizeResult {
  lineups: FinalizeGate;
  events: FinalizeGate;
  teamStats: FinalizeGate;
  playerStats: FinalizeGate;
  counts: {
    lineups: number;
    events: number;
    teamStats: number;
    playerStats: number;
  };
}

@Injectable()
export class LiveFinalizerService {
  private readonly logger = new Logger(LiveFinalizerService.name);

  constructor(
    private readonly lineups: L3LineupsService,
    private readonly events: L3EventsService,
    private readonly teamStats: L5TeamStatsService,
    private readonly playerStats: L5PlayerStatsService,
    private readonly l2: L2Service,
    private readonly prisma: PrismaService,
  ) {}

  async onFinal(matchId: number, apiFixtureId: number, item: unknown): Promise<FinalizeResult> {
    const src = item as Record<string, unknown>;
    const lineupsItems = Array.isArray(src.lineups) ? (src.lineups as ApiFixtureLineupItem[]) : [];
    const eventsItems = Array.isArray(src.events) ? (src.events as ApiFixtureEventItem[]) : [];
    const statsItems = Array.isArray(src.statistics) ? (src.statistics as ApiFixtureStatisticsItem[]) : [];
    const playersItems = Array.isArray(src.players) ? (src.players as ApiFixturePlayersItem[]) : [];

    const result: FinalizeResult = {
      lineups: 'skip',
      events: 'skip',
      teamStats: 'skip',
      playerStats: 'skip',
      counts: { lineups: 0, events: 0, teamStats: 0, playerStats: 0 },
    };

    if (Array.isArray(src.lineups) && lineupsItems.length > 0) {
      try {
        await this.lineups.persist(matchId, apiFixtureId, lineupsItems, { promote: false });
        result.lineups = 'ok';
        result.counts.lineups = lineupsItems.length;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`live-poller finalize error · ${apiFixtureId} lineups: ${msg}`);
        result.lineups = 'error';
      }
    }

    if (Array.isArray(src.events) && eventsItems.length > 0) {
      try {
        await this.events.persist(matchId, apiFixtureId, eventsItems, { promote: false });
        result.events = 'ok';
        result.counts.events = eventsItems.length;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`live-poller finalize error · ${apiFixtureId} events: ${msg}`);
        result.events = 'error';
      }
    }

    if (Array.isArray(src.statistics) && statsItems.length > 0) {
      try {
        await this.teamStats.persist(matchId, apiFixtureId, statsItems, { promote: false });
        result.teamStats = 'ok';
        result.counts.teamStats = statsItems.length;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`live-poller finalize error · ${apiFixtureId} teamStats: ${msg}`);
        result.teamStats = 'error';
      }
    }

    if (Array.isArray(src.players) && playersItems.length > 0) {
      try {
        await this.playerStats.persist(matchId, apiFixtureId, playersItems, { promote: false });
        result.playerStats = 'ok';
        result.counts.playerStats = playersItems.length;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`live-poller finalize error · ${apiFixtureId} playerStats: ${msg}`);
        result.playerStats = 'error';
      }
    }

    return result;
  }

  /**
   * finalize 된 매치의 competition_season_id 들을 받아 순위표를 재계산한다.
   * KNOCKOUT 은 대상 아님 (DATA_RULES 5-3). LEAGUE_PHASE_KNOCKOUT 은 대상.
   * 대회 하나 실패해도 나머지는 진행.
   * @returns 대회별 upsert 행 수의 합계.
   */
  async refreshStandings(competitionSeasonIds: readonly number[]): Promise<number> {
    if (competitionSeasonIds.length === 0) return 0;

    // 이 호출당 1회 만든다 — 팀 목록은 이 호출 사이에 안 바뀐다는 가정.
    const teams = await this.prisma.team.findMany({ select: { id: true, apiTeamId: true } });
    const teamIdByApi = new Map<number, number>(teams.map((t) => [t.apiTeamId, t.id]));

    let total = 0;
    for (const csId of competitionSeasonIds) {
      try {
        const cs = await this.prisma.competitionSeason.findUnique({
          where: { id: csId },
          include: { competition: true, season: true },
        });
        if (cs === null) continue;
        if (cs.competition.format === CompetitionFormat.KNOCKOUT) continue;

        const label = `${cs.competition.name} ${cs.season.year}`;
        const n = await this.l2.collectStandings(
          csId,
          cs.competition.apiCompetitionId,
          cs.season.year,
          label,
          teamIdByApi,
        );
        this.logger.log(`live-poller standings · ${label} rows=${n}`);
        total += n;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`live-poller standings error · csId=${csId}: ${msg}`);
      }
    }
    return total;
  }
}
