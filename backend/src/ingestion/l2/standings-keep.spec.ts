/**
 * standingKeepKeys — collectStandings 가 옛 (team_id, group_name) 행을 정리할 때 쓰는 키 집합.
 *
 * 2026-09-23 UCL 사고: 외부 API 가 group_name "League Phase" → "UEFA Champions League" 로 바꾸자
 * 옛 36행이 그대로 남아 표가 72행이 되고 프론트 singleTableLeader 가 조 2개로 판정.
 * 이 함수가 반환한 키 집합에 없는 (team_id, group_name) 은 DB 에서 지운다.
 */
import { describe, it, expect } from 'vitest';
import { standingKeepKeys, type StandingKeepRow } from './standings-keep.js';

const row = (team_id: number, group_name: string): StandingKeepRow => ({ team_id, group_name });

describe('standingKeepKeys', () => {
  it('조 이름이 바뀐 응답 — 새 group 만 keep (옛 group 은 DB 에서 지워지도록 keep 밖)', () => {
    // 이번 응답은 새 group 이름만 온다. keep 에 옛 group 이 없어야 DELETE ... NOT IN 절이 옛 행을 지운다.
    const rows = [row(10, 'UEFA Champions League'), row(11, 'UEFA Champions League'), row(12, 'UEFA Champions League')];
    expect(standingKeepKeys(rows)).toEqual([
      { teamId: 10, groupName: 'UEFA Champions League' },
      { teamId: 11, groupName: 'UEFA Champions League' },
      { teamId: 12, groupName: 'UEFA Champions League' },
    ]);
  });

  it('같은 (team_id, group_name) 이 중복으로 오면 한 번만 남는다 — batchUpsert dedupe 와 같은 규칙', () => {
    const rows = [row(10, 'Group A'), row(11, 'Group A'), row(10, 'Group A')];
    expect(standingKeepKeys(rows)).toEqual([
      { teamId: 10, groupName: 'Group A' },
      { teamId: 11, groupName: 'Group A' },
    ]);
  });

  it('같은 팀이 서로 다른 조에 있으면 둘 다 keep — 조 나뉜 대회 (실제 UCL 리그 페이즈 없던 시절)', () => {
    // team_id 10 이 Group A · Group B 둘 다 있는 병리 케이스도 튜플로 구분된다.
    const rows = [row(10, 'Group A'), row(10, 'Group B')];
    expect(standingKeepKeys(rows)).toEqual([
      { teamId: 10, groupName: 'Group A' },
      { teamId: 10, groupName: 'Group B' },
    ]);
  });

  it('빈 rows — keep 도 비어 있음. 호출자는 rows.length === 0 일 때 DELETE 자체를 건너뛴다', () => {
    expect(standingKeepKeys([])).toEqual([]);
  });
});
