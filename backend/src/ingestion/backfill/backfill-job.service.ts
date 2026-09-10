/**
 * `backfill_jobs` writer — **처음 만든다.** 지금까지 이 테이블은 읽기만 있었다
 * (L1 의 락 · `dataStateOf`). 쓰는 쪽이 없어 phase 가 영원히 PENDING 이었다.
 *
 * ## 지금은 L6 만 쓴다
 * L2 는 이번 범위 밖이다 (백필-2 몫). `cursor_match_id` · `done` · `failed` · `total` 도
 * 백필-2 가 경기 상세를 돌 때 쓴다 — 여기서 건드리지 않는다.
 *
 * ## ⚠ `RANKINGS` 라는 이름이 내용과 안 맞는다
 * L6 가 담는 것은 시즌 집계 3종(선수 통계 · 랭킹 · 팀 통계)이지 랭킹만이 아니다.
 * 그래도 **enum 을 바꾸지 않는다** — 이름을 고치면 마이그레이션 + `l1.service.ts` 의
 * `BACKFILL_IN_PROGRESS` 상수 수정이 따라오는데 얻는 것은 이름뿐이다. 여기 주석으로 못박는다.
 *
 * ## 왜 백필-1 끝에 DONE 을 세우나
 * `dataStateOf` 가 `DONE → COMPLETE` 이고 프론트 시즌 선택기가 그 값을 본다.
 * 백필-2 는 6일 뒤다 — 그때까지 과거 시즌을 감추면 이 단계를 하는 이유가 사라진다.
 * 백필-2 는 `DETAILS` 로 **되돌리지 않는다**.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BackfillPhase } from '../../generated/prisma/client.js';

@Injectable()
export class BackfillJobService {
  private readonly logger = new Logger(BackfillJobService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 이 대회시즌의 백필을 이 단계에서 시작한다.
   * `started_at` 은 **최초 생성에만** 넣는다 — 재실행이 처음 시작 시각을 지우면
   * "얼마나 오래 걸렸나" 를 잃는다. `last_error` 는 지운다(재시도의 뜻).
   */
  async begin(competitionSeasonId: number, phase: BackfillPhase): Promise<void> {
    await this.prisma.backfillJob.upsert({
      where: { competitionSeasonId },
      create: { competitionSeasonId, phase, startedAt: new Date(), lastError: null },
      update: { phase, lastError: null },
    });
  }

  /** 다음 단계로. 행이 없으면 만든다 — begin 없이 불려도 락이 비지 않게 */
  async advance(competitionSeasonId: number, phase: BackfillPhase): Promise<void> {
    await this.prisma.backfillJob.upsert({
      where: { competitionSeasonId },
      create: { competitionSeasonId, phase, startedAt: new Date(), lastError: null },
      update: { phase },
    });
  }

  /**
   * 백필-1 완료. `dataStateOf` 가 COMPLETE 로 읽고 L1 락이 풀린다.
   *
   * `lastError` 로 **부분 실패의 흔적**을 남긴다. 갈래 하나가 통째로 실패해도 나머지가 들어왔으면
   * phase 는 DONE 이 맞다(시즌을 감추면 프론트 선택기에서 영영 안 보인다). 그러나 아무 기록도
   * 안 남기면 "무엇이 비었나" 를 DB 만 보고는 알 수 없다 — 로그는 사라지고 이 행은 남는다.
   * 성공적으로 다 받았으면 null 을 넘겨 이전 run 의 메시지를 지운다.
   */
  async complete(competitionSeasonId: number, lastError: string | null = null): Promise<void> {
    const message = lastError === null ? null : lastError.slice(0, 2000);
    await this.prisma.backfillJob.upsert({
      where: { competitionSeasonId },
      create: { competitionSeasonId, phase: BackfillPhase.DONE, startedAt: new Date(), lastError: message },
      update: { phase: BackfillPhase.DONE, lastError: message },
    });
  }

  /**
   * 실패로 닫는다. **락을 푸는 쪽이 이것이다** — FAILED 는 `BACKFILL_IN_PROGRESS` 에 없다.
   * 여기서 던지면 L1 이 그 대회시즌의 팀을 영원히 건너뛰므로, 호출자의 catch 안에서만 부른다.
   */
  async fail(competitionSeasonId: number, message: string): Promise<void> {
    const lastError = message.slice(0, 2000);
    await this.prisma.backfillJob.upsert({
      where: { competitionSeasonId },
      create: { competitionSeasonId, phase: BackfillPhase.FAILED, startedAt: new Date(), lastError },
      update: { phase: BackfillPhase.FAILED, lastError },
    });
    this.logger.warn(`백필 실패 기록 — 대회시즌 ${competitionSeasonId}: ${lastError}`);
  }

  /**
   * L3·L5 상세 백필 전용 진행 지표 갱신. **phase 는 건드리지 않는다.**
   *
   * 왜 상세 백필이 phase 를 안 쓰나:
   *   - `dataStateOf(job)` 가 phase 를 읽어 대회 API 의 dataState 로 나간다. 프론트 시즌 선택기가
   *     그 값을 본다. L6 가 백필-1 끝에 DONE 을 세우는데 상세 백필이 DETAILS/DONE 으로 덮으면
   *     이미 완료된 백필-1 표시가 사라진다.
   *   - `l1.service.ts` 의 `BACKFILL_IN_PROGRESS` 가 DETAILS 를 포함해 그 대회시즌 팀 스쿼드를
   *     잠근다. 상세 백필이 며칠 도는 동안 L1 이 영원히 멈춘다.
   *   phase 는 L2·L6 백필-1 · L1 락과 공유되는 신호라 우리 소유가 아니다.
   *   상세 백필은 cursor·total·done·failed·lastError 만 쓴다.
   *
   * `lastError` 규약: `undefined` = 그대로 유지 · `null` = 지움 · 문자열 = 2000자로 자름.
   * job 이 없으면 create 하되 phase 는 default(PENDING) 로 명시. 있으면 update 만 (phase 미포함).
   */
  async updateDetailProgress(
    competitionSeasonId: number,
    progress: {
      cursorMatchId?: number;
      total?: number;
      done?: number;
      failed?: number;
      lastError?: string | null;
    },
  ): Promise<void> {
    const { cursorMatchId, total, done, failed, lastError } = progress;

    const existing = await this.prisma.backfillJob.findUnique({
      where: { competitionSeasonId },
      select: { id: true },
    });

    const normalizedLastError =
      lastError === undefined ? undefined : lastError === null ? null : lastError.slice(0, 2000);

    if (!existing) {
      // 최초 생성 — phase 는 default(PENDING) 명시. 상세 백필은 이후에도 phase 를 건드리지 않는다.
      await this.prisma.backfillJob.create({
        data: {
          competitionSeasonId,
          phase: BackfillPhase.PENDING,
          startedAt: new Date(),
          cursorMatchId: cursorMatchId ?? null,
          total: total ?? 0,
          done: done ?? 0,
          failed: failed ?? 0,
          lastError: normalizedLastError ?? null,
        },
      });
      return;
    }

    // update — 인자로 준 필드만. phase 는 절대 포함하지 않는다.
    const data: {
      cursorMatchId?: number;
      total?: number;
      done?: number;
      failed?: number;
      lastError?: string | null;
    } = {};
    if (cursorMatchId !== undefined) data.cursorMatchId = cursorMatchId;
    if (total !== undefined) data.total = total;
    if (done !== undefined) data.done = done;
    if (failed !== undefined) data.failed = failed;
    if (normalizedLastError !== undefined) data.lastError = normalizedLastError;
    if (Object.keys(data).length === 0) return;

    await this.prisma.backfillJob.update({
      where: { competitionSeasonId },
      data,
    });
  }
}
