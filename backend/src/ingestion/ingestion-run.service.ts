/**
 * ingestion_runs 기록 — 계층별 실행을 감싼다.
 * 콜 수와 처리 시간을 남겨 오버랩 경고(INGESTION_STRATEGY 6-5)와 예산 추적의 근거로 쓴다.
 * 실패 단위를 분리한다 — 부분 성공은 PARTIAL 로 남기고 전체 성공으로 표시하지 않는다.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiFootballClient } from './api-football/api-football.client.js';
import { IngestionLayer, RunStatus } from '../generated/prisma/client.js';

export interface RunOutcome {
  status: RunStatus;
  error?: string;
}

@Injectable()
export class IngestionRunService {
  private readonly logger = new Logger(IngestionRunService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: ApiFootballClient,
  ) {}

  async wrap<T>(
    layer: IngestionLayer,
    competitionSeasonId: number | null,
    fn: () => Promise<T & { partial?: boolean }>,
  ): Promise<T> {
    const run = await this.prisma.ingestionRun.create({ data: { layer, competitionSeasonId } });
    const callsBefore = this.api.callCount;
    const started = Date.now();
    try {
      const result = await fn();
      await this.prisma.ingestionRun.update({
        where: { id: run.id },
        data: {
          status: result?.partial ? RunStatus.PARTIAL : RunStatus.SUCCEEDED,
          finishedAt: new Date(),
          callsUsed: this.api.callCount - callsBefore,
          durationMs: Date.now() - started,
        },
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.ingestionRun.update({
        where: { id: run.id },
        data: {
          status: RunStatus.FAILED,
          finishedAt: new Date(),
          callsUsed: this.api.callCount - callsBefore,
          durationMs: Date.now() - started,
          error: message.slice(0, 2000),
        },
      });
      this.logger.error(`${layer} 실패: ${message}`);
      throw err;
    }
  }
}
