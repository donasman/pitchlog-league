/**
 * L3·L5 백필 관문 · 값 위생 검사 — 읽기 전용
 *
 * 실행: `npm run check:details` (nest build 후 `node dist/cli/check-details.js`)
 *
 * 관문 통과 조건 (판단은 사람 · 스크립트는 표만 + YES/NO 힌트):
 *   (a) matches.detail_checked_at IS NOT NULL 이 목표치 이상
 *   (b) 5개 테이블(match_lineups·lineup_entries·match_events·team_match_stats·player_match_stats) 전부 행 수 > 0
 *   (c) 고아 행 0
 *   (d) 값 위생: passes_accuracy > passes_total 0 · minutes < 0 이 0 · match_events seq 불연속 0
 *
 * 추가 진단 (2026-09-10, 이 판 실측):
 *   - has_* 4컬럼 true/false/null 분포 (경기 수) — 어느 endpoint 가 안 불렸는지 드러남
 *   - detail_checked_at IS NULL 인데 has_* 중 하나 이상 non-NULL 인 경기 수 (콜이 덜 나가 부분 처리된 경기)
 *   - 테이블 크기 · 5시즌 추정 (pg_total_relation_size) — Supabase 500MB 대비 얼마나 갈지 예상 (관문 4번)
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { PrismaService } from '../prisma/prisma.service.js';

function pad(s: string | number, n: number): string {
  const str = String(s);
  return str.length >= n ? str : str + ' '.repeat(n - str.length);
}
function padLeft(s: string | number, n: number): string {
  const str = String(s);
  return str.length >= n ? str : ' '.repeat(n - str.length) + str;
}

interface OrphanCounts {
  match_lineups_match: number;
  match_lineups_team: number;
  lineup_entries_match: number;
  lineup_entries_player: number;
  lineup_entries_team: number;
  match_events_match: number;
  match_events_player: number;
  match_events_assist: number;
  match_events_team: number;
  team_match_stats_match: number;
  team_match_stats_team: number;
  player_match_stats_match: number;
  player_match_stats_player: number;
  player_match_stats_team: number;
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });
  const prisma = app.get(PrismaService);

  try {
    const now = new Date().toISOString();
    console.log(`# L3·L5 백필 관문 · ${now}`);
    console.log('');

    // ── matches 요약 ─────────────────────────────────────────
    const matchesTotal = await prisma.match.count();
    const detailEligible = await prisma.match.count({ where: { detailEligible: true } });
    const detailChecked = await prisma.match.count({ where: { detailCheckedAt: { not: null } } });
    const confirmed = await prisma.match.count({ where: { statsState: 'CONFIRMED' } });

    console.log('## matches');
    console.log(`  total                       ${padLeft(matchesTotal, 10)}`);
    console.log(`  detail_eligible             ${padLeft(detailEligible, 10)}`);
    console.log(`  detail_checked_at NOT NULL  ${padLeft(detailChecked, 10)}`);
    console.log(`  stats_state=CONFIRMED       ${padLeft(confirmed, 10)}`);
    console.log('');

    // ── has_* 4컬럼 분포 (경기 수) ─────────────────────────
    console.log('## has_* 분포 (matches, 경기 수)');
    console.log(`  ${pad('field', 20)} ${padLeft('true', 8)} ${padLeft('false', 8)} ${padLeft('null', 8)}`);
    const hasFields: Array<'hasLineups' | 'hasEvents' | 'hasTeamStats' | 'hasPlayerStats'> = [
      'hasLineups',
      'hasEvents',
      'hasTeamStats',
      'hasPlayerStats',
    ];
    for (const field of hasFields) {
      const t = await prisma.match.count({ where: { [field]: true } });
      const f = await prisma.match.count({ where: { [field]: false } });
      const n = await prisma.match.count({ where: { [field]: null } });
      console.log(`  ${pad(field, 20)} ${padLeft(t, 8)} ${padLeft(f, 8)} ${padLeft(n, 8)}`);
    }
    console.log('');

    // ── 부분 처리 (콜이 덜 나가 detail_checked_at 이 NULL 로 남은 경기) ──
    const partialRes = await prisma.$queryRaw<Array<{ c: number }>>`
      SELECT COUNT(*)::int AS c FROM matches
      WHERE detail_eligible = true
        AND detail_checked_at IS NULL
        AND (has_lineups IS NOT NULL
          OR has_events IS NOT NULL
          OR has_team_stats IS NOT NULL
          OR has_player_stats IS NOT NULL)
    `;
    const partial = partialRes[0].c;
    const partialFlag = partial > 0 ? ' ⚠' : '';
    console.log('## 부분 처리 (콜 덜 나간 경기)');
    console.log(`  detail_checked_at IS NULL · has_* 중 ≥1개 non-NULL   ${padLeft(partial, 8)}${partialFlag}`);
    console.log('');

    // ── 5개 테이블 행 수 ────────────────────────────────────
    console.log('## 5 tables · 행 수');
    const rowCounts: Record<string, number> = {
      match_lineups: await prisma.matchLineup.count(),
      lineup_entries: await prisma.lineupEntry.count(),
      match_events: await prisma.matchEvent.count(),
      team_match_stats: await prisma.teamMatchStat.count(),
      player_match_stats: await prisma.playerMatchStat.count(),
    };
    for (const [name, count] of Object.entries(rowCounts)) {
      console.log(`  ${pad(name, 22)} ${padLeft(count, 10)}`);
    }
    console.log('');

    // ── 고아 행 (자식.match_id · player_id · team_id 가 부모에 없는 건수) ──
    console.log('## 고아 행 (0이어야 한다)');
    const orphans = await prisma.$queryRaw<OrphanCounts[]>`
      SELECT
        (SELECT COUNT(*) FROM match_lineups ml WHERE NOT EXISTS (SELECT 1 FROM matches m WHERE m.id = ml.match_id))::int AS match_lineups_match,
        (SELECT COUNT(*) FROM match_lineups ml WHERE NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = ml.team_id))::int AS match_lineups_team,
        (SELECT COUNT(*) FROM lineup_entries le WHERE NOT EXISTS (SELECT 1 FROM matches m WHERE m.id = le.match_id))::int AS lineup_entries_match,
        (SELECT COUNT(*) FROM lineup_entries le WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.id = le.player_id))::int AS lineup_entries_player,
        (SELECT COUNT(*) FROM lineup_entries le WHERE NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = le.team_id))::int AS lineup_entries_team,
        (SELECT COUNT(*) FROM match_events me WHERE NOT EXISTS (SELECT 1 FROM matches m WHERE m.id = me.match_id))::int AS match_events_match,
        (SELECT COUNT(*) FROM match_events me WHERE me.player_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM players p WHERE p.id = me.player_id))::int AS match_events_player,
        (SELECT COUNT(*) FROM match_events me WHERE me.assist_player_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM players p WHERE p.id = me.assist_player_id))::int AS match_events_assist,
        (SELECT COUNT(*) FROM match_events me WHERE NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = me.team_id))::int AS match_events_team,
        (SELECT COUNT(*) FROM team_match_stats tms WHERE NOT EXISTS (SELECT 1 FROM matches m WHERE m.id = tms.match_id))::int AS team_match_stats_match,
        (SELECT COUNT(*) FROM team_match_stats tms WHERE NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = tms.team_id))::int AS team_match_stats_team,
        (SELECT COUNT(*) FROM player_match_stats pms WHERE NOT EXISTS (SELECT 1 FROM matches m WHERE m.id = pms.match_id))::int AS player_match_stats_match,
        (SELECT COUNT(*) FROM player_match_stats pms WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.id = pms.player_id))::int AS player_match_stats_player,
        (SELECT COUNT(*) FROM player_match_stats pms WHERE NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = pms.team_id))::int AS player_match_stats_team
    `;
    const o = orphans[0];
    const orphanRows: Array<[string, number]> = [
      ['match_lineups.match_id', o.match_lineups_match],
      ['match_lineups.team_id', o.match_lineups_team],
      ['lineup_entries.match_id', o.lineup_entries_match],
      ['lineup_entries.player_id', o.lineup_entries_player],
      ['lineup_entries.team_id', o.lineup_entries_team],
      ['match_events.match_id', o.match_events_match],
      ['match_events.player_id (NOT NULL)', o.match_events_player],
      ['match_events.assist_player_id (NOT NULL)', o.match_events_assist],
      ['match_events.team_id', o.match_events_team],
      ['team_match_stats.match_id', o.team_match_stats_match],
      ['team_match_stats.team_id', o.team_match_stats_team],
      ['player_match_stats.match_id', o.player_match_stats_match],
      ['player_match_stats.player_id', o.player_match_stats_player],
      ['player_match_stats.team_id', o.player_match_stats_team],
    ];
    const orphanTotal = orphanRows.reduce((acc, [, c]) => acc + Number(c), 0);
    for (const [name, count] of orphanRows) {
      const flag = Number(count) > 0 ? ' ⚠' : '';
      console.log(`  ${pad(name, 42)} ${padLeft(count, 8)}${flag}`);
    }
    console.log(`  ${pad('합계', 42)} ${padLeft(orphanTotal, 8)}`);
    console.log('');

    // ── 값 위생 ─────────────────────────────────────────────
    console.log('## 값 위생 (player_match_stats)');
    const pmsTotal = await prisma.playerMatchStat.count();
    const ratingNull = await prisma.playerMatchStat.count({ where: { rating: null } });
    const ratingNullPct = pmsTotal === 0 ? 0 : Math.round((ratingNull / pmsTotal) * 100 * 10) / 10;
    console.log(`  total                           ${padLeft(pmsTotal, 10)}`);
    console.log(`  rating IS NULL                  ${padLeft(ratingNull, 10)}  (${ratingNullPct}%)`);

    const paGtPtRes = await prisma.$queryRaw<Array<{ c: number }>>`
      SELECT COUNT(*)::int AS c FROM player_match_stats
      WHERE passes_accuracy IS NOT NULL AND passes_total IS NOT NULL AND passes_accuracy > passes_total
    `;
    const paGtPt = paGtPtRes[0].c;
    const paFlag = paGtPt > 0 ? ' ⚠' : '';
    console.log(`  passes_accuracy > passes_total (0이어야) ${padLeft(paGtPt, 4)}${paFlag}`);

    const minutesNegRes = await prisma.$queryRaw<Array<{ c: number }>>`
      SELECT COUNT(*)::int AS c FROM player_match_stats WHERE minutes < 0
    `;
    const minutesNeg = minutesNegRes[0].c;
    const mnFlag = minutesNeg > 0 ? ' ⚠' : '';
    console.log(`  minutes < 0 (0이어야)                    ${padLeft(minutesNeg, 4)}${mnFlag}`);
    console.log('');

    // ── match_events seq 연속성 ─────────────────────────────
    console.log('## match_events seq 연속성');
    const seqBadRes = await prisma.$queryRaw<Array<{ c: number }>>`
      WITH per_match AS (
        SELECT match_id,
               MIN(seq) AS min_seq,
               MAX(seq) AS max_seq,
               COUNT(*) AS cnt
        FROM match_events
        GROUP BY match_id
      )
      SELECT COUNT(*)::int AS c FROM per_match
      WHERE min_seq != 0 OR max_seq != cnt - 1
    `;
    const seqBad = seqBadRes[0].c;
    const seqFlag = seqBad > 0 ? ' ⚠' : '';
    console.log(`  seq 불연속 경기 수 (0이어야)  ${padLeft(seqBad, 6)}${seqFlag}`);
    console.log('');

    // ── 테이블 크기 · 5시즌 추정 ───────────────────────────
    // Supabase 무료 티어 500MB 대비 어디까지 갈지 실측 (한 시즌 처리된 경기 수 기준).
    // 5시즌 추정 = 현재 크기 × (8000 / 180) — 8000 은 5시즌 전체 대상 경기 수 상수(현재
    // 시즌 실측 180), 180 은 이 판(2026 시즌 부분 처리) 실측치. 정확한 상수는 아니지만
    // "얼마나 클지" 감을 잡는 데 쓴다. 관문은 사람이 본다.
    console.log('## 테이블 크기 · 5시즌 추정');
    const SIZE_MULTIPLIER = 8_000 / 180;
    const sizeRes = await prisma.$queryRaw<Array<{ relname: string; bytes: bigint; pretty: string }>>`
      SELECT c.relname,
             pg_total_relation_size(c.oid) AS bytes,
             pg_size_pretty(pg_total_relation_size(c.oid)) AS pretty
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN ('matches','match_lineups','lineup_entries','match_events','team_match_stats','player_match_stats')
      ORDER BY pg_total_relation_size(c.oid) DESC
    `;
    // 행당 평균 바이트 계산용 count
    const rowCountsForSize: Record<string, number> = {
      matches: matchesTotal,
      match_lineups: rowCounts.match_lineups,
      lineup_entries: rowCounts.lineup_entries,
      match_events: rowCounts.match_events,
      team_match_stats: rowCounts.team_match_stats,
      player_match_stats: rowCounts.player_match_stats,
    };
    console.log(`  ${pad('table', 20)} ${padLeft('size', 10)} ${padLeft('avg/row', 10)} ${padLeft('5시즌 추정', 14)}`);
    let totalBytes = 0n;
    for (const r of sizeRes) {
      const rows = rowCountsForSize[r.relname] ?? 0;
      const bytes = Number(r.bytes);
      totalBytes += r.bytes;
      const avgPerRow = rows > 0 ? Math.round(bytes / rows) : 0;
      const projected = bytes * SIZE_MULTIPLIER;
      const projectedMB = projected / (1024 * 1024);
      const projectedStr = `${projectedMB.toFixed(1)} MB`;
      console.log(`  ${pad(r.relname, 20)} ${padLeft(r.pretty, 10)} ${padLeft(`${avgPerRow} B`, 10)} ${padLeft(projectedStr, 14)}`);
    }
    // 합계
    const totalMB = Number(totalBytes) / (1024 * 1024);
    const totalProjectedMB = (Number(totalBytes) * SIZE_MULTIPLIER) / (1024 * 1024);
    const supabaseLimitMB = 500;
    const pctOfLimit = ((totalProjectedMB / supabaseLimitMB) * 100).toFixed(1);
    console.log(
      `  합계: ${totalMB.toFixed(1)} MB · 5시즌 추정 ${totalProjectedMB.toFixed(1)} MB · Supabase 500MB 대비 ${pctOfLimit}%`,
    );
    console.log('');

    console.log('# 관문 판단 (판단은 사람 · 스크립트는 표만)');
    console.log(`  (a) detail_checked_at ≥ 45?          ${detailChecked >= 45 ? 'YES' : 'NO'}  (실측 ${detailChecked})`);
    const tablesNonZero = Object.values(rowCounts).every((c) => c > 0);
    console.log(`  (b) 5 테이블 전부 > 0 ?              ${tablesNonZero ? 'YES' : 'NO'}`);
    console.log(`  (c) 고아 행 = 0 ?                    ${orphanTotal === 0 ? 'YES' : 'NO'}  (실측 ${orphanTotal})`);
    const hygieneOk = paGtPt === 0 && minutesNeg === 0 && seqBad === 0;
    console.log(`  (d) 값 위생 (pa>pt · min<0 · seq)   ${hygieneOk ? 'YES' : 'NO'}`);
  } finally {
    await app.close();
  }
}

await main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
