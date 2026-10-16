/**
 * MCP 도구 description 공용 상수 — 04 결정 D3 그대로.
 *
 * 각 도구 description = NUMERIC_SEMANTICS + '\n\n' + <도구별 특이 문구>
 *                       + (모드 B 도구면) '\n\n' + MODE_B_NOTE
 *                       + (ref 인자 있으면) '\n\n' + REF_HINT
 *
 * 원칙:
 * - 3상태 설명(NUMERIC_SEMANTICS)에 도구 특유의 예시 필드를 섞지 않는다 — 예시는 각 도구 특이 문구 안에서.
 * - passesAccuracy 는 어디에도 언급하지 않는다 (M3-a).
 */

export const NUMERIC_SEMANTICS =
  'NUMERIC VALUE SEMANTICS (critical — do not conflate):\n' +
  '- `0`    = actual zero occurrences (recorded).\n' +
  '- `null` = not measured / not provided (render as "-" in UI, exclude from sums).\n' +
  '- Missing-data flags = API did not provide this data (see field-specific notes below).\n' +
  '\n' +
  'Do NOT sum `null` as `0`. Do NOT rank a `null` rating as the worst.';

export const MODE_B_NOTE =
  'If `competition` is omitted, results are aggregated across the 6 display competitions\n' +
  '(Premier League, La Liga, Serie A, Bundesliga, Ligue 1, UEFA Champions League).\n' +
  'Domestic cups, super cups, UEFA Europa League, and UEFA Europa Conference League are NOT included\n' +
  'in this aggregate — query them individually with a `competition` ref.';

export const REF_HINT =
  'Ref hint: obtain competition/team/player refs via `list_competitions` / `list_teams` first — do not guess ids.';

/** 각 도구의 특이 문구. 3상태 · 모드 B · ref hint 는 여기 안에 넣지 않는다 — composeDescription 이 붙인다. */
export const TOOL_NOTES = {
  list_competitions:
    'Returns all tracked competitions (5 major leagues + UCL + UEFA Europa League + UEFA Europa Conference League + 6 domestic cups + 5 super cups), sorted by displayOrder. ' +
    'This tool is the source of truth for what competitions the service covers — do not hardcode the list or count elsewhere. ' +
    'Each item includes currentSeason (may be null for unregistered cups) and dataState (NONE/PARTIAL/COMPLETE) — ' +
    'the UI season selector shows COMPLETE only.',

  get_competition:
    'Fetch one competition by ref (e.g. "39-premier-league" or just "39"). ' +
    'Includes all tracked seasons (newest first) and topFlightRef for cups (null for leagues). ' +
    '404 if untracked or unknown.',

  list_teams:
    'Requires competition ref. Season defaults to the current season of that competition. ' +
    'Returns competition entries sorted alphabetically by team name. ' +
    'There is no whole-competitions team list.',

  get_team:
    'Fetch one team by ref. Includes venue (may be null for cup-only sub-teams) and ' +
    'participations (competitions the team has entered, ordered by displayOrder, seasons newest first). ' +
    'Does NOT include squad.',

  list_matches:
    'KST date filter: from/to are YYYY-MM-DD (inclusive, treated as KST 00:00 to 23:59:59). ' +
    'team is a team ref (home or away). ' +
    'Auto-defaults when no team/from/to: from = today-7d, to = today+7d (KST). ' +
    'When `competition` is omitted, aggregates across ALL tracked competitions (leagues, cups, super cups, UCL, UEL, UECL) — not just the 6 display leagues. ' +
    'Result is truncated to limit (default 10, max 200); wrapper carries {truncated, total} when applied. ' +
    'hasEvents / hasLineups / hasTeamStats / hasPlayerStats are 3-valued: ' +
    'null=not yet checked, false=checked and API had none, true=present.',

  get_match:
    'Fetch one match by fixture ref. Includes goals/ht/ft/et/pen scores (null in a pair means the phase did not occur), ' +
    'winnerTeamRef (null on draw or unfinished). ' +
    'hasEvents / hasLineups / hasTeamStats / hasPlayerStats are 3-valued: ' +
    'null=not yet checked, false=checked and API had none, true=present. ' +
    'statsState is the single source for the recheck/confirmed UI badge.',

  get_standings:
    "Returns rows[] for a league. For cup competitions (KNOCKOUT format), items[].rows is [] and unavailableReason='KNOCKOUT'. " +
    "For leagues that haven't started, unavailableReason='EMPTY'. Neither is an error — both return HTTP 200. " +
    'Rows are ordered by groupName then rank. ' +
    'Values (points/played/W/D/L/goalsFor/etc.) are integers; form is a raw string like "WWDLW". ' +
    'USAGE: for a question about ONE competition, competition MUST be provided. ' +
    'Omit competition (Mode B, all 6 display leagues = leagues5+UCL aggregated) ONLY when the user explicitly asks for a cross-league comparison. ' +
    'Mode B returns 6× the payload (~27 KB compressed) — do not use it for single-league questions. ' +
    'Cups, super cups, UEFA Europa League, and UEFA Europa Conference League have no standings (KNOCKOUT format or excluded from Mode B) — query them individually only if standings apply.',

  get_top_scorers:
    "Self-aggregated from player_match_stats.goals_total (2026-09-17 · DATA_RULES 8장). " +
    "PER-COMPETITION ONLY (2차 개정 2026-09-17): `competition` is REQUIRED. Any tracked competition works (leagues, cups, super cups, UCL, UEL, UECL — 19 total). " +
    "Cross-competition aggregate ranking was discontinued because league matches and cup 1st-round matches have different opponent levels — combining them mispresents the ranking. " +
    "items[].value = goals · items[].minutes = total minutes played · items[].assists exposed for tiebreak transparency. " +
    "Ordering (deterministic): goals DESC → assists DESC → minutes ASC → player_id ASC. " +
    "items[].team = team the player played most matches for in this competition (tiebreak: most recent match). " +
    "For a player's season-wide totals across all competitions, call get_player and read `seasonTotals`.",

  get_top_assisters:
    "Same structure as get_top_scorers but source column = player_match_stats.assists · `competition` REQUIRED. " +
    "Ordering: assists DESC → goals DESC → minutes ASC → player_id ASC. " +
    'Note: some seasons/competitions do not provide assists data — those players will simply be absent ' +
    '(items shorter than limit), not filled with zeros.',

  get_player:
    'Fetch one player by ref. Includes primaryTeam (current squad entry with validTo IS NULL, may be null), ' +
    'jerseyNumber, position, seasonStats[] (season desc → competition displayOrder asc), and totals. ' +
    'IMPORTANT NULL RULES: seasonStats[].assists and .yellowredCards are null when the API did not provide them ' +
    '(some past seasons). totals.assists is null if ANY seasonStats row has null assists — do not sum null as 0.',
} as const;

export interface ComposeOpts {
  modeB?: boolean;
  refHint?: boolean;
}

/** description 조립기 — 3상태 → 도구 특이 → (모드 B) → (ref hint) 순 */
export function composeDescription(note: string, opts: ComposeOpts = {}): string {
  const parts: string[] = [NUMERIC_SEMANTICS, note];
  if (opts.modeB) parts.push(MODE_B_NOTE);
  if (opts.refHint) parts.push(REF_HINT);
  return parts.join('\n\n');
}
