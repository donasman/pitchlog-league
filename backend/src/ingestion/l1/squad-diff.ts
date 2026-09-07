/**
 * 스쿼드 diff — 판정만 하는 순수 함수 (BACKEND_FEATURES L1 #8, "v2 최대 리스크")
 *
 * API 는 현재 스냅샷만 준다. 이력을 만드는 건 우리 몫이다 (SCHEMA_DESIGN 6-1).
 * DB 접근을 섞지 않는 이유는 관문 테스트 때문이다 — 이적·복귀·방출 시나리오를
 * DB 왕복 없이 표로 검증할 수 있어야 한다.
 *
 * ## 팀별로 즉시 쓰면 안 된다
 * 선수가 A→B 로 이적했을 때 B 를 먼저 처리하면 A 의 열린 행이 살아 있어
 * partial unique `(player_id, season_year) WHERE valid_to IS NULL` 가 터진다.
 * 그래서 호출자는 전 팀 스냅샷을 모은 뒤 이 함수를 **한 번** 부르고,
 * 결과를 remove → close → update → open 순서로 한 트랜잭션에 쓴다.
 *
 * ## 시간 모델
 * `validFrom` 은 실제 이적일이 아니라 **수집일**이다. 주 1회 수집이면 최대 7일 오차라
 * 경기의 팀 귀속을 이 값으로 판단하면 안 된다 (설계검토 A-2).
 */

/** 스냅샷의 선수 한 명. playerId 는 내부 id — 호출자가 players upsert 로 먼저 확보한다 */
export interface SnapshotPlayer {
  playerId: number;
  jerseyNumber: number | null;
  position: string | null;
}

export interface TeamSnapshot {
  teamId: number;
  players: SnapshotPlayer[];
}

/** 이 시즌에 열려 있는(valid_to IS NULL) 소속 행. 팀과 무관하게 전부 넘긴다 */
export interface OpenEntry {
  id: number;
  playerId: number;
  teamId: number;
  jerseyNumber: number | null;
  position: string | null;
  /** YYYY-MM-DD */
  validFrom: string;
}

export interface DiffInput {
  /** 수집일 YYYY-MM-DD */
  today: string;
  /** 가드를 통과해 실제로 관측한 팀만 */
  snapshots: TeamSnapshot[];
  openEntries: OpenEntry[];
  /**
   * 이번 실행이 관측한 팀 id.
   * 관측하지 않은 팀의 열린 행은 건드리지 않는다 — 추적 밖 구단으로 간 선수를
   * "사라졌다" 고 닫아 버리면 이력이 거짓이 된다.
   */
  coveredTeamIds: ReadonlySet<number>;
}

export interface DiffResult {
  /** valid_to = today 로 닫는다 */
  close: { id: number }[];
  /**
   * 지운다. valid_from 이 오늘인 행이 오늘 안에 틀린 것으로 밝혀진 경우뿐이다.
   * 닫으면 valid_from = valid_to 인 0일짜리 이력이 남는다.
   */
  remove: { id: number }[];
  /** 같은 팀 안의 등번호·포지션 변경, 또는 같은 날 안에서의 팀 정정 */
  update: { id: number; teamId: number; jerseyNumber: number | null; position: string | null }[];
  /** 새 소속 행 */
  open: { playerId: number; teamId: number; jerseyNumber: number | null; position: string | null }[];
  counts: {
    arrived: number;
    left: number;
    moved: number;
    changed: number;
    unchanged: number;
    /** 같은 날 재실행에서 정정된 건수 — 0일 행을 만들지 않은 횟수 */
    sameDayFixed: number;
  };
  /**
   * 두 팀 스냅샷에 동시에 있어 판정을 미룬 선수.
   * 이적 진행 중에 양쪽 구단이 함께 올려 두는 일이 실제로 있다.
   * 어느 쪽이 참인지 알 수 없으므로 **이번 실행에서는 건드리지 않는다** —
   * 임의로 고르면 틀린 이력이 남고, 다음 주에는 대개 한쪽만 남는다.
   */
  ambiguous: number[];
}

const emptyCounts = (): DiffResult['counts'] => ({
  arrived: 0,
  left: 0,
  moved: 0,
  changed: 0,
  unchanged: 0,
  sameDayFixed: 0,
});

function differs(a: SnapshotPlayer, b: OpenEntry): boolean {
  return a.jerseyNumber !== b.jerseyNumber || a.position !== b.position;
}

export function diffSquads(input: DiffInput): DiffResult {
  const { today, snapshots, openEntries, coveredTeamIds } = input;

  const result: DiffResult = { close: [], remove: [], update: [], open: [], counts: emptyCounts(), ambiguous: [] };

  // partial unique 가 시즌당 선수 1행을 보장하므로 Map 으로 눌러도 안전하다.
  // 그래도 중복이 오면 그건 인덱스가 없다는 뜻이라 조용히 넘기지 않는다.
  const openByPlayer = new Map<number, OpenEntry>();
  for (const e of openEntries) {
    const prev = openByPlayer.get(e.playerId);
    if (prev) {
      throw new Error(
        `선수 ${e.playerId} 에 열린 소속이 둘이다 (행 ${prev.id}, ${e.id}). ` +
          'partial unique squad_entries_current_uq 가 빠졌는지 확인한다',
      );
    }
    openByPlayer.set(e.playerId, e);
  }

  // 스냅샷을 선수 단위로 평평하게.
  // 한 선수가 두 팀에 동시에 있으면 판정을 미룬다 — 이적 진행 중 양쪽 구단이 함께 올려 두는 일이 있다
  const observed = new Map<number, SnapshotPlayer & { teamId: number }>();
  const ambiguous = new Set<number>();
  for (const snap of snapshots) {
    for (const p of snap.players) {
      const prev = observed.get(p.playerId);
      if (prev && prev.teamId !== snap.teamId) {
        ambiguous.add(p.playerId);
        continue;
      }
      observed.set(p.playerId, { ...p, teamId: snap.teamId });
    }
  }
  for (const id of ambiguous) observed.delete(id);
  result.ambiguous = [...ambiguous].sort((a, b) => a - b);

  // 1. 관측된 선수
  for (const [playerId, o] of observed) {
    const open = openByPlayer.get(playerId);

    if (!open) {
      result.open.push({ playerId, teamId: o.teamId, jerseyNumber: o.jerseyNumber, position: o.position });
      result.counts.arrived++;
      continue;
    }

    if (open.teamId === o.teamId) {
      if (differs(o, open)) {
        result.update.push({ id: open.id, teamId: o.teamId, jerseyNumber: o.jerseyNumber, position: o.position });
        result.counts.changed++;
      } else {
        result.counts.unchanged++;
      }
      continue;
    }

    // 팀이 바뀌었다
    if (open.validFrom === today) {
      // 오늘 만든 행이 오늘 안에 틀린 것으로 밝혀졌다 — 닫으면 0일짜리 이력이 남는다.
      // 그 자리에서 고친다 (같은 날 재실행)
      result.update.push({ id: open.id, teamId: o.teamId, jerseyNumber: o.jerseyNumber, position: o.position });
      result.counts.sameDayFixed++;
      continue;
    }

    result.close.push({ id: open.id });
    result.open.push({ playerId, teamId: o.teamId, jerseyNumber: o.jerseyNumber, position: o.position });
    result.counts.moved++;
  }

  // 2. 열려 있는데 관측되지 않은 선수
  for (const [playerId, open] of openByPlayer) {
    if (observed.has(playerId)) continue;
    // 어느 팀이 참인지 모르는 선수는 닫지도 않는다
    if (ambiguous.has(playerId)) continue;
    // 그 팀을 이번에 보지 않았다면 사라졌다고 말할 수 없다
    if (!coveredTeamIds.has(open.teamId)) continue;

    if (open.validFrom === today) {
      // 오늘 만든 행이 오늘 사라졌다 — 닫으면 0일짜리 이력이 남는다
      result.remove.push({ id: open.id });
      result.counts.sameDayFixed++;
      continue;
    }

    result.close.push({ id: open.id });
    result.counts.left++;
  }

  return result;
}
