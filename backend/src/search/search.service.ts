/**
 * 통합 검색 서비스 — 팀·선수·대회를 한 번에.
 *
 * 서비스에서 외부 API 호출 금지 (BACKEND_GUIDE) — DB 만 본다. Raw SQL 을 쓰는 이유:
 *   · GIN trgm + btree lower_prefix 인덱스를 계획기가 확실히 쓰도록 하려면 SQL 이 명시적이어야
 *   · 여러 컬럼 OR + localized_names JOIN + 정렬 규칙(prefix rank, 이름 길이, 팀은 tracked 참가) 을
 *     Prisma 로 표현하면 서브쿼리가 여러 층이라 계획이 예측 불가
 *
 * q 분기 (계약 값):
 *   · length >= 3 → ILIKE '%q%'  (GIN trigram 태움)
 *   · length === 2 → LOWER(col) LIKE LOWER($1) || '%'  (btree lower_prefix 태움 · ILIKE 쓰면 GIN 잡혀서 못 씀)
 *   · length <= 1 → 200 with 빈 items
 *
 * 정렬 (2026-09-10 사용자 실측 후 정정):
 *   팀·선수 공통:
 *     1. screen_six_bit desc — 화면 6대회 (is_tracked AND display_order <= 100 = 5리그 + UCL) 우선.
 *        원 D2 는 3번째였지만 실측(q=son → Sonseca 1위 · q=salah → I. Salah 1위)에서 시연 못 씀 → 최상위로 올림.
 *        이전 tracked_bit 은 컵도 포함해서 프랑스 하부 리그 팀이 섞였다 (컵이 is_tracked=true). display_order 필터 필수.
 *     2. prefix_rank asc — 접두 우선 (6대회 안에서 접두 매칭)
 *     3. name_len asc — 짧은 이름 우선
 *   선수 매칭 컬럼: p.name · p.lastname · localized_names(PLAYER).name/short_name
 *     firstname 매칭은 제거됨 (2026-09-10 · S. Sørli 가 Sondre firstname 으로 걸려 "왜 나오지" 발생).
 *     lastname 은 유지 (Sonko · Sonne 처럼 성으로 걸리는 것은 정당).
 *   선수 6대회 판정: player_match_stats (minutes > 0) 로 화면 6대회 has_top_flight=true 라운드 실 출전 확인.
 *     squad_entries.valid_to IS NULL 은 오래된 스냅샷이라 이적 · 신규 계약 반영 안 됨 (2026-09-10 실측: 살라·레반도프스키 자체 없음).
 *     player_match_stats + competition_rounds.has_top_flight (스키마 컬럼 · 문자열 라운드명 의존 금지) 로 판정.
 *   팀 6대회 판정: competition_entries 로 시즌 등록 확인 (UCL 리그페이즈 라운드 실 경기).
 *   최적화: screen_six_players/teams 는 CTE 로 한 번만 계산 · LEFT JOIN.
 *     초기 V1 (매칭 각 행에 EXISTS 서브쿼리) 은 q=son 선수 763ms · CTE + LEFT JOIN 으로 64ms. 2자 접두는 83ms (게이트 50ms 초과 · 왕복 300ms 에 묻힘).
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { toRef } from '../common/ref.js';
import { names } from '../common/names.dto.js';
import type {
  SearchCompetitionDto,
  SearchPlayerDto,
  SearchQueryDto,
  SearchResultsDto,
  SearchTeamDto,
} from './search.dto.js';

/** 팀 검색 raw row */
interface TeamRow {
  api_id: number;
  name: string;
  short_name: string | null;
  country: string | null;
  logo_url: string | null;
}

interface PlayerRow {
  api_id: number;
  name: string;
  firstname: string | null;
  lastname: string | null;
  photo_url: string | null;
  team_name: string | null;
}

interface CompetitionRow {
  api_id: number;
  name: string;
  country: string | null;
}

const DEFAULT_LIMIT = 5;
const MIN_Q_LEN = 2;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: SearchQueryDto): Promise<SearchResultsDto> {
    const query = q.q ?? '';
    const limit = q.limit ?? DEFAULT_LIMIT;
    const asOf = new Date().toISOString();

    if (query.length < MIN_Q_LEN) {
      return { q: query, teams: [], players: [], competitions: [], asOf };
    }

    const [teams, players, competitions] = await Promise.all([
      this.searchTeams(query, limit),
      this.searchPlayers(query, limit),
      this.searchCompetitions(query, limit),
    ]);

    return { q: query, teams, players, competitions, asOf };
  }

  /**
   * 팀 검색. 매칭 컬럼: teams.name · teams.short_name · localized_names(TEAM).name/short_name.
   * 정렬: prefix > partial > 이름 길이 짧은 순 > tracked 참가팀 우선.
   */
  private async searchTeams(q: string, limit: number): Promise<SearchTeamDto[]> {
    // 팀 6대회 판정: has_top_flight=true 라운드 실 경기에서 뛴 팀만. UCL 예선만 뛴 하부 팀 제외.
    const rows =
      q.length >= 3
        ? await this.prisma.$queryRaw<TeamRow[]>`
            WITH matches_q AS (
              SELECT DISTINCT t.id
              FROM teams t
              WHERE t.name ILIKE '%' || ${q} || '%'
                 OR (t.short_name IS NOT NULL AND t.short_name ILIKE '%' || ${q} || '%')
              UNION
              SELECT DISTINCT ln.entity_id AS id
              FROM localized_names ln
              WHERE ln.entity_type = 'TEAM'
                AND (ln.name ILIKE '%' || ${q} || '%'
                     OR (ln.short_name IS NOT NULL AND ln.short_name ILIKE '%' || ${q} || '%'))
            ),
            screen_six_teams AS (
              SELECT DISTINCT team_id FROM (
                SELECT m.home_team_id AS team_id
                FROM matches m
                JOIN competition_rounds cr ON cr.id = m.round_id
                JOIN competition_seasons cs ON cs.id = m.competition_season_id
                JOIN competitions c ON c.id = cs.competition_id
                WHERE c.is_tracked = true AND c.display_order <= 100 AND cr.has_top_flight = true
                UNION ALL
                SELECT m.away_team_id AS team_id
                FROM matches m
                JOIN competition_rounds cr ON cr.id = m.round_id
                JOIN competition_seasons cs ON cs.id = m.competition_season_id
                JOIN competitions c ON c.id = cs.competition_id
                WHERE c.is_tracked = true AND c.display_order <= 100 AND cr.has_top_flight = true
              ) x
            ),
            ranked AS (
              SELECT
                t.api_team_id AS api_id,
                t.name,
                t.short_name,
                t.country,
                t.logo_url,
                CASE
                  WHEN LOWER(t.name) LIKE LOWER(${q}) || '%' THEN 0
                  WHEN t.short_name IS NOT NULL AND LOWER(t.short_name) LIKE LOWER(${q}) || '%' THEN 0
                  WHEN EXISTS (
                    SELECT 1 FROM localized_names ln
                    WHERE ln.entity_type = 'TEAM' AND ln.entity_id = t.id
                      AND (LOWER(ln.name) LIKE LOWER(${q}) || '%'
                           OR (ln.short_name IS NOT NULL AND LOWER(ln.short_name) LIKE LOWER(${q}) || '%'))
                  ) THEN 0
                  ELSE 1
                END AS prefix_rank,
                LENGTH(t.name) AS name_len,
                CASE WHEN st.team_id IS NOT NULL THEN 1 ELSE 0 END AS screen_six_bit
              FROM teams t
              LEFT JOIN screen_six_teams st ON st.team_id = t.id
              WHERE t.id IN (SELECT id FROM matches_q)
            )
            SELECT api_id, name, short_name, country, logo_url
            FROM ranked
            ORDER BY screen_six_bit DESC, prefix_rank ASC, name_len ASC, name ASC
            LIMIT ${limit}
          `
        : await this.prisma.$queryRaw<TeamRow[]>`
            WITH matches_q AS (
              SELECT DISTINCT t.id
              FROM teams t
              WHERE LOWER(t.name) LIKE LOWER(${q}) || '%'
                 OR (t.short_name IS NOT NULL AND LOWER(t.short_name) LIKE LOWER(${q}) || '%')
              UNION
              SELECT DISTINCT ln.entity_id AS id
              FROM localized_names ln
              WHERE ln.entity_type = 'TEAM'
                AND (LOWER(ln.name) LIKE LOWER(${q}) || '%'
                     OR (ln.short_name IS NOT NULL AND LOWER(ln.short_name) LIKE LOWER(${q}) || '%'))
            ),
            screen_six_teams AS (
              SELECT DISTINCT team_id FROM (
                SELECT m.home_team_id AS team_id
                FROM matches m
                JOIN competition_rounds cr ON cr.id = m.round_id
                JOIN competition_seasons cs ON cs.id = m.competition_season_id
                JOIN competitions c ON c.id = cs.competition_id
                WHERE c.is_tracked = true AND c.display_order <= 100 AND cr.has_top_flight = true
                UNION ALL
                SELECT m.away_team_id AS team_id
                FROM matches m
                JOIN competition_rounds cr ON cr.id = m.round_id
                JOIN competition_seasons cs ON cs.id = m.competition_season_id
                JOIN competitions c ON c.id = cs.competition_id
                WHERE c.is_tracked = true AND c.display_order <= 100 AND cr.has_top_flight = true
              ) x
            )
            SELECT
              t.api_team_id AS api_id,
              t.name,
              t.short_name,
              t.country,
              t.logo_url
            FROM teams t
            LEFT JOIN screen_six_teams st ON st.team_id = t.id
            WHERE t.id IN (SELECT id FROM matches_q)
            ORDER BY
              (CASE WHEN st.team_id IS NOT NULL THEN 0 ELSE 1 END) ASC,
              LENGTH(t.name) ASC,
              t.name ASC
            LIMIT ${limit}
          `;

    return rows.map((r) => this.teamRow(r));
  }

  private teamRow(r: TeamRow): SearchTeamDto {
    return {
      ref: toRef(r.api_id, r.name),
      apiId: r.api_id,
      ...names(r.name, r.short_name),
      country: r.country,
      logoUrl: r.logo_url,
    };
  }

  /**
   * 선수 검색. 매칭 컬럼: players.name · firstname · lastname · localized_names(PLAYER).name/short_name.
   * teamName: 가장 최신 seasonYear 의 validTo IS NULL 인 squad_entries → teams.name (LATERAL join).
   */
  private async searchPlayers(q: string, limit: number): Promise<SearchPlayerDto[]> {
    // 선수 6대회 판정: player_match_stats (minutes > 0) + competition_rounds.has_top_flight.
    // 실 출전 기준 — 스냅샷(squad_entries)이 놓친 선수가 데이터에 있으면 정확 (규칙 위임).
    // 예: Bodo/Glimt UCL 리그페이즈 뛴 노르웨이 선수 s6=1 · UCL 예선만 뛴 선수 s6=0.
    const rows =
      q.length >= 3
        ? await this.prisma.$queryRaw<PlayerRow[]>`
            WITH matches_q AS (
              SELECT DISTINCT p.id
              FROM players p
              WHERE p.name ILIKE '%' || ${q} || '%'
                 OR (p.lastname IS NOT NULL AND p.lastname ILIKE '%' || ${q} || '%')
              UNION
              SELECT DISTINCT ln.entity_id AS id
              FROM localized_names ln
              WHERE ln.entity_type = 'PLAYER'
                AND (ln.name ILIKE '%' || ${q} || '%'
                     OR (ln.short_name IS NOT NULL AND ln.short_name ILIKE '%' || ${q} || '%'))
            ),
            screen_six_players AS (
              SELECT DISTINCT pms.player_id
              FROM player_match_stats pms
              JOIN matches m ON m.id = pms.match_id
              JOIN competition_rounds cr ON cr.id = m.round_id
              JOIN competition_seasons cs ON cs.id = m.competition_season_id
              JOIN competitions c ON c.id = cs.competition_id
              WHERE pms.minutes > 0
                AND c.is_tracked = true AND c.display_order <= 100
                AND cr.has_top_flight = true
            ),
            ranked AS (
              SELECT
                p.api_player_id AS api_id,
                p.name,
                p.firstname,
                p.lastname,
                p.photo_url,
                -- teamName: squad_entries 스냅샷 우선 · 없으면 가장 최근 출전 경기의 팀으로 폴백.
                -- squad_entries 가 놓친 선수(2026-09-10 실측: Salah · Lewandowski) 도 랭킹 s6=1 결정과 어긋나지 않도록.
                COALESCE(
                  (SELECT t.name FROM squad_entries se
                   JOIN teams t ON t.id = se.team_id
                   WHERE se.player_id = p.id AND se.valid_to IS NULL
                   ORDER BY se.season_year DESC LIMIT 1),
                  (SELECT t.name FROM player_match_stats pms
                   JOIN teams t ON t.id = pms.team_id
                   JOIN matches m ON m.id = pms.match_id
                   WHERE pms.player_id = p.id AND pms.minutes > 0
                   ORDER BY m.kickoff_at DESC LIMIT 1)
                ) AS team_name,
                CASE
                  WHEN LOWER(p.name) LIKE LOWER(${q}) || '%' THEN 0
                  WHEN p.lastname IS NOT NULL AND LOWER(p.lastname) LIKE LOWER(${q}) || '%' THEN 0
                  WHEN EXISTS (
                    SELECT 1 FROM localized_names ln
                    WHERE ln.entity_type = 'PLAYER' AND ln.entity_id = p.id
                      AND (LOWER(ln.name) LIKE LOWER(${q}) || '%'
                           OR (ln.short_name IS NOT NULL AND LOWER(ln.short_name) LIKE LOWER(${q}) || '%'))
                  ) THEN 0
                  ELSE 1
                END AS prefix_rank,
                LENGTH(p.name) AS name_len,
                CASE WHEN sp.player_id IS NOT NULL THEN 1 ELSE 0 END AS screen_six_bit
              FROM players p
              LEFT JOIN screen_six_players sp ON sp.player_id = p.id
              WHERE p.id IN (SELECT id FROM matches_q)
            )
            SELECT api_id, name, firstname, lastname, photo_url, team_name
            FROM ranked
            ORDER BY screen_six_bit DESC, prefix_rank ASC, name_len ASC, name ASC
            LIMIT ${limit}
          `
        : await this.prisma.$queryRaw<PlayerRow[]>`
            WITH matches_q AS (
              SELECT DISTINCT p.id
              FROM players p
              WHERE LOWER(p.name) LIKE LOWER(${q}) || '%'
                 OR (p.lastname IS NOT NULL AND LOWER(p.lastname) LIKE LOWER(${q}) || '%')
              UNION
              SELECT DISTINCT ln.entity_id AS id
              FROM localized_names ln
              WHERE ln.entity_type = 'PLAYER'
                AND (LOWER(ln.name) LIKE LOWER(${q}) || '%'
                     OR (ln.short_name IS NOT NULL AND LOWER(ln.short_name) LIKE LOWER(${q}) || '%'))
            ),
            screen_six_players AS (
              SELECT DISTINCT pms.player_id
              FROM player_match_stats pms
              JOIN matches m ON m.id = pms.match_id
              JOIN competition_rounds cr ON cr.id = m.round_id
              JOIN competition_seasons cs ON cs.id = m.competition_season_id
              JOIN competitions c ON c.id = cs.competition_id
              WHERE pms.minutes > 0
                AND c.is_tracked = true AND c.display_order <= 100
                AND cr.has_top_flight = true
            )
            SELECT
              p.api_player_id AS api_id,
              p.name,
              p.firstname,
              p.lastname,
              p.photo_url,
              COALESCE(
                (SELECT t.name FROM squad_entries se
                 JOIN teams t ON t.id = se.team_id
                 WHERE se.player_id = p.id AND se.valid_to IS NULL
                 ORDER BY se.season_year DESC LIMIT 1),
                (SELECT t.name FROM player_match_stats pms
                 JOIN teams t ON t.id = pms.team_id
                 JOIN matches m ON m.id = pms.match_id
                 WHERE pms.player_id = p.id AND pms.minutes > 0
                 ORDER BY m.kickoff_at DESC LIMIT 1)
              ) AS team_name
            FROM players p
            LEFT JOIN screen_six_players sp ON sp.player_id = p.id
            WHERE p.id IN (SELECT id FROM matches_q)
            ORDER BY
              (CASE WHEN sp.player_id IS NOT NULL THEN 0 ELSE 1 END) ASC,
              LENGTH(p.name) ASC,
              p.name ASC
            LIMIT ${limit}
          `;

    return rows.map((r) => this.playerRow(r));
  }

  private playerRow(r: PlayerRow): SearchPlayerDto {
    return {
      ref: toRef(r.api_id, r.name),
      apiId: r.api_id,
      ...names(r.name),
      photoUrl: r.photo_url,
      teamName: r.team_name,
    };
  }

  /**
   * 대회 검색. 매칭 컬럼: competitions.name · localized_names(COMPETITION).name/short_name.
   * competitions.short_name 컬럼 자체가 없다 (schema.prisma 확인). is_tracked 필터는 넣지 않는다 —
   * 검색은 추적 여부와 무관하게 이름이 맞으면 보여준다 (프론트가 필요하면 걸러낸다).
   */
  private async searchCompetitions(q: string, limit: number): Promise<SearchCompetitionDto[]> {
    const rows =
      q.length >= 3
        ? await this.prisma.$queryRaw<CompetitionRow[]>`
            WITH matches AS (
              SELECT DISTINCT c.id
              FROM competitions c
              WHERE c.name ILIKE '%' || ${q} || '%'
              UNION
              SELECT DISTINCT ln.entity_id AS id
              FROM localized_names ln
              WHERE ln.entity_type = 'COMPETITION'
                AND (ln.name ILIKE '%' || ${q} || '%'
                     OR (ln.short_name IS NOT NULL AND ln.short_name ILIKE '%' || ${q} || '%'))
            ),
            ranked AS (
              SELECT
                c.api_competition_id AS api_id,
                c.name,
                c.country,
                CASE
                  WHEN LOWER(c.name) LIKE LOWER(${q}) || '%' THEN 0
                  WHEN EXISTS (
                    SELECT 1 FROM localized_names ln
                    WHERE ln.entity_type = 'COMPETITION' AND ln.entity_id = c.id
                      AND (LOWER(ln.name) LIKE LOWER(${q}) || '%'
                           OR (ln.short_name IS NOT NULL AND LOWER(ln.short_name) LIKE LOWER(${q}) || '%'))
                  ) THEN 0
                  ELSE 1
                END AS prefix_rank,
                LENGTH(c.name) AS name_len
              FROM competitions c
              WHERE c.id IN (SELECT id FROM matches)
            )
            SELECT api_id, name, country
            FROM ranked
            ORDER BY prefix_rank ASC, name_len ASC, name ASC
            LIMIT ${limit}
          `
        : await this.prisma.$queryRaw<CompetitionRow[]>`
            WITH matches AS (
              SELECT DISTINCT c.id
              FROM competitions c
              WHERE LOWER(c.name) LIKE LOWER(${q}) || '%'
              UNION
              SELECT DISTINCT ln.entity_id AS id
              FROM localized_names ln
              WHERE ln.entity_type = 'COMPETITION'
                AND (LOWER(ln.name) LIKE LOWER(${q}) || '%'
                     OR (ln.short_name IS NOT NULL AND LOWER(ln.short_name) LIKE LOWER(${q}) || '%'))
            )
            SELECT
              c.api_competition_id AS api_id,
              c.name,
              c.country
            FROM competitions c
            WHERE c.id IN (SELECT id FROM matches)
            ORDER BY LENGTH(c.name) ASC, c.name ASC
            LIMIT ${limit}
          `;

    return rows.map((r) => this.competitionRow(r));
  }

  private competitionRow(r: CompetitionRow): SearchCompetitionDto {
    return {
      ref: toRef(r.api_id, r.name),
      apiId: r.api_id,
      ...names(r.name),
      country: r.country,
    };
  }
}
