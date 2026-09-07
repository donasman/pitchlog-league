/**
 * probe-players — `/players` 가 대회·시즌마다 몇 페이지인지만 재는 값싼 측정 (NEXT_STEPS 8-b)
 *
 * 선수 시즌 통계(~1,800콜 추정)의 실제 예산을 모른 채 백필-1 을 켜지 않기 위한 자다.
 * `paging.total` 만 읽고 **응답 body 는 버린다.** DB 에 아무것도 쓰지 않는다 — 읽기 전용이다.
 *
 * 왜 대회당 1콜인가: `/players?league&season&page=1` 은 첫 페이지 값과 함께 전체 페이지 수를
 * 돌려준다. 17대회 현재 시즌이면 17콜, 5시즌이어도 85콜이다. 반면 실제 수집은 대회시즌당
 * 페이지 수만큼 든다 — 그 곱을 먼저 알아야 며칠짜리인지 계산이 선다.
 *
 * 컵 league id 로 이 엔드포인트가 도는지 자체가 미지수라 **한 대회가 에러여도 계속**하고
 * 그 줄에 에러 메시지를 담는다. 수집이 아니므로 `IngestionRunService.wrap` 으로 감싸지 않는다.
 *
 * 예외는 하나 — **일일 한도 소진이면 그 자리에서 멈춘다.** 재시도해도 같은 에러라
 * 계속하면 `--all-seasons` 85회를 끝까지 요청하고 같은 줄 85개를 돌려줄 뿐이다 (L2 와 같은 규칙).
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiFootballClient } from '../api-football/api-football.client.js';
import { ApiQuotaExhaustedError } from '../api-football/api-football.errors.js';
import { SEASON_YEARS } from '../l0/competitions.catalog.js';

export interface ProbeRow {
  competition: string;
  apiCompetitionId: number;
  seasonYear: number;
  /** `/players` 의 `paging.total`. null 이면 못 쟀다 (error 를 본다) */
  pages: number | null;
  error: string | null;
}

export interface ProbeResult {
  rows: ProbeRow[];
  /** 이 측정이 쓴 콜 수 */
  totalCalls: number;
  /** 일일 한도 소진으로 중간에 멈췄다 — 남은 대회는 부르지 않았다 */
  stoppedByQuota: boolean;
}

@Injectable()
export class ProbeService {
  private readonly logger = new Logger(ProbeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: ApiFootballClient,
  ) {}

  async probePlayers(opts: { allSeasons?: boolean } = {}): Promise<ProbeResult> {
    const competitions = await this.prisma.competition.findMany({
      where: { isTracked: true },
      orderBy: { displayOrder: 'asc' },
      select: {
        name: true,
        apiCompetitionId: true,
        seasons: { where: { isCurrent: true }, select: { season: { select: { year: true } } } },
      },
    });
    if (competitions.length === 0) throw new Error('추적 대회가 없다 — L0 를 먼저 돌린다');

    const callsBefore = this.api.callCount;
    const rows: ProbeRow[] = [];
    let stoppedByQuota = false;

    for (const c of competitions) {
      if (stoppedByQuota) break;
      // 현재 시즌이 없는 대회(아직 등록 전)는 카탈로그의 최신 시즌으로 잰다
      const current = c.seasons[0]?.season.year ?? SEASON_YEARS[SEASON_YEARS.length - 1];
      const years = opts.allSeasons === true ? [...SEASON_YEARS] : [current];
      for (const seasonYear of years) {
        try {
          const res = await this.api.get<unknown[]>('/players', {
            league: c.apiCompetitionId,
            season: seasonYear,
            page: 1,
          });
          rows.push({
            competition: c.name,
            apiCompetitionId: c.apiCompetitionId,
            seasonYear,
            pages: res.paging?.total ?? null,
            error: null,
          });
        } catch (err) {
          const quota = err instanceof ApiQuotaExhaustedError;
          const msg = err instanceof Error ? err.message : String(err);
          rows.push({
            competition: c.name,
            apiCompetitionId: c.apiCompetitionId,
            seasonYear,
            pages: null,
            error: quota ? `쿼터 소진으로 중단 — ${msg}` : msg,
          });
          if (quota) {
            // 재시도해도 같은 에러다. 남은 대회는 부르지 않는다
            this.logger.error(`${c.name} ${seasonYear}: API-Football 일일 한도 소진 — 남은 대회를 중단한다`);
            stoppedByQuota = true;
            break;
          }
          this.logger.warn(`${c.name} ${seasonYear}: ${msg}`);
        }
      }
    }

    const totalCalls = this.api.callCount - callsBefore;
    this.logTable(rows, totalCalls, stoppedByQuota);
    return { rows, totalCalls, stoppedByQuota };
  }

  /** 대회 · 시즌 · pages · 5시즌 추정 콜(pages × SEASON_YEARS 개수, 참고값) */
  private logTable(rows: readonly ProbeRow[], totalCalls: number, stoppedByQuota: boolean): void {
    const nameWidth = Math.max(10, ...rows.map((r) => r.competition.length));
    this.logger.log(`${'대회'.padEnd(nameWidth)}  시즌   pages  5시즌추정콜`);
    let estimate = 0;
    for (const r of rows) {
      const est = r.pages === null ? null : r.pages * SEASON_YEARS.length;
      if (est !== null) estimate += est;
      this.logger.log(
        `${r.competition.padEnd(nameWidth)}  ${r.seasonYear}  ${String(r.pages ?? '-').padStart(5)}  ${String(est ?? '-').padStart(10)}` +
          (r.error === null ? '' : `  ERR ${r.error}`),
      );
    }
    const failed = rows.filter((r) => r.error !== null).length;
    this.logger.log(
      `probe-players ${stoppedByQuota ? '중단(쿼터 소진)' : '완료'} — ${rows.length}행 · ${totalCalls}콜 · 5시즌 추정 합계 ${estimate}콜` +
        (failed > 0 ? ` · 실패 ${failed}` : ''),
    );
  }
}
