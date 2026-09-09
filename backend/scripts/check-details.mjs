#!/usr/bin/env node
/**
 * L3·L5 백필 관문 · 값 위생 검사 — 읽기 전용
 *
 * 실행: cd backend && node scripts/check-details.mjs
 *
 * 관문 통과 조건 (판단은 이 스크립트 밖. 여기서는 표만 찍는다):
 *   (a) matches.detail_checked_at IS NOT NULL 이 목표치 이상
 *   (b) 5개 테이블(match_lineups·lineup_entries·match_events·team_match_stats·player_match_stats) 전부 행 수 > 0
 *   (c) 고아 행 0 (자식.match_id / player_id / team_id 가 부모에 없는 건수)
 *   (d) 값 위생: player_match_stats.passes_accuracy > passes_total 인 행 수 0 · minutes < 0 인 행 수 0 · match_events seq 불연속 경기 수 0
 */
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient();

function pad(s, n) {
  const str = String(s);
  return str.length >= n ? str : str + ' '.repeat(n - str.length);
}
function padLeft(s, n) {
  const str = String(s);
  return str.length >= n ? str : ' '.repeat(n - str.length) + str;
}

async function main() {
  const now = new Date().toISOString();
  console.log(`# L3·L5 백필 관문 · ${now}`);
  console.log('');

  // ── matches 요약 ───────────────────────────────────────────────
  const matchesTotal = await prisma.match.count();
  const detailEligible = await prisma.match.count({ where: { detailEligible: true } });
  const detailChecked = await prisma.match.count({ where: { detailCheckedAt: { not: null } } });
  const confirmed = await prisma.match.count({ where: { statsState: 'CONFIRMED' } });

  console.log('## matches');
  console.log(`  total                   ${padLeft(matchesTotal, 8)}`);
  console.log(`  detail_eligible         ${padLeft(detailEligible, 8)}`);
  console.log(`  detail_checked_at NOT NULL ${padLeft(detailChecked, 5)}`);
  console.log(`  stats_state=CONFIRMED   ${padLeft(confirmed, 8)}`);
  console.log('');

  // has_* 각각 true/false/null
  console.log('## has_* (matches)');
  console.log(`  ${pad('field', 20)} ${padLeft('true', 8)} ${padLeft('false', 8)} ${padLeft('null', 8)}`);
  for (const field of ['hasLineups', 'hasEvents', 'hasTeamStats', 'hasPlayerStats']) {
    const t = await prisma.match.count({ where: { [field]: true } });
    const f = await prisma.match.count({ where: { [field]: false } });
    const n = await prisma.match.count({ where: { [field]: null } });
    console.log(`  ${pad(field, 20)} ${padLeft(t, 8)} ${padLeft(f, 8)} ${padLeft(n, 8)}`);
  }
  console.log('');

  // ── 5개 테이블 행 수 ───────────────────────────────────────────
  console.log('## 5 tables · 행 수');
  const rowCounts = {
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

  // ── 고아 행 (자식.match_id · player_id · team_id 가 부모에 없는 건수) ─
  console.log('## 고아 행 (0이어야 한다)');
  const orphans = await prisma.$queryRaw`
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
  const orphanRows = [
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

  // ── 값 위생 ─────────────────────────────────────────────────
  console.log('## 값 위생 (player_match_stats)');
  const pmsTotal = await prisma.playerMatchStat.count();
  const ratingNull = await prisma.playerMatchStat.count({ where: { rating: null } });
  const ratingNullPct = pmsTotal === 0 ? 0 : Math.round((ratingNull / pmsTotal) * 100 * 10) / 10;
  console.log(`  total                       ${padLeft(pmsTotal, 10)}`);
  console.log(`  rating IS NULL              ${padLeft(ratingNull, 10)}  (${ratingNullPct}%)`);

  const paGtPtRes = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS c FROM player_match_stats
    WHERE passes_accuracy IS NOT NULL AND passes_total IS NOT NULL AND passes_accuracy > passes_total
  `;
  const paGtPt = paGtPtRes[0].c;
  const paFlag = paGtPt > 0 ? ' ⚠' : '';
  console.log(`  passes_accuracy > passes_total (0이어야) ${padLeft(paGtPt, 4)}${paFlag}`);

  const minutesNegRes = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS c FROM player_match_stats WHERE minutes < 0
  `;
  const minutesNeg = minutesNegRes[0].c;
  const mnFlag = minutesNeg > 0 ? ' ⚠' : '';
  console.log(`  minutes < 0 (0이어야)                    ${padLeft(minutesNeg, 4)}${mnFlag}`);
  console.log('');

  // ── match_events seq 연속성 (같은 match 안에서 seq 가 0..N-1) ──
  console.log('## match_events seq 연속성');
  const seqBadRes = await prisma.$queryRaw`
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

  console.log('# 관문 판단 (판단은 사람 · 스크립트는 표만)');
  console.log(`  (a) detail_checked_at ≥ 45?          ${detailChecked >= 45 ? 'YES' : 'NO'}  (실측 ${detailChecked})`);
  const tablesNonZero = Object.values(rowCounts).every(c => c > 0);
  console.log(`  (b) 5 테이블 전부 > 0 ?              ${tablesNonZero ? 'YES' : 'NO'}`);
  console.log(`  (c) 고아 행 = 0 ?                    ${orphanTotal === 0 ? 'YES' : 'NO'}  (실측 ${orphanTotal})`);
  const hygieneOk = paGtPt === 0 && minutesNeg === 0 && seqBad === 0;
  console.log(`  (d) 값 위생 (pa>pt · min<0 · seq)   ${hygieneOk ? 'YES' : 'NO'}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
