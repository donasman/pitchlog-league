/**
 * L6 — 선수 시즌 통계 · 랭킹 4종 · 팀 시즌 통계 (백필-1 의 뒤쪽, NEXT_STEPS 8-b)
 *
 * 구조는 `l2.service.ts` 를 그대로 따른다. 대회시즌 루프 · 3모드 where · 최신 시즌 역순 ·
 * `wrap` 중첩 · 쿼터 소진 break 까지 같다. 다른 것은 한 대회시즌 안에서 갈래가 셋이라는 점이다.
 *
 * ## 예산 (실측, 2026-09-07 probe)
 *   선수 통계 1,504콜 (EPL 211 · 라리가 205 · 분데스 166 · 세리에A 221 · 리그1 191 · UCL 510)
 *   랭킹        120콜 (6대회 × 5시즌 × 4종)
 *   팀 통계    ~480콜 (ROUND_ROBIN 5대회만 · 96팀 × 5시즌)
 *   합계     ≈ 2,100콜 — 하루 상한 5,700 안이다. 컵 6개(3,162콜)는 화면이 없어 범위 밖.
 *
 * ## 갈래 순서가 곧 부모-먼저다
 * 선수 통계 → 랭킹 → 팀 통계. `top_rankings.player_id` 가 NOT NULL 이고 FK 가 없으니
 * 선수를 먼저 확보해야 한다. (랭킹도 자기 선수를 upsert 하지만 순서는 지킨다.)
 *
 * ## 3중 격리
 *   ① 대회시즌 루프 try/catch — 쿼터 소진만 break
 *   ② 갈래 3개 각각 try/catch — 하나가 죽어도 나머지 둘은 돈다
 *   ③ 페이지·팀 개별 실패는 각 서비스가 모으고 계속한다
 * 어디서든 실패하면 `partial = true` 이고 CLI 가 exitCode 1 로 나간다.
 *
 * ## `backfill_jobs` 는 백필 모드에서만 쓴다
 * 일일 모드가 매일 DONE 을 왕복하면 `dataStateOf` 가 하루에도 PARTIAL 로 떨어져
 * 프론트 시즌 선택기가 깜빡이고, 그 사이 L1 락이 매일 걸린다.
 *
 * ⚠ `ingestion_runs.calls_used` 를 합산할 때는 **`competition_season_id IS NULL` 행만 센다.**
 * 이 실행은 행을 두 겹으로 남긴다 — 바깥 1행(CLI 1회 전체) + 대회시즌마다 1행. 안쪽 행은
 * 시즌별 내역이라 바깥 행과 같은 콜을 다시 적은 것이고, 다 더하면 정확히 2배가 된다 (L2 와 같다).
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { IngestionRunService } from '../ingestion-run.service.js';
import { screenCompetitionWhere } from '../screen-scope.js';
import { SEASON_YEARS } from '../l0/competitions.catalog.js';
import { ApiQuotaExhaustedError } from '../api-football/api-football.errors.js';
import { BackfillPhase, CompetitionFormat, IngestionLayer } from '../../generated/prisma/client.js';
import { BackfillJobService } from '../backfill/backfill-job.service.js';
import { PlayerSeasonStatsService, type PlayerSeasonStatsResult } from './player-season-stats.service.js';
import { RankingsService, type RankingsResult } from './rankings.service.js';
import { TeamSeasonStatsService, type TeamSeasonStatsResult } from './team-season-stats.service.js';

/** `--only` 로 갈래 하나만 돌린다. 재실행 비용이 큰 갈래를 건너뛰기 위한 것 */
export const L6_BRANCHES = ['players', 'rankings', 'teams'] as const;
export type L6Branch = (typeof L6_BRANCHES)[number];

export interface L6CompetitionResult {
  name: string;
  seasonYear: number;
  playerStats: PlayerSeasonStatsResult | null;
  rankings: RankingsResult | null;
  teamStats: TeamSeasonStatsResult | null;
  /** 갈래 단위 실패 — 하나가 죽어도 나머지는 돌았다 */
  branchErrors: string[];
  partial: boolean;
}

export interface L6Summary {
  competitions: L6CompetitionResult[];
  totals: { playerStats: number; rankings: number; teamStats: number };
  skipped: string[];
  partial?: boolean;
}

export interface L6RunOptions {
  /** `SEASON_YEARS` 5시즌 전부 — 백필-1 */
  allSeasons?: boolean;
  /** 이 시즌 하나만. `allSeasons` 보다 우선한다 */
  seasonYear?: number;
  /** 지정하면 그 갈래만 돈다 */
  only?: L6Branch;
}

@Injectable()
export class L6Service {
  private readonly logger = new Logger(L6Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runs: IngestionRunService,
    private readonly jobs: BackfillJobService,
    private readonly playerStats: PlayerSeasonStatsService,
    private readonly rankings: RankingsService,
    private readonly teamStats: TeamSeasonStatsService,
  ) {}

  async run(opts: L6RunOptions = {}): Promise<L6Summary> {
    return this.runs.wrap(IngestionLayer.L6, null, async () => {
      const summary: L6Summary = {
        competitions: [],
        totals: { playerStats: 0, rankings: 0, teamStats: 0 },
        skipped: [],
      };

      const scoped = opts.seasonYear !== undefined || opts.allSeasons === true;
      const where =
        opts.seasonYear !== undefined
          ? { competition: screenCompetitionWhere, season: { year: opts.seasonYear } }
          : opts.allSeasons === true
            ? { competition: screenCompetitionWhere, season: { year: { in: [...SEASON_YEARS] } } }
            : { isCurrent: true, competition: screenCompetitionWhere };

      const seasons = await this.prisma.competitionSeason.findMany({
        where,
        include: { competition: true, season: true },
        // 최신 시즌부터 역순 (INGESTION_STRATEGY 5-3) — 오래된 것부터 채우면 그동안 아무것도 못 보여준다
        orderBy: scoped
          ? [{ season: { year: 'desc' as const } }, { competition: { displayOrder: 'asc' as const } }]
          : { competition: { displayOrder: 'asc' as const } },
      });
      if (seasons.length === 0) {
        throw new Error(
          opts.seasonYear !== undefined
            ? `${opts.seasonYear} 시즌인 화면 대회가 없다 — L0 를 먼저 돌린다`
            : opts.allSeasons === true
              ? '화면 대회의 대회시즌이 하나도 없다 — L0 를 먼저 돌린다'
              : '현재 시즌인 화면 대회가 없다 — L0 를 먼저 돌린다',
        );
      }

      const mode = opts.seasonYear !== undefined ? `${opts.seasonYear} 시즌` : opts.allSeasons === true ? '전 시즌' : '현재 시즌';
      this.logger.log(`L6 시작 — ${mode} · 대회시즌 ${seasons.length}개${opts.only ? ` · only=${opts.only}` : ''}`);

      const teamIdByApi = await this.teamIdMap();

      for (const cs of seasons) {
        const label = `${cs.competition.name} ${cs.season.year}`;
        try {
          // 시즌마다 ingestion_runs 행을 남긴다 — 시즌별 콜 수가 백필-2 예산의 입력이다
          const r = await this.runs.wrap(IngestionLayer.L6, cs.id, () => this.collectOne(cs, teamIdByApi, scoped, opts.only));
          summary.competitions.push(r);
          summary.totals.playerStats += r.playerStats?.stats ?? 0;
          summary.totals.rankings += r.rankings?.rows ?? 0;
          summary.totals.teamStats += r.teamStats?.rows ?? 0;
          if (r.partial) summary.partial = true;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`${label} 실패 — ${msg}`);
          summary.skipped.push(`${label}: ${msg}`);
          summary.partial = true;
          // 일일 한도는 재시도해도 같은 결과다 — 남은 대회시즌을 다 실패로 쌓지 않는다
          if (err instanceof ApiQuotaExhaustedError) {
            this.logger.error('API-Football 일일 한도 소진 — 남은 대회시즌을 중단한다');
            break;
          }
        }
      }

      this.logger.log(
        `L6 완료 — 선수 통계 ${summary.totals.playerStats} · 랭킹 ${summary.totals.rankings} · 팀 통계 ${summary.totals.teamStats}` +
          (summary.skipped.length ? ` · 건너뜀 ${summary.skipped.length}` : ''),
      );
      return summary;
    });
  }

  private async teamIdMap(): Promise<Map<number, number>> {
    const teams = await this.prisma.team.findMany({ select: { id: true, apiTeamId: true } });
    return new Map(teams.map((t) => [t.apiTeamId, t.id]));
  }

  private async collectOne(
    cs: { id: number; competition: { name: string; apiCompetitionId: number; format: CompetitionFormat }; season: { year: number } },
    teamIdByApi: ReadonlyMap<number, number>,
    scoped: boolean,
    only: L6Branch | undefined,
  ): Promise<L6CompetitionResult> {
    const label = `${cs.competition.name} ${cs.season.year}`;
    // run 시작 시각 하나를 잡아 이 run 이 쓰는 모든 행이 같은 as_of 를 갖게 한다.
    // 랭킹의 유령 행 정리(`as_of <` DELETE)가 이 전제 위에 서 있다
    const runAt = new Date().toISOString();

    const result: L6CompetitionResult = {
      name: cs.competition.name,
      seasonYear: cs.season.year,
      playerStats: null,
      rankings: null,
      teamStats: null,
      branchErrors: [],
      partial: false,
    };

    const target = { id: cs.id, apiCompetitionId: cs.competition.apiCompetitionId, seasonYear: cs.season.year, label };

    // 어떤 갈래를 돌지 **begin 전에** 정한다 — 아래 trackJob 판단이 이 값에 걸려 있다
    const runPlayers = only === undefined || only === 'players';
    const runRankings = only === undefined || only === 'rankings';
    const wantsTeams = only === undefined || only === 'teams';
    const runTeams = wantsTeams && cs.competition.format === CompetitionFormat.ROUND_ROBIN;
    const attempted = [runPlayers, runRankings, runTeams].filter(Boolean).length;

    /*
     * phase 를 세울 자격 = **백필 모드 + 전 갈래 + 실제로 돌 갈래가 있음**.
     *
     * `--only` 는 부분 수집이라 자격이 없다. `--all-seasons --only=rankings` 는 120콜로 끝나는데
     * 여기서 DONE 을 세우면 선수 통계가 한 행도 없는 30개 시즌을 `dataStateOf` 가 COMPLETE 로
     * 돌려주고 프론트 시즌 선택기가 빈 시즌을 연다.
     * `attempted === 0`(예: `--only=teams` + 비 ROUND_ROBIN)은 **API 콜 한 번 없이** begin→complete 를
     * 왕복하던 자리다 — begin 조차 하지 않는다.
     */
    const trackJob = scoped && only === undefined && attempted > 0;

    // 백필 모드에서만 락을 건다 (파일 머리말). 일일 모드는 backfill_jobs 를 건드리지 않는다
    if (trackJob) await this.jobs.begin(cs.id, BackfillPhase.RANKINGS);

    try {
      // ① 선수 시즌 통계 — 가장 비싸고, 랭킹·팀 통계의 부모다
      if (runPlayers) {
        result.playerStats = await this.runBranch(result, '선수 통계', () =>
          this.playerStats.collect(target, teamIdByApi, runAt),
        );
      }
      // ② 랭킹 — player_id 가 NOT NULL 이라 선수 다음이다
      if (runRankings) {
        result.rankings = await this.runBranch(result, '랭킹', () => this.rankings.collect(target, teamIdByApi, runAt));
      }
      // ③ 팀 시즌 통계 — ROUND_ROBIN 대회만 (team-season-stats.service.ts 머리말)
      if (runTeams) {
        result.teamStats = await this.runBranch(result, '팀 통계', () => this.teamStats.collect(target, runAt));
      } else if (wantsTeams) {
        this.logger.log(`${label}: ROUND_ROBIN 이 아니라 팀 통계는 건너뛴다`);
      }

      if (result.playerStats?.partial === true) result.partial = true;
      if (result.rankings?.partial === true) result.partial = true;
      if (result.teamStats?.partial === true) result.partial = true;

      /*
       * 갈래가 **하나도 성공하지 못했으면** 이 대회시즌은 실패다 — DONE 으로 닫지 않는다.
       * 갈래 격리(runBranch)가 전부 삼켜버리면 여기까지 예외가 안 올라와 `fail()` 이 영영 안 불리고,
       * `dataStateOf` 가 아무것도 안 들어온 시즌을 COMPLETE 로 읽는다. 그걸 막는 자리다.
       * 반대로 일부만 실패한 시즌은 DONE 으로 닫는다 — DB 에 없는 팀 하나 때문에 시즌을 감추면
       * 프론트 시즌 선택기에서 영영 안 보인다 (partial 은 summary 와 exitCode 로 이미 보고된다).
       */
      if (attempted > 0 && result.branchErrors.length === attempted) {
        throw new Error(`갈래 ${attempted}개가 모두 실패했다 — ${result.branchErrors.join(' / ')}`);
      }

      // 부분 실패도 DONE 으로 닫지만 **흔적은 남긴다** — 어느 갈래가 비었는지 DB 만 보고 알 수 있어야 한다
      if (trackJob) {
        await this.jobs.complete(
          cs.id,
          result.branchErrors.length > 0 ? `부분 실패: ${result.branchErrors.join(' / ')}` : null,
        );
      }
    } catch (err) {
      // 여기서 FAILED 로 닫는 것이 L1 락을 푸는 1차 방어다 (2차는 l1.service.ts 의 STALE_LOCK_MS).
      // 프로세스가 강제 종료되면 이 catch 가 안 돌아 phase 가 RANKINGS 로 남는다
      if (trackJob) await this.jobs.fail(cs.id, err instanceof Error ? err.message : String(err));
      throw err;
    }

    this.logger.log(
      `${label}: 선수 통계 ${result.playerStats?.stats ?? '-'} · 랭킹 ${result.rankings?.rows ?? '-'} · 팀 통계 ${result.teamStats?.rows ?? '-'}` +
        (result.branchErrors.length ? ` · 갈래 실패 ${result.branchErrors.length}` : ''),
    );
    return result;
  }

  /**
   * 갈래 하나를 격리해 돌린다. 실패하면 `branchErrors` 에 남기고 null 을 돌려준다 —
   * **빈 배열이나 0 으로 위장하지 않는다.** 쿼터 소진만 위로 던져 대회시즌 루프를 끊는다.
   */
  private async runBranch<T>(result: L6CompetitionResult, name: string, fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof ApiQuotaExhaustedError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      result.branchErrors.push(`${name}: ${msg}`);
      result.partial = true;
      this.logger.warn(`${result.name} ${result.seasonYear} — ${name} 실패: ${msg}. 나머지 갈래는 계속한다`);
      return null;
    }
  }
}
