/**
 * L1 — 스쿼드 스냅샷 + diff (BACKEND_FEATURES #7·#8, Phase 1 관문)
 *
 * `/players/squads?team=` 는 season 파라미터가 없다. 지금 명단만 준다.
 * 이력은 우리가 만든다 — 판정은 `squad-diff.ts` 가, 수집·쓰기는 여기가 한다.
 *
 * ## 두 단계로 나눈 이유
 * 팀별로 즉시 쓰면 A→B 이적에서 partial unique 가 터진다. 전 팀 스냅샷을 모은 뒤
 * 한 번에 판정하고, remove → close → update → open 순서로 한 트랜잭션에 쓴다.
 *
 * ## 가드 — 조용히 망가지지 않게 (v1 회고)
 * API 가 빈 배열이나 반쪽 명단을 주면 diff 는 그것을 "전원 방출" 로 읽는다.
 * 빈 응답과 급감(직전 명단의 절반 이하)은 그 팀을 통째로 건너뛴다.
 * 실제 대량 방출이면 다음 주에 반영된다 — 하루 늦는 대가로 오탐을 막는다.
 *
 * ## 백필 락 (SCHEMA_DESIGN 충돌 ③)
 * 백필이 현재 시즌 스쿼드를 넣는 동안 diff 가 돌면 이중 이력이 생긴다.
 * `backfill_jobs.phase` 가 진행 중인 대회시즌의 팀은 건너뛴다.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApiFootballClient } from '../api-football/api-football.client.js';
import { IngestionRunService } from '../ingestion-run.service.js';
import { batchUpsert } from '../../prisma/batch-upsert.js';
import { screenCompetitionWhere } from '../screen-scope.js';
import { BackfillPhase, IngestionLayer, Prisma } from '../../generated/prisma/client.js';
import type { ApiSquad } from '../api-football/api-football.types.js';
import { diffSquads, type OpenEntry, type TeamSnapshot } from './squad-diff.js';

/** 직전 명단 대비 이 비율 밑으로 줄면 API 이상으로 보고 건너뛴다 */
const MIN_SQUAD_RATIO = 0.5;

/**
 * 락이 이보다 오래되면 죽은 프로세스가 남긴 것으로 본다 (2026-09-08).
 *
 * L6 가 프로세스 강제 종료로 죽으면 `phase` 가 RANKINGS 로 남아 L1 이 그 대회시즌의 팀을
 * **영원히** 건너뛴다. L6 catch 의 `fail()` 이 1차 방어이고 이것이 2차다.
 * 6시간은 백필-1 전체보다 길고 백필-2 한 사이클보다 길다 — 정상 백필을 끊지 않는다.
 */
const STALE_LOCK_MS = 6 * 60 * 60 * 1000;

/** 백필이 이 단계에 있으면 그 대회시즌의 팀은 건드리지 않는다 */
const BACKFILL_IN_PROGRESS: BackfillPhase[] = [
  BackfillPhase.L0,
  BackfillPhase.FIXTURES,
  BackfillPhase.DETAILS,
  BackfillPhase.RANKINGS,
];

export interface L1Summary {
  seasonYear: number;
  today: string;
  teams: { target: number; covered: number; skippedEmpty: number; skippedShrunk: number; skippedBackfill: number; failed: number };
  players: number;
  counts: ReturnType<typeof diffSquads>['counts'];
  ambiguous: number[];
  skipped: string[];
  partial?: boolean;
}

/** 수집일은 한국 날짜 기준 — 화면·문서가 KST 로 말한다 */
export function todayInKst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(now);
}

/** @db.Date 는 UTC 자정으로 돌아온다 — 저장된 날짜 그대로 문자열화 */
function dateToYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class L1Service {
  private readonly logger = new Logger(L1Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: ApiFootballClient,
    private readonly runs: IngestionRunService,
  ) {}

  async run(): Promise<L1Summary> {
    return this.runs.wrap(IngestionLayer.L1, null, async () => {
      const today = todayInKst();
      const seasonYear = await this.currentSeasonYear();

      const targets = await this.targetTeams();
      const locked = await this.lockedCompetitionSeasonIds();

      const summary: L1Summary = {
        seasonYear,
        today,
        teams: { target: targets.length, covered: 0, skippedEmpty: 0, skippedShrunk: 0, skippedBackfill: 0, failed: 0 },
        players: 0,
        counts: { arrived: 0, left: 0, moved: 0, changed: 0, unchanged: 0, sameDayFixed: 0 },
        ambiguous: [],
        skipped: [],
      };

      // 열린 소속을 먼저 읽는다 — 급감 가드의 기준이자 diff 의 입력이다
      const openRows = await this.prisma.squadEntry.findMany({
        where: { seasonYear, validTo: null },
        select: { id: true, playerId: true, teamId: true, jerseyNumber: true, position: true, validFrom: true },
      });
      const openEntries: OpenEntry[] = openRows.map((r) => ({
        id: r.id,
        playerId: r.playerId,
        teamId: r.teamId,
        jerseyNumber: r.jerseyNumber,
        position: r.position,
        validFrom: dateToYmd(r.validFrom),
      }));
      const openCountByTeam = new Map<number, number>();
      for (const e of openEntries) openCountByTeam.set(e.teamId, (openCountByTeam.get(e.teamId) ?? 0) + 1);

      // 1단계 — 수집. 아직 아무것도 쓰지 않는다
      const raw: { teamId: number; apiTeamId: number; players: ApiSquad['players'] }[] = [];
      const coveredTeamIds = new Set<number>();

      for (const t of targets) {
        if (t.competitionSeasonIds.some((id) => locked.has(id))) {
          summary.teams.skippedBackfill++;
          summary.skipped.push(`${t.name}: 백필 진행 중`);
          continue;
        }
        let players: ApiSquad['players'];
        try {
          const { response } = await this.api.get<ApiSquad[]>('/players/squads', { team: t.apiTeamId });
          players = response[0]?.players ?? [];
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          summary.teams.failed++;
          summary.skipped.push(`${t.name}: ${msg}`);
          summary.partial = true;
          continue;
        }

        const before = openCountByTeam.get(t.teamId) ?? 0;
        if (players.length === 0) {
          summary.teams.skippedEmpty++;
          summary.skipped.push(`${t.name}: 스쿼드 0명 — 건너뜀`);
          summary.partial = true;
          continue;
        }
        if (before > 0 && players.length < before * MIN_SQUAD_RATIO) {
          summary.teams.skippedShrunk++;
          summary.skipped.push(`${t.name}: ${before}명 → ${players.length}명 급감 — 건너뜀`);
          summary.partial = true;
          continue;
        }

        raw.push({ teamId: t.teamId, apiTeamId: t.apiTeamId, players });
        coveredTeamIds.add(t.teamId);
        summary.teams.covered++;
      }

      if (raw.length === 0) {
        this.logger.warn('L1: 관측한 팀이 없다 — 아무것도 쓰지 않는다');
        return summary;
      }

      // 2단계 — 선수 확보 → 판정 → 쓰기
      const playerIdByApi = await this.upsertPlayers(raw);
      summary.players = playerIdByApi.size;

      const snapshots: TeamSnapshot[] = raw.map((r) => ({
        teamId: r.teamId,
        players: r.players
          .map((p) => ({
            playerId: playerIdByApi.get(p.id),
            jerseyNumber: p.number ?? null,
            position: p.position ?? null,
          }))
          .filter((p): p is { playerId: number; jerseyNumber: number | null; position: string | null } => p.playerId !== undefined),
      }));

      const diff = diffSquads({ today, snapshots, openEntries, coveredTeamIds });
      summary.counts = diff.counts;
      summary.ambiguous = diff.ambiguous;
      if (diff.ambiguous.length > 0) {
        this.logger.warn(`두 팀에 동시에 있는 선수 ${diff.ambiguous.length}명 — 판정 보류`);
        summary.partial = true;
      }

      await this.applyDiff(diff, seasonYear, today);

      this.logger.log(
        `L1 완료 — 팀 ${summary.teams.covered}/${summary.teams.target} · 선수 ${summary.players} · ` +
          `신규 ${diff.counts.arrived} · 이적 ${diff.counts.moved} · 방출 ${diff.counts.left} · ` +
          `변경 ${diff.counts.changed} · 무변화 ${diff.counts.unchanged}` +
          (summary.skipped.length ? ` · 건너뜀 ${summary.skipped.length}` : ''),
      );
      return summary;
    });
  }

  /**
   * 전역 현재 시즌 연도 하나로 통일한다.
   * 컵은 시즌 등록이 리그보다 늦어(DATA_RULES 5-4) 대회별로 다른 값을 쓰면
   * 한 선수에게 열린 행이 둘 생긴다 — 인덱스는 통과하지만 의미가 깨진다.
   */
  private async currentSeasonYear(): Promise<number> {
    const rows = await this.prisma.competitionSeason.findMany({
      where: { isCurrent: true, competition: screenCompetitionWhere },
      select: { season: { select: { year: true } } },
    });
    if (rows.length === 0) throw new Error('현재 시즌인 화면 대회가 없다 — L0 를 먼저 돌린다');
    return Math.max(...rows.map((r) => r.season.year));
  }

  /** 화면에 나오는 대회의 현재 시즌 참가팀. 대회가 겹쳐도 팀은 하나로 */
  private async targetTeams(): Promise<{ teamId: number; apiTeamId: number; name: string; competitionSeasonIds: number[] }[]> {
    const entries = await this.prisma.competitionEntry.findMany({
      where: { competitionSeason: { isCurrent: true, competition: screenCompetitionWhere } },
      select: { competitionSeasonId: true, team: { select: { id: true, apiTeamId: true, name: true } } },
    });
    const byTeam = new Map<number, { teamId: number; apiTeamId: number; name: string; competitionSeasonIds: number[] }>();
    for (const e of entries) {
      const hit = byTeam.get(e.team.id);
      if (hit) hit.competitionSeasonIds.push(e.competitionSeasonId);
      else byTeam.set(e.team.id, { teamId: e.team.id, apiTeamId: e.team.apiTeamId, name: e.team.name, competitionSeasonIds: [e.competitionSeasonId] });
    }
    return [...byTeam.values()].sort((a, b) => a.apiTeamId - b.apiTeamId);
  }

  private async lockedCompetitionSeasonIds(): Promise<Set<number>> {
    const jobs = await this.prisma.backfillJob.findMany({
      // updated_at 이 오래된 행은 죽은 프로세스가 남긴 락이다 — 무시한다 (STALE_LOCK_MS)
      where: {
        phase: { in: BACKFILL_IN_PROGRESS },
        updatedAt: { gte: new Date(Date.now() - STALE_LOCK_MS) },
      },
      select: { competitionSeasonId: true },
    });
    return new Set(jobs.map((j) => j.competitionSeasonId));
  }

  /**
   * squads 가 주는 것은 이름·사진뿐이다. 생년월일·국적은 없다 —
   * `profile_fetched_at` 은 건드리지 않아 L1 #9(/players?id=)가 채울 대상이 남는다.
   */
  private async upsertPlayers(raw: { players: ApiSquad['players'] }[]): Promise<Map<number, number>> {
    const rows = raw.flatMap((r) =>
      r.players.map((p) => ({ api_player_id: p.id, name: p.name, photo_url: p.photo })),
    );
    if (rows.length === 0) return new Map();
    const res = await batchUpsert<(typeof rows)[number], { id: number; api_player_id: number }>(this.prisma, {
      table: 'players',
      columns: { api_player_id: 'int', name: 'text', photo_url: 'text' },
      conflict: ['api_player_id'],
      update: ['name', 'photo_url'],
      updatedAtColumn: 'updated_at',
      returning: ['id', 'api_player_id'],
    }, rows);
    return new Map(res.returned.map((p) => [p.api_player_id, p.id]));
  }

  /**
   * 한 트랜잭션 안에서 remove → close → update → open.
   * 순서가 곧 불변식이다 — 먼저 닫지 않고 열면 partial unique 가 터진다.
   */
  private async applyDiff(diff: ReturnType<typeof diffSquads>, seasonYear: number, today: string): Promise<void> {
    if (diff.remove.length + diff.close.length + diff.update.length + diff.open.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      if (diff.remove.length > 0) {
        const ids = Prisma.join(diff.remove.map((r) => r.id));
        await tx.$executeRaw`DELETE FROM "squad_entries" WHERE "id" IN (${ids})`;
      }

      if (diff.close.length > 0) {
        const ids = Prisma.join(diff.close.map((c) => c.id));
        await tx.$executeRaw`
          UPDATE "squad_entries" SET "valid_to" = ${today}::date, "observed_at" = now()
          WHERE "id" IN (${ids})`;
      }

      if (diff.update.length > 0) {
        const values = Prisma.join(
          diff.update.map(
            (u) => Prisma.sql`(${u.id}::int, ${u.teamId}::int, ${u.jerseyNumber}::int, ${u.position}::text)`,
          ),
        );
        await tx.$executeRaw`
          UPDATE "squad_entries" AS s
          SET "team_id" = v.team_id, "jersey_number" = v.jersey_number, "position" = v.position, "observed_at" = now()
          FROM (VALUES ${values}) AS v(id, team_id, jersey_number, position)
          WHERE s."id" = v.id`;
      }

      if (diff.open.length > 0) {
        const values = Prisma.join(
          diff.open.map(
            (o) => Prisma.sql`(${o.playerId}::int, ${o.teamId}::int, ${seasonYear}::int, ${o.jerseyNumber}::int, ${o.position}::text, ${today}::date, now(), ${'UNKNOWN'}::"TransferType")`,
          ),
        );
        await tx.$executeRaw`
          INSERT INTO "squad_entries"
            ("player_id", "team_id", "season_year", "jersey_number", "position", "valid_from", "observed_at", "transfer_type")
          VALUES ${values}`;
      }
    });
  }
}
