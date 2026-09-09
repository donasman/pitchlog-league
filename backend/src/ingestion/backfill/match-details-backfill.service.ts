/**
 * 백필-2 오케스트레이터 — 상세 4콜(L3 lineups·events · L5 team-stats·player-stats) 을 경기 단위로 돈다.
 *
 * 이 파일 자체는 API-Football 을 부르지 않는다. 대상 경기를 골라 L3·L5 서비스에 위임한다.
 *
 * ## 대상 SELECT
 *   `detail_eligible=true` · `detail_checked_at=null` · status ∈ {FT,AET,PEN} · kickoff < now - 24h
 *   여기에 `backfill_jobs.cursor_match_id` 뒤(id > cursor)만. cursor 는 경기 하나가 4콜을 다
 *   시도한 뒤 갱신된다 — 이 판이 죽어도 다음 판이 뒤부터.
 *
 * ## 예산 (INGESTION_STRATEGY 3-5)
 *   경기당 4콜 고정. 우리는 API 상한(Pro=7,500)보다 낮은 5,700 을 자율 상한으로 지킨다 —
 *   `effectiveLimit = min(quota.limit, DAILY_CAP_CALLS=5700)`. `remaining = effectiveLimit - used`
 *   를 4로 나눈 만큼만 잡는다. 우리 자율 상한이 API 상한보다 먼저 걸린다.
 *   중단 사유는 실제 원인을 구분한다:
 *     - `quota_exhausted`: used >= quota.limit (API 가 실제로 429 낼 상태)
 *     - `daily_cap`: used < quota.limit 이지만 used >= DAILY_CAP_CALLS (우리 자율 상한)
 *   시즌 진입 시 1회, 그리고 **매 경기 처리 앞에서** quota 를 다시 스냅숏한다 —
 *   같은 판 안에서 다른 시즌·다른 프로세스가 예산을 먹었을 수 있다.
 *
 * ## 소유권 (D18·D19·D20)
 *   여기서 matches 를 직접 갱신하지 않는다. L3·L5 가 각자의 has_* 를 세우고
 *   `promoteIfAllDetailsChecked` 가 detail_checked_at·stats_state 를 올린다.
 *   이 파일은 `backfill_jobs.cursor_match_id`·`total`·`done`·`failed`·`last_error` 만 쓴다.
 *
 * ## backfill_jobs.phase 는 읽지도 쓰지도 않는다
 *   L2·L6 백필-1 완료 표시(`dataStateOf` → 프론트 시즌 선택기)와 L1 락
 *   (`BACKFILL_IN_PROGRESS` in l1.service.ts:43) 에 공유되는 신호라 우리 소유가 아니다.
 *   상세 백필이 phase 를 DETAILS 로 세우면 며칠 도는 동안 L1 스쿼드가 잠긴다.
 *   DONE 으로 세우면 L6 가 세운 완료 표시와 구분이 안 된다.
 *   대신 skip 판정은 **대상 SELECT 자체가 한다** — detail_checked_at IS NULL 이 걸리면
 *   targets 가 0 이라 아무 API 도 안 부르고 continue.
 *   진행 지표는 `updateDetailProgress` (backfill-job.service.ts) 하나로만 쓴다.
 *
 * ## 트랜잭션
 *   여기는 트랜잭션이 없다. L3·L5 가 자체 트랜잭션을 짧게 잡는다.
 *   커서 갱신은 update 한 방 — 실패해도 다음 판이 같은 경기부터 재시도(멱등)한다.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { QuotaService } from '../api-football/quota.service.js';
import { ApiQuotaExhaustedError } from '../api-football/api-football.errors.js';
import { IngestionRunService } from '../ingestion-run.service.js';
import { BackfillJobService } from './backfill-job.service.js';
import { L3LineupsService } from '../l3/lineups.service.js';
import { L3EventsService } from '../l3/events.service.js';
import { L5TeamStatsService } from '../l5/team-stats.service.js';
import { L5PlayerStatsService } from '../l5/player-stats.service.js';
import { screenCompetitionWhere } from '../screen-scope.js';
import { IngestionLayer } from '../../generated/prisma/client.js';

export interface BackfillDetailsOptions {
  /** 없으면 화면 6대회의 현재 시즌만 */
  season?: number;
  /** 처리할 경기 수 상한. 실제 상한은 min(limit, 남은 예산/4) */
  limit?: number;
  /** true 면 대상 카운트만 계산하고 API 는 안 부른다 · job 갱신도 없음 */
  dryRun?: boolean;
}

/** 6가지 중단 사유. 시즌 단위와 전체 단위에서 같이 쓴다 */
export type BackfillStopReason =
  | 'quota_exhausted' // ApiQuotaExhaustedError 잡힘
  | 'daily_cap' // limit_day - used < 4 (quota 소진 직전)
  | 'limit_reached' // --limit 도달
  | 'no_targets' // 이 시즌에 대상 경기 없음
  | 'done' // 대상 다 처리
  | 'error'; // 예상치 못한 예외

export interface BackfillPerSeasonReport {
  competitionSeasonId: number;
  competitionName: string;
  seasonYear: number;
  /** 커서 이후 대상 경기 수 (LIMIT 미적용) */
  targeted: number;
  /** 4엔드포인트 시도가 다 끝난 경기 수 (일부 endpoint 실패 포함) */
  processed: number;
  /** 4엔드포인트 중 하나 이상 실패한 경기 수 */
  failed: number;
  stoppedReason: BackfillStopReason;
  lastError?: string;
}

export interface BackfillDetailsResult {
  perSeason: BackfillPerSeasonReport[];
  totalProcessed: number;
  totalFailed: number;
  overallStopped: BackfillStopReason;
  dryRun: boolean;
  /** IngestionRunService.wrap 이 PARTIAL 로 저장하도록 */
  partial?: boolean;
}

const PER_MATCH_CALLS = 4;
/** 우리 자율 일일 상한 (INGESTION_STRATEGY 3-5). API 상한(Pro=7500)보다 낮다 — 우리가 먼저 멈춘다 */
const DAILY_CAP_CALLS = 5_700;
const RECENT_MATCH_LOCK_MS = 24 * 60 * 60 * 1_000;
const PROGRESS_EVERY = 50;

@Injectable()
export class MatchDetailsBackfillService {
  private readonly logger = new Logger(MatchDetailsBackfillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: QuotaService,
    private readonly jobs: BackfillJobService,
    private readonly runs: IngestionRunService,
    private readonly lineups: L3LineupsService,
    private readonly events: L3EventsService,
    private readonly teamStats: L5TeamStatsService,
    private readonly playerStats: L5PlayerStatsService,
  ) {}

  async run(opts: BackfillDetailsOptions = {}): Promise<BackfillDetailsResult> {
    return this.runs.wrap(IngestionLayer.BACKFILL, null, async () => {
      const perSeason: BackfillPerSeasonReport[] = [];
      let totalProcessed = 0;
      let totalFailed = 0;
      let overallStopped: BackfillStopReason = 'done';

      const where = opts.season !== undefined
        ? { competition: screenCompetitionWhere, season: { year: opts.season } }
        : { isCurrent: true, competition: screenCompetitionWhere };

      const seasons = await this.prisma.competitionSeason.findMany({
        where,
        include: { competition: true, season: true },
        // 최신 시즌부터 (INGESTION_STRATEGY 5-3)
        orderBy: [{ season: { year: 'desc' as const } }, { competition: { displayOrder: 'asc' as const } }],
      });

      if (seasons.length === 0) {
        this.logger.warn(
          opts.season !== undefined
            ? `${opts.season} 시즌인 화면 대회가 없다 — L0 를 먼저 돌린다`
            : '현재 시즌인 화면 대회가 없다 — L0 를 먼저 돌린다',
        );
        return {
          perSeason,
          totalProcessed,
          totalFailed,
          overallStopped: 'no_targets',
          dryRun: !!opts.dryRun,
        };
      }

      const mode = opts.season !== undefined ? `${opts.season} 시즌` : '현재 시즌';
      this.logger.log(
        `backfill-details 시작 — ${mode} · 대회시즌 ${seasons.length}개` +
          (opts.limit !== undefined ? ` · --limit=${opts.limit}` : '') +
          (opts.dryRun ? ' · DRY RUN' : ''),
      );

      for (const cs of seasons) {
        const label = `${cs.competition.name} ${cs.season.year}`;

        // skip 판정은 phase 가 아니라 대상 SELECT 로 한다 —
        //   detail_checked_at IS NULL 조건이 걸려 있어 이미 다 채운 시즌은 targets 가 0 이라
        //   자연히 continue. phase 는 우리 소유가 아니라 여기서 읽지 않는다.
        // 다만 cursor 는 필요하므로 job 은 확인한다.
        const existingJob = await this.prisma.backfillJob.findUnique({
          where: { competitionSeasonId: cs.id },
        });

        // 남은 예산 계산 (dry-run 은 quota 안 부름)
        let limitForThisSeason: number;
        if (opts.dryRun) {
          limitForThisSeason = opts.limit ?? Number.MAX_SAFE_INTEGER;
        } else {
          const q = await this.quota.snapshot();
          const effectiveLimit = Math.min(q.limit, DAILY_CAP_CALLS);
          const remainingByBudget = Math.floor((effectiveLimit - q.used) / PER_MATCH_CALLS);
          if (remainingByBudget <= 0) {
            const reason: BackfillStopReason = q.used >= q.limit ? 'quota_exhausted' : 'daily_cap';
            this.logger.warn(
              `${label}: 남은 예산 부족 — ${reason} (used=${q.used}/${q.limit} · cap=${DAILY_CAP_CALLS})`,
            );
            overallStopped = reason;
            perSeason.push({
              competitionSeasonId: cs.id,
              competitionName: cs.competition.name,
              seasonYear: cs.season.year,
              targeted: 0,
              processed: 0,
              failed: 0,
              stoppedReason: reason,
            });
            break;
          }
          limitForThisSeason = opts.limit !== undefined
            ? Math.min(opts.limit - totalProcessed, remainingByBudget)
            : remainingByBudget;
          if (opts.limit !== undefined && limitForThisSeason <= 0) {
            overallStopped = 'limit_reached';
            this.logger.log(`${label}: --limit 도달 (총 ${totalProcessed}) — 남은 시즌 중단`);
            break;
          }
        }

        const cursor = existingJob?.cursorMatchId ?? 0;
        // 24시간 컷은 이 판이 도는 동안 고정한다 — 대상 SELECT 와 count 가 다른 시각을 쓰면 어긋난다
        const cutoff = new Date(Date.now() - RECENT_MATCH_LOCK_MS);
        const targetWhere = {
          competitionSeasonId: cs.id,
          detailEligible: true,
          detailCheckedAt: null,
          statusShort: { in: ['FT', 'AET', 'PEN'] },
          kickoffAt: { lt: cutoff },
          id: { gt: cursor },
        };

        // targeted 는 LIMIT 없이 count — 요약과 done/limit_reached 판정에 쓴다
        const targeted = await this.prisma.match.count({ where: targetWhere });

        const targets = await this.prisma.match.findMany({
          where: targetWhere,
          orderBy: { id: 'asc' },
          take: Math.max(0, limitForThisSeason),
          select: { id: true, apiFixtureId: true },
        });

        if (targets.length === 0) {
          // 남은 대상 없음. phase 를 건드리지 않으므로 job 도 만들지 않는다 —
          // 대상이 없으면 아무 상태도 남기지 않는 게 옳다 (다음 판이 다시 대상 SELECT 로 판정).
          this.logger.log(`${label}: 대상 없음 (targeted=${targeted})`);
          perSeason.push({
            competitionSeasonId: cs.id,
            competitionName: cs.competition.name,
            seasonYear: cs.season.year,
            targeted,
            processed: 0,
            failed: 0,
            stoppedReason: 'no_targets',
          });
          continue;
        }

        if (opts.dryRun) {
          // dry-run 은 대상만 세고 아무것도 안 건드린다
          this.logger.log(`${label}: dry-run · targeted=${targeted} take=${targets.length}`);
          perSeason.push({
            competitionSeasonId: cs.id,
            competitionName: cs.competition.name,
            seasonYear: cs.season.year,
            targeted,
            processed: 0,
            failed: 0,
            stoppedReason: 'no_targets',
          });
          continue;
        }

        // begin 호출 없음 — phase 는 우리 소유가 아니다. cursor·total·done·failed 만 쓴다.

        let processed = 0;
        let failed = 0;
        // 명시적으로 union 을 잡아둔다 — 여러 갈래에서 재할당되고 TS 가 좁혀 놓으면 아래 비교가 안 통한다
        let seasonStop: BackfillStopReason = 'done' as BackfillStopReason;
        let lastError: string | undefined;

        try {
          for (const m of targets) {
            // limit 재확인 (매 경기 앞)
            if (opts.limit !== undefined && totalProcessed + processed >= opts.limit) {
              seasonStop = 'limit_reached';
              overallStopped = 'limit_reached';
              break;
            }

            // 예산 재확인 (매 경기 앞) — 같은 판 안에서도 quota 는 계속 흘러간다.
            // 시즌 시작 스냅숏 이후에 다른 프로세스·이전 경기 처리로 quota 가 상한을 넘었을 수 있다.
            const q2 = await this.quota.snapshot();
            const effectiveLimit2 = Math.min(q2.limit, DAILY_CAP_CALLS);
            if (effectiveLimit2 - q2.used < PER_MATCH_CALLS) {
              seasonStop = q2.used >= q2.limit ? 'quota_exhausted' : 'daily_cap';
              overallStopped = seasonStop;
              this.logger.warn(
                `${label}: 매 경기 예산 재확인 부족 — ${seasonStop} (used=${q2.used}/${q2.limit} · cap=${DAILY_CAP_CALLS}) · 이 경기부터 중단`,
              );
              break;
            }

            // 이 경기의 4엔드포인트를 순차로. ApiQuotaExhaustedError 는 시즌 중단
            let anyFailed = false;
            const services: Array<{ name: string; fn: () => Promise<{ ok: boolean; reason?: string }> }> = [
              { name: 'lineups', fn: () => this.lineups.run(m.id, m.apiFixtureId) },
              { name: 'events', fn: () => this.events.run(m.id, m.apiFixtureId) },
              { name: 'teamStats', fn: () => this.teamStats.run(m.id, m.apiFixtureId) },
              { name: 'playerStats', fn: () => this.playerStats.run(m.id, m.apiFixtureId) },
            ];
            for (const s of services) {
              try {
                const r = await s.fn();
                if (!r.ok) {
                  anyFailed = true;
                  this.logger.warn(
                    `${label}: match ${m.id} · ${s.name} ok=false${r.reason ? ` (${r.reason})` : ''}`,
                  );
                }
              } catch (err) {
                if (err instanceof ApiQuotaExhaustedError) {
                  lastError = err.message;
                  throw err; // 아래 catch 로
                }
                anyFailed = true;
                lastError = err instanceof Error ? err.message : String(err);
                this.logger.warn(
                  `${label}: match ${m.id} · ${s.name} 실패 — ${lastError}`,
                );
              }
            }

            processed++;
            if (anyFailed) failed++;

            // 커서·진행 지표 갱신 — 경기 하나 시도 완료마다. 다음 판이 여기부터 이어간다.
            // phase 는 건드리지 않는다 (updateDetailProgress 규약). lastError 는 유지(undefined).
            await this.jobs.updateDetailProgress(cs.id, {
              cursorMatchId: m.id,
              total: targeted,
              done: processed,
              failed,
            });

            if (processed % PROGRESS_EVERY === 0) {
              const q2 = await this.quota.snapshot();
              this.logger.log(
                `${label}: 진행 ${processed}/${targets.length} · 실패 ${failed} · 남은 예산 ${q2.limit - q2.used}`,
              );
            }
          }

          // 정상 종료. 커서 이후 남은 대상 없이 targeted 를 다 처리했으면 done
          if (seasonStop === 'done') {
            if (processed >= targeted) {
              seasonStop = 'done';
            } else {
              // targets 를 LIMIT 만큼 잘라 왔고, 남은 targeted 가 있다 — --limit 로 잘린 것
              seasonStop = 'limit_reached';
              overallStopped = 'limit_reached';
            }
          }
        } catch (err) {
          if (err instanceof ApiQuotaExhaustedError) {
            seasonStop = 'quota_exhausted';
            overallStopped = 'quota_exhausted';
          } else {
            seasonStop = 'error';
            overallStopped = 'error';
            lastError = err instanceof Error ? err.message : String(err);
            // 상세 백필은 phase 를 안 건드린다. 오류만 lastError 에 남긴다 — 다음 판이 커서부터 이어간다.
            await this.jobs.updateDetailProgress(cs.id, {
              total: targeted,
              done: processed,
              failed,
              lastError,
            });
          }
        }

        // 정상 종료. phase 는 건드리지 않고 lastError 만 지운다 (이전 판의 흔적 청소).
        if (seasonStop === 'done') {
          await this.jobs.updateDetailProgress(cs.id, {
            total: targeted,
            done: processed,
            failed,
            lastError: null,
          });
        }

        perSeason.push({
          competitionSeasonId: cs.id,
          competitionName: cs.competition.name,
          seasonYear: cs.season.year,
          targeted,
          processed,
          failed,
          stoppedReason: seasonStop,
          lastError,
        });
        totalProcessed += processed;
        totalFailed += failed;

        this.logger.log(
          `${label} 완료 — 처리 ${processed}/${targeted} · 실패 ${failed} · stop=${seasonStop}`,
        );

        // 시즌 단위 중단 사유가 전체를 막는 것이면 남은 시즌으로 안 넘어간다
        if (
          seasonStop === 'quota_exhausted' ||
          seasonStop === 'daily_cap' ||
          seasonStop === 'limit_reached'
        ) {
          break;
        }
      }

      const partial = totalFailed > 0 || overallStopped !== 'done';
      return {
        perSeason,
        totalProcessed,
        totalFailed,
        overallStopped,
        dryRun: !!opts.dryRun,
        partial,
      };
    });
  }
}
