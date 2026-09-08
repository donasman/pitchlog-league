/**
 * 고아 행 검사 — 외래키를 쓰지 않기로 한 대가 (SCHEMA_DESIGN 2-3)
 *
 * 두 곳에서 돈다:
 *   · L6 보정 잡 — 일 1회. 결과를 로그와 ingestion_runs 에 남긴다
 *   · CI 통합 테스트 — test/integrity.e2e-spec.ts
 *
 * 자동 삭제하지 않는다. 고아 행의 원인은 수집 순서 버그이므로 지우면 증상만 사라진다.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from './prisma.service.js';

/** 검사할 참조 관계. child.column → parent.id */
export const REFERENCE_CHECKS = [
  // 경기 상세 → 경기
  { child: 'player_match_stats', column: 'match_id',  parent: 'matches' },
  { child: 'player_match_stats', column: 'player_id', parent: 'players' },
  { child: 'player_match_stats', column: 'team_id',   parent: 'teams' },
  { child: 'lineup_entries',     column: 'match_id',  parent: 'matches' },
  { child: 'lineup_entries',     column: 'player_id', parent: 'players' },
  { child: 'match_events',       column: 'match_id',  parent: 'matches' },
  { child: 'match_events',       column: 'team_id',   parent: 'teams' },
  { child: 'team_match_stats',   column: 'match_id',  parent: 'matches' },
  // 경기 → 기준 데이터
  { child: 'matches', column: 'competition_season_id', parent: 'competition_seasons' },
  { child: 'matches', column: 'round_id',              parent: 'competition_rounds' },
  { child: 'matches', column: 'home_team_id',          parent: 'teams' },
  { child: 'matches', column: 'away_team_id',          parent: 'teams' },
  // 순위·이력
  { child: 'standings',     column: 'competition_season_id', parent: 'competition_seasons' },
  { child: 'standings',     column: 'team_id',               parent: 'teams' },
  { child: 'squad_entries', column: 'player_id',             parent: 'players' },
  { child: 'squad_entries', column: 'team_id',               parent: 'teams' },
  // 시즌 집계 (L6) — FK 가 없는 설계에서 이 세 테이블의 유일한 방어 장치다.
  // 선수 통계는 팀 맵에 없는 팀을 버리고, 랭킹은 선수를 먼저 upsert 한다. 그 규칙이 깨지면 여기서 잡힌다
  { child: 'player_season_stats', column: 'player_id',             parent: 'players' },
  { child: 'player_season_stats', column: 'team_id',               parent: 'teams' },
  { child: 'player_season_stats', column: 'competition_season_id', parent: 'competition_seasons' },
  { child: 'team_season_stats',   column: 'team_id',               parent: 'teams' },
  { child: 'team_season_stats',   column: 'competition_season_id', parent: 'competition_seasons' },
  { child: 'top_rankings',        column: 'player_id',             parent: 'players' },
  { child: 'top_rankings',        column: 'team_id',               parent: 'teams' },
  { child: 'top_rankings',        column: 'competition_season_id', parent: 'competition_seasons' },
  // 대진표
  { child: 'knockout_ties', column: 'round_id', parent: 'competition_rounds' },
  { child: 'bracket_slots', column: 'round_id', parent: 'competition_rounds' },
] as const;

export interface OrphanReport {
  child: string;
  column: string;
  parent: string;
  count: number;
  /** 최대 20개 표본 — 원인 추적용 */
  sampleIds: number[];
}

@Injectable()
export class IntegrityService {
  private readonly logger = new Logger(IntegrityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 전 관계를 검사한다. 고아가 하나라도 있으면 배열이 비어 있지 않다 */
  async findOrphans(): Promise<OrphanReport[]> {
    const reports: OrphanReport[] = [];
    for (const ref of REFERENCE_CHECKS) {
      const report = await this.checkOne(ref.child, ref.column, ref.parent);
      if (report.count > 0) reports.push(report);
    }
    return reports;
  }

  /**
   * 한 관계 검사. 테이블·컬럼명은 위 상수에서만 오므로 Prisma.raw 가 안전하다.
   * NULL 허용 컬럼은 NULL 을 고아로 세지 않는다.
   */
  async checkOne(child: string, column: string, parent: string): Promise<OrphanReport> {
    const c = Prisma.raw(`"${child}"`);
    const col = Prisma.raw(`"${column}"`);
    const p = Prisma.raw(`"${parent}"`);

    const [{ count }] = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count
      FROM ${c} AS ch
      LEFT JOIN ${p} AS pa ON pa.id = ch.${col}
      WHERE ch.${col} IS NOT NULL AND pa.id IS NULL
    `;

    const n = Number(count);
    let sampleIds: number[] = [];
    if (n > 0) {
      const rows = await this.prisma.$queryRaw<{ id: number }[]>`
        SELECT ch.id
        FROM ${c} AS ch
        LEFT JOIN ${p} AS pa ON pa.id = ch.${col}
        WHERE ch.${col} IS NOT NULL AND pa.id IS NULL
        ORDER BY ch.id
        LIMIT 20
      `;
      sampleIds = rows.map((r) => r.id);
      this.logger.warn(`고아 행 ${n}건 — ${child}.${column} → ${parent} (표본 ${sampleIds.join(',')})`);
    }
    return { child, column, parent, count: n, sampleIds };
  }

  /** bracket_slots 자기 참조 사이클 — FK 가 없어 DB 가 못 막는다 */
  async findSlotCycles(): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      WITH RECURSIVE walk AS (
        SELECT id, source_slot_a_id, source_slot_b_id, ARRAY[id] AS path, false AS cycle
        FROM bracket_slots
        UNION ALL
        SELECT s.id, s.source_slot_a_id, s.source_slot_b_id,
               w.path || s.id, s.id = ANY(w.path)
        FROM bracket_slots s
        JOIN walk w ON s.id IN (w.source_slot_a_id, w.source_slot_b_id)
        WHERE NOT w.cycle AND array_length(w.path, 1) < 32
      )
      SELECT DISTINCT id FROM walk WHERE cycle
    `;
    return rows.map((r) => r.id);
  }
}
