/**
 * 모델(Gemini) 로 되돌리는 functionResponse 를 압축한다 — 프론트로 나가는 `data[]` 는 원본 유지.
 *
 * 왜:
 *   - 대회 6개 순위표(get_standings 모드 B)가 raw 76KB → 429 근본 (2026-09-10 실측).
 *   - 프론트 카드용 필드(logo·shortName·홈원정 split·detail flag)는 모델 판단에 필요 없다.
 *
 * 규칙 (04 결정 · 승인된 shape):
 *   - null 은 유지 (assists·ht·ft·et·pen 3상태를 못 섞는다 — DATA_RULES 3장).
 *   - form 은 원문 문자열 (c3 최근 5경기 근거).
 *   - competition.displayName 은 유지 (SYSTEM_PROMPT 매핑 없음 · 사용자 정정).
 *   - season.dataState 는 유지 (프론트 시즌 선택기 정책 · 어시스턴트도 시즌 유효성 판단에 씀).
 *   - primaryTeam.displayName 만 (get_player), team.displayName + ref (list_matches).
 *   - ht/ft/et/pen 은 home·away 둘 다 있으면 넣고, 아니면 null (get_match).
 *
 * 원본 mutation 금지 — `compressForModel` 은 새 객체를 만들어 반환한다.
 */

type StringMap = Record<string, unknown>;

function pickRef(t: { apiId?: number; ref?: string; displayName?: string } | null | undefined): { ref: string; displayName: string } | null {
  if (!t) return null;
  return {
    ref: String(t.ref ?? ''),
    displayName: String(t.displayName ?? ''),
  };
}

function pickCompetitionRef(c: { ref?: string; displayName?: string } | null | undefined): { ref: string; displayName: string } | null {
  if (!c) return null;
  return {
    ref: String(c.ref ?? ''),
    displayName: String(c.displayName ?? ''),
  };
}

function pickScorePair(pair: { home?: number | null; away?: number | null } | null | undefined): { home: number; away: number } | null {
  if (!pair) return null;
  if (typeof pair.home !== 'number' || typeof pair.away !== 'number') return null;
  return { home: pair.home, away: pair.away };
}

/** ─── get_standings (모드 A 단일 · 모드 B 6대회 items[]) ─── */
function compressStandingsTable(t: StringMap): StringMap {
  const comp = t.competition as { ref?: string } | undefined;
  const season = t.season as { year?: number } | undefined;
  const rows = Array.isArray(t.rows) ? t.rows : [];
  return {
    competition: { ref: String(comp?.ref ?? '') },
    season: { year: Number(season?.year ?? 0) },
    unavailableReason: t.unavailableReason ?? null,
    asOf: t.asOf,
    rows: rows.map((r) => {
      const row = r as StringMap;
      const team = row.team as { ref?: string; displayName?: string } | null | undefined;
      return {
        rank: row.rank,
        groupName: row.groupName ?? null,
        team: pickRef(team),
        played: row.played,
        win: row.win,
        draw: row.draw,
        lose: row.lose,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDiff: row.goalDiff,
        points: row.points,
        form: row.form ?? null,
      };
    }),
  };
}

function compressStandings(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const d = data as StringMap;
  const items = Array.isArray(d.items) ? d.items : [];
  return {
    items: items.map((it) => compressStandingsTable(it as StringMap)),
    asOf: d.asOf,
  };
}

/** ─── list_matches (default 10 이후) ─── */
function compressMatchItemForList(m: StringMap): StringMap {
  const home = m.home as { ref?: string; displayName?: string } | undefined;
  const away = m.away as { ref?: string; displayName?: string } | undefined;
  const comp = m.competition as { ref?: string } | undefined;
  const round = m.round as { name?: string } | undefined;
  const goals = m.goals as { home?: number | null; away?: number | null } | undefined;
  return {
    id: m.id,
    kickoffAt: m.kickoffAt,
    statusShort: m.statusShort,
    goals: {
      home: goals?.home ?? null,
      away: goals?.away ?? null,
    },
    home: pickRef(home),
    away: pickRef(away),
    competition: { ref: String(comp?.ref ?? '') },
    round: { name: String(round?.name ?? '') },
  };
}

function compressListMatches(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const d = data as StringMap;
  const items = Array.isArray(d.items) ? d.items : [];
  return {
    total: d.total,
    hasMore: d.hasMore,
    items: items.map((it) => compressMatchItemForList(it as StringMap)),
  };
}

/** ─── get_match (list item + 상세) ─── */
function compressGetMatch(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const m = data as StringMap;
  const base = compressMatchItemForList(m);
  const venueRaw = m.venue as { name?: string; city?: string | null } | null | undefined;
  return {
    ...base,
    statusLong: m.statusLong ?? null,
    referee: m.referee ?? null,
    winnerTeamRef: m.winnerTeamRef ?? null,
    venue: venueRaw ? { name: venueRaw.name ?? '', city: venueRaw.city ?? null } : null,
    ht: pickScorePair(m.ht as { home?: number | null; away?: number | null } | null | undefined),
    ft: pickScorePair(m.ft as { home?: number | null; away?: number | null } | null | undefined),
    et: pickScorePair(m.et as { home?: number | null; away?: number | null } | null | undefined),
    pen: pickScorePair(m.pen as { home?: number | null; away?: number | null } | null | undefined),
  };
}

/** ─── list_competitions ─── */
function compressListCompetitions(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const d = data as StringMap;
  const items = Array.isArray(d.items) ? d.items : [];
  return {
    items: items.map((it) => {
      const c = it as StringMap;
      const cur = c.currentSeason as { year?: number; dataState?: string } | null | undefined;
      return {
        ref: c.ref,
        displayName: c.displayName,
        type: c.type,
        format: c.format,
        currentSeason: cur ? { year: cur.year, dataState: cur.dataState } : null,
      };
    }),
  };
}

/** ─── get_competition ─── */
function compressGetCompetition(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const c = data as StringMap;
  const seasons = Array.isArray(c.seasons) ? c.seasons : [];
  return {
    ref: c.ref,
    displayName: c.displayName,
    country: c.country,
    type: c.type,
    format: c.format,
    topFlightRef: c.topFlightRef ?? null,
    seasons: seasons.map((s) => {
      const seas = s as StringMap;
      return { year: seas.year, dataState: seas.dataState };
    }),
  };
}

/** ─── list_teams ─── */
function compressListTeams(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const d = data as StringMap;
  const items = Array.isArray(d.items) ? d.items : [];
  return {
    items: items.map((it) => {
      const t = it as StringMap;
      return {
        ref: t.ref,
        displayName: t.displayName,
        country: t.country ?? null,
        founded: t.founded ?? null,
      };
    }),
  };
}

/** ─── get_team (0.9KB · 최소 압축) ─── */
function compressGetTeam(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const t = data as StringMap;
  const venue = t.venue as { name?: string; city?: string | null; capacity?: number | null } | null | undefined;
  const participations = Array.isArray(t.participations) ? t.participations : [];
  return {
    ref: t.ref,
    displayName: t.displayName,
    country: t.country ?? null,
    founded: t.founded ?? null,
    ...(venue
      ? { venue: { name: venue.name ?? '', city: venue.city ?? null, capacity: venue.capacity ?? null } }
      : {}),
    participations: participations.map((p) => {
      const par = p as StringMap;
      return {
        competitionRef: par.competitionRef,
        seasons: par.seasons,
      };
    }),
  };
}

/** ─── get_player (사용자 정정 4건 반영) ─── */
function compressGetPlayer(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const p = data as StringMap;
  const primary = p.primaryTeam as { ref?: string; displayName?: string } | null | undefined;
  const seasonStats = Array.isArray(p.seasonStats) ? p.seasonStats : [];
  const totals = p.totals as StringMap | undefined;
  return {
    ref: p.ref,
    displayName: p.displayName,
    birthDate: p.birthDate ?? null,
    birthPlace: p.birthPlace ?? null,
    birthCountry: p.birthCountry ?? null,
    nationality: p.nationality ?? null,
    position: p.position ?? null,
    jerseyNumber: p.jerseyNumber ?? null,
    heightCm: p.heightCm ?? null,
    weightKg: p.weightKg ?? null,
    ...(primary ? { primaryTeam: pickRef(primary) } : { primaryTeam: null }),
    seasonStats: seasonStats.map((s) => {
      const st = s as StringMap;
      const comp = st.competition as { ref?: string; displayName?: string } | undefined;
      const season = st.season as { year?: number; dataState?: string } | undefined;
      const team = st.team as { displayName?: string } | undefined;
      return {
        competition: { ref: String(comp?.ref ?? ''), displayName: String(comp?.displayName ?? '') },
        season: { year: season?.year, dataState: (season as StringMap | undefined)?.dataState ?? null },
        team: { displayName: String(team?.displayName ?? '') },
        appearances: st.appearances,
        minutes: st.minutes,
        goals: st.goals,
        // null 유지 (assists 3상태 · DATA_RULES 3장)
        assists: st.assists ?? null,
        yellowCards: st.yellowCards,
        redCards: st.redCards,
      };
    }),
    totals: totals
      ? {
          appearances: totals.appearances,
          minutes: totals.minutes,
          goals: totals.goals,
          assists: totals.assists ?? null,
          yellowCards: totals.yellowCards,
          redCards: totals.redCards,
        }
      : null,
  };
}

/** ─── get_top_scorers · get_top_assisters (모드 A / 모드 B) ─── */
function compressRankings(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const d = data as StringMap;
  const compRaw = d.competition as { ref?: string; displayName?: string } | null | undefined;
  const seasonRaw = d.season as { year?: number } | null | undefined;
  const items = Array.isArray(d.items) ? d.items : [];
  return {
    ...(compRaw ? { competition: pickCompetitionRef(compRaw) } : { competition: null }),
    ...(seasonRaw ? { season: { year: seasonRaw.year } } : { season: null }),
    asOf: d.asOf,
    items: items.map((it) => {
      const r = it as StringMap;
      const player = r.player as { ref?: string; displayName?: string } | undefined;
      const team = r.team as { ref?: string; displayName?: string } | undefined;
      const bd = Array.isArray(r.breakdown) ? r.breakdown : null;
      const out: StringMap = {
        rank: r.rank,
        value: r.value,
        player: pickRef(player),
        team: pickRef(team),
      };
      if (bd) {
        out.breakdown = bd.map((b) => {
          const be = b as StringMap;
          const bc = be.competition as { ref?: string; displayName?: string } | undefined;
          const bs = be.season as { year?: number } | undefined;
          return {
            competition: pickCompetitionRef(bc),
            season: { year: bs?.year },
            value: be.value,
          };
        });
      }
      return out;
    }),
  };
}

const COMPRESSORS: Record<string, (data: unknown) => unknown> = {
  list_competitions: compressListCompetitions,
  get_competition: compressGetCompetition,
  list_teams: compressListTeams,
  get_team: compressGetTeam,
  list_matches: compressListMatches,
  get_match: compressGetMatch,
  get_standings: compressStandings,
  get_top_scorers: compressRankings,
  get_top_assisters: compressRankings,
  get_player: compressGetPlayer,
};

/**
 * 도구 이름에 따라 압축 함수를 골라 새 객체를 만들어 반환한다.
 * 미등록 도구는 원본을 그대로 넘긴다 (안전 폴백 — 잘못 압축해 필드가 빠지느니 통과).
 */
export function compressForModel(toolName: string, data: unknown): unknown {
  const fn = COMPRESSORS[toolName];
  if (!fn) return data;
  return fn(data);
}
