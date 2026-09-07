/**
 * 스쿼드 diff 관문 테스트 — 시나리오 1~9 (BACKEND_FEATURES L1 #8)
 *
 * 완료 기준은 "500선수가 DB 에 있다" 가 아니라 **이적 시나리오를 통과한다** 이다.
 * DB 없이 도는 이유: 판정 로직을 표로 검증할 수 있어야 한다. 쓰기 불변식은 e2e 가 본다.
 */
import { describe, it, expect } from 'vitest';
import { diffSquads, type DiffInput, type OpenEntry } from './squad-diff.js';

const TODAY = '2026-09-07';
const EARLIER = '2026-08-01';

const snap = (teamId: number, players: [number, number | null, string | null][]) => ({
  teamId,
  players: players.map(([playerId, jerseyNumber, position]) => ({ playerId, jerseyNumber, position })),
});

const open = (id: number, playerId: number, teamId: number, jerseyNumber: number | null = 7, position: string | null = 'Midfielder', validFrom = EARLIER): OpenEntry =>
  ({ id, playerId, teamId, jerseyNumber, position, validFrom });

const run = (p: Partial<DiffInput> & Pick<DiffInput, 'snapshots'>) =>
  diffSquads({
    today: TODAY,
    openEntries: [],
    coveredTeamIds: new Set(p.snapshots.map((s) => s.teamId)),
    ...p,
  });

describe('스쿼드 diff', () => {
  it('1. 첫 수집 — 전원 신규', () => {
    const r = run({ snapshots: [snap(1, [[10, 7, 'Midfielder'], [11, 9, 'Attacker']])] });
    expect(r.open).toHaveLength(2);
    expect(r.close).toHaveLength(0);
    expect(r.counts.arrived).toBe(2);
  });

  it('2. 무변화 재실행 — 아무것도 쓰지 않는다', () => {
    const r = run({
      snapshots: [snap(1, [[10, 7, 'Midfielder']])],
      openEntries: [open(100, 10, 1)],
    });
    expect(r.open).toHaveLength(0);
    expect(r.close).toHaveLength(0);
    expect(r.update).toHaveLength(0);
    expect(r.remove).toHaveLength(0);
    expect(r.counts.unchanged).toBe(1);
  });

  it('3. 이적 — A 를 닫고 B 를 연다 (이력 2행)', () => {
    const r = run({
      snapshots: [snap(1, []), snap(2, [[10, 21, 'Midfielder']])],
      openEntries: [open(100, 10, 1)],
      coveredTeamIds: new Set([1, 2]),
    });
    expect(r.close).toEqual([{ id: 100 }]);
    expect(r.open).toEqual([{ playerId: 10, teamId: 2, jerseyNumber: 21, position: 'Midfielder' }]);
    expect(r.counts.moved).toBe(1);
    // 떠난 쪽을 따로 "방출" 로 세지 않는다 — 한 사건이다
    expect(r.counts.left).toBe(0);
  });

  it('3-1. 이적 — 도착 팀만 관측해도 출발 팀 행을 닫는다 (추적 밖에서 온 경우와 구분)', () => {
    const r = run({
      snapshots: [snap(2, [[10, 21, 'Midfielder']])],
      openEntries: [open(100, 10, 99)], // 99 는 이번에 안 본 팀
      coveredTeamIds: new Set([2]),
    });
    expect(r.close).toEqual([{ id: 100 }]);
    expect(r.open).toHaveLength(1);
  });

  it('4. 등번호 변경 — 기존 행을 고치고 새 행을 만들지 않는다', () => {
    const r = run({
      snapshots: [snap(1, [[10, 21, 'Midfielder']])],
      openEntries: [open(100, 10, 1, 7)],
    });
    expect(r.update).toEqual([{ id: 100, teamId: 1, jerseyNumber: 21, position: 'Midfielder' }]);
    expect(r.open).toHaveLength(0);
    expect(r.close).toHaveLength(0);
    expect(r.counts.changed).toBe(1);
  });

  it('5. 방출 — 닫기만 하고 열지 않는다', () => {
    const r = run({
      snapshots: [snap(1, [[11, 9, 'Attacker']])],
      openEntries: [open(100, 10, 1), open(101, 11, 1, 9, 'Attacker')],
    });
    expect(r.close).toEqual([{ id: 100 }]);
    expect(r.open).toHaveLength(0);
    expect(r.counts.left).toBe(1);
  });

  it('6. 복귀 — 원래 팀으로 돌아오면 새 행을 연다', () => {
    // 임대에서 복귀: 지금 열린 행은 임대팀(2), 스냅샷은 원소속(1)
    const r = run({
      snapshots: [snap(1, [[10, 7, 'Midfielder']]), snap(2, [])],
      openEntries: [open(100, 10, 2)],
      coveredTeamIds: new Set([1, 2]),
    });
    expect(r.close).toEqual([{ id: 100 }]);
    expect(r.open).toEqual([{ playerId: 10, teamId: 1, jerseyNumber: 7, position: 'Midfielder' }]);
  });

  it('7-a. 같은 날 재실행 + 이적 — 0일 행을 만들지 않고 그 자리에서 고친다', () => {
    const r = run({
      snapshots: [snap(2, [[10, 21, 'Attacker']])],
      openEntries: [open(100, 10, 1, 7, 'Midfielder', TODAY)], // 오늘 만들어진 행
      coveredTeamIds: new Set([1, 2]),
    });
    expect(r.close).toHaveLength(0);
    expect(r.open).toHaveLength(0);
    expect(r.update).toEqual([{ id: 100, teamId: 2, jerseyNumber: 21, position: 'Attacker' }]);
    expect(r.counts.sameDayFixed).toBe(1);
  });

  it('7-b. 같은 날 재실행 + 사라짐 — 0일 행 대신 지운다', () => {
    const r = run({
      snapshots: [snap(1, [])],
      openEntries: [open(100, 10, 1, 7, 'Midfielder', TODAY)],
      coveredTeamIds: new Set([1]),
    });
    expect(r.remove).toEqual([{ id: 100 }]);
    expect(r.close).toHaveLength(0);
    expect(r.counts.sameDayFixed).toBe(1);
  });

  it('8·9. 건너뛴 팀의 열린 행은 건드리지 않는다', () => {
    // 팀 1 이 빈 응답·급감으로 제외되면 coveredTeamIds 에 없다
    const r = run({
      snapshots: [snap(2, [[11, 9, 'Attacker']])],
      openEntries: [open(100, 10, 1), open(101, 11, 2, 9, 'Attacker')],
      coveredTeamIds: new Set([2]),
    });
    expect(r.close).toHaveLength(0);
    expect(r.remove).toHaveLength(0);
    expect(r.counts.left).toBe(0);
  });

  it('두 팀에 동시에 있는 선수는 판정을 미룬다', () => {
    const r = run({
      snapshots: [snap(1, [[10, 7, 'Midfielder']]), snap(2, [[10, 21, 'Midfielder']])],
      openEntries: [open(100, 10, 1)],
      coveredTeamIds: new Set([1, 2]),
    });
    expect(r.ambiguous).toEqual([10]);
    expect(r.close).toHaveLength(0);
    expect(r.open).toHaveLength(0);
    expect(r.update).toHaveLength(0);
    expect(r.remove).toHaveLength(0);
  });

  it('열린 행이 둘이면 인덱스가 빠진 것이다 — 조용히 넘기지 않는다', () => {
    expect(() =>
      run({ snapshots: [snap(1, [[10, 7, 'Midfielder']])], openEntries: [open(100, 10, 1), open(101, 10, 2)] }),
    ).toThrow(/열린 소속이 둘/);
  });

  it('시나리오를 이어 붙여도 열린 행은 선수당 하나로 유지된다', () => {
    // 첫 수집 → 이적 → 방출 → 복귀 를 순서대로 적용하며 열린 집합을 추적
    let nextId = 1;
    let entries: OpenEntry[] = [];
    const apply = (snapshots: ReturnType<typeof snap>[], covered: number[], today = TODAY) => {
      const r = diffSquads({ today, snapshots, openEntries: entries, coveredTeamIds: new Set(covered) });
      const closed = new Set([...r.close, ...r.remove].map((x) => x.id));
      const updated = new Map(r.update.map((u) => [u.id, u]));
      entries = entries
        .filter((e) => !closed.has(e.id))
        .map((e) => (updated.has(e.id) ? { ...e, ...updated.get(e.id)! } : e))
        .concat(r.open.map((o) => ({ id: nextId++, validFrom: today, ...o })));
      return r;
    };

    apply([snap(1, [[10, 7, 'Midfielder']])], [1], '2026-08-01');
    expect(entries).toHaveLength(1);

    apply([snap(1, []), snap(2, [[10, 21, 'Midfielder']])], [1, 2], '2026-08-15');
    expect(entries).toHaveLength(1);
    expect(entries[0].teamId).toBe(2);

    apply([snap(1, []), snap(2, [])], [1, 2], '2026-09-01');
    expect(entries).toHaveLength(0);

    apply([snap(1, [[10, 7, 'Midfielder']])], [1], TODAY);
    expect(entries).toHaveLength(1);
    expect(entries[0].teamId).toBe(1);
  });
});
