/**
 * 로고 자체 저장 (NEXT_STEPS 5장)
 *
 * 왜 필요한가 — 09-07 실측:
 *   프론트가 API-Football media URL 을 직접 걸었더니 팀 목록 한 화면(96개)에서
 *   11초가 지나도 단 하나도 로드되지 않았다. 원본이 1개당 90KB 이고 media 호스트가
 *   동시 연결을 조인다. 게다가 실패가 아니라 "영원히 로딩 중" 이라 <img onError>
 *   폴백조차 걸리지 않았다. 화면에는 회색 사각형만 남았다.
 *
 * 그래서 받아서 줄여서 우리 정적 파일로 둔다. 파일이 없는 팀은 404 가 즉시 나므로
 * 이니셜 폴백이 제대로 작동한다.
 *
 * 실행:  npm run ingest -- logos        (이미 있는 파일은 건너뜀)
 *        npm run ingest -- logos --force (전부 다시 받음)
 *
 * API 키가 필요 없다 — media 호스트는 공개다.
 */
import { Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import sharp from 'sharp';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * 화면에 나오는 대회만 받는다. 컵·슈퍼컵(displayOrder 110~)은 화면이 아직 없다.
 * 프론트의 `VISIBLE_COMPETITION_API_IDS` 와 같은 범위 — 한쪽만 바뀌면 로고가 빈다.
 */
const SCREEN_DISPLAY_ORDER_MAX = 100;

/** 배지 최대 표시 크기가 56px 이므로 2배수. contain 이라 원본 비율은 유지된다 */
const SIZE_PX = 96;
const WEBP_QUALITY = 82;

/** media 호스트가 동시 연결을 조인다 — 4개씩만 */
const CONCURRENCY = 4;
const TIMEOUT_MS = 15_000;
const RETRIES = 2;

export interface LogoRunSummary {
  outputDir: string;
  competitions: { total: number; saved: number; skipped: number; failed: number };
  teams: { total: number; saved: number; skipped: number; failed: number };
  failures: string[];
  elapsedMs: number;
}

interface Target {
  kind: 'teams' | 'competitions';
  apiId: number;
  name: string;
  url: string;
}

@Injectable()
export class LogoService {
  private readonly logger = new Logger(LogoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** backend/ 기준 상대 경로. 저장소 안이라 배포 인프라(백엔드 호스팅·R2) 결정에 묶이지 않는다 */
  private outputDir(): string {
    const configured = process.env.LOGO_OUTPUT_DIR ?? '../frontend/public/logos';
    return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
  }

  async run(options: { force?: boolean } = {}): Promise<LogoRunSummary> {
    const startedAt = Date.now();
    const outputDir = this.outputDir();

    const competitions = await this.prisma.competition.findMany({
      where: { isTracked: true, displayOrder: { lte: SCREEN_DISPLAY_ORDER_MAX } },
      orderBy: { displayOrder: 'asc' },
    });

    const compTargets: Target[] = competitions
      .filter((c) => c.logoUrl)
      .map((c) => ({ kind: 'competitions', apiId: c.apiCompetitionId, name: c.name, url: c.logoUrl! }));

    // 화면에 나오는 대회의 "현재 시즌" 참가팀만. 백필로 팀이 늘면 다시 실행한다
    const entries = await this.prisma.competitionEntry.findMany({
      where: {
        competitionSeason: {
          isCurrent: true,
          competition: { isTracked: true, displayOrder: { lte: SCREEN_DISPLAY_ORDER_MAX } },
        },
      },
      include: { team: true },
    });

    const byTeam = new Map<number, Target>();
    for (const e of entries) {
      if (!e.team.logoUrl || byTeam.has(e.team.apiTeamId)) continue;
      byTeam.set(e.team.apiTeamId, {
        kind: 'teams',
        apiId: e.team.apiTeamId,
        name: e.team.name,
        url: e.team.logoUrl,
      });
    }
    const teamTargets = [...byTeam.values()];

    this.logger.log(
      `대회 ${compTargets.length} · 팀 ${teamTargets.length} → ${outputDir} (동시 ${CONCURRENCY})`,
    );

    const failures: string[] = [];
    const comp = await this.process(compTargets, outputDir, options.force ?? false, failures);
    const team = await this.process(teamTargets, outputDir, options.force ?? false, failures);

    return {
      outputDir,
      competitions: { total: compTargets.length, ...comp },
      teams: { total: teamTargets.length, ...team },
      failures,
      elapsedMs: Date.now() - startedAt,
    };
  }

  /** 동시 실행 수를 묶은 단순 워커 풀 */
  private async process(
    targets: Target[],
    outputDir: string,
    force: boolean,
    failures: string[],
  ): Promise<{ saved: number; skipped: number; failed: number }> {
    let saved = 0;
    let skipped = 0;
    let failed = 0;
    let cursor = 0;

    const worker = async (): Promise<void> => {
      for (;;) {
        const target = targets[cursor++];
        if (!target) return;

        const path = resolve(outputDir, target.kind, `${target.apiId}.webp`);
        if (!force && (await exists(path))) {
          skipped++;
          continue;
        }
        try {
          await this.download(target.url, path);
          saved++;
        } catch (cause) {
          failed++;
          const reason = cause instanceof Error ? cause.message : String(cause);
          failures.push(`${target.kind}/${target.apiId} ${target.name}: ${reason}`);
          this.logger.warn(`실패 ${target.kind}/${target.apiId} ${target.name} — ${reason}`);
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    return { saved, skipped, failed };
  }

  private async download(url: string, path: string): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      if (attempt > 0) await sleep(500 * attempt);
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const original = Buffer.from(await res.arrayBuffer());

        const webp = await sharp(original)
          .resize(SIZE_PX, SIZE_PX, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();

        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, webp);
        return;
      } catch (cause) {
        lastError = cause;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    // 없으면 받는다 — 존재 여부 판정이 전부라 따로 알릴 것이 없다
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
