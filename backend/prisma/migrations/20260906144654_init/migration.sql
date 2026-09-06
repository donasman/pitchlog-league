-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('LEAGUE', 'CUP', 'SUPER_CUP');

-- CreateEnum
CREATE TYPE "CompetitionFormat" AS ENUM ('ROUND_ROBIN', 'LEAGUE_PHASE_KNOCKOUT', 'KNOCKOUT');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "DetailRetention" AS ENUM ('FULL', 'AGGREGATED_ONLY');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('PERMANENT', 'LOAN', 'LOAN_RETURN', 'YOUTH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MatchLeg" AS ENUM ('FIRST', 'SECOND', 'SINGLE');

-- CreateEnum
CREATE TYPE "WinReason" AS ENUM ('AGGREGATE', 'EXTRA_TIME', 'PENALTIES', 'WALKOVER');

-- CreateEnum
CREATE TYPE "TieStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'DECIDED');

-- CreateEnum
CREATE TYPE "SlotState" AS ENUM ('CONFIRMED', 'PENDING_WINNER', 'UNDRAWN');

-- CreateEnum
CREATE TYPE "RankingCategory" AS ENUM ('SCORERS', 'ASSISTS', 'YELLOW_CARDS', 'RED_CARDS');

-- CreateEnum
CREATE TYPE "StatsSource" AS ENUM ('AGGREGATED', 'API');

-- CreateEnum
CREATE TYPE "ExternalSource" AS ENUM ('API_FOOTBALL', 'SPORTMONKS');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('COMPETITION', 'TEAM', 'PLAYER', 'COACH', 'VENUE', 'ROUND');

-- CreateEnum
CREATE TYPE "LocaleSource" AS ENUM ('MANUAL', 'API', 'AUTO');

-- CreateEnum
CREATE TYPE "BackfillPhase" AS ENUM ('PENDING', 'L0', 'FIXTURES', 'DETAILS', 'RANKINGS', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "IngestionLayer" AS ENUM ('L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'BACKFILL');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "competitions" (
    "id" SERIAL NOT NULL,
    "api_competition_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "country_code" TEXT,
    "logo_url" TEXT,
    "type" "CompetitionType" NOT NULL,
    "format" "CompetitionFormat" NOT NULL,
    "top_flight_competition_id" INTEGER,
    "is_tracked" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_seasons" (
    "id" SERIAL NOT NULL,
    "competition_id" INTEGER NOT NULL,
    "season_id" INTEGER NOT NULL,
    "api_season_value" INTEGER NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "status" "SeasonStatus" NOT NULL DEFAULT 'UPCOMING',
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "coverage" JSONB,
    "list_from_round_id" INTEGER,
    "detail_cutoff_round_id" INTEGER,
    "detail_retention" "DetailRetention" NOT NULL DEFAULT 'FULL',
    "as_of" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "competition_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_rounds" (
    "id" SERIAL NOT NULL,
    "competition_season_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "team_count" INTEGER,
    "match_count" INTEGER,
    "is_late_stage" BOOLEAN NOT NULL DEFAULT false,
    "has_top_flight" BOOLEAN NOT NULL DEFAULT false,
    "first_kickoff_at" TIMESTAMPTZ(6),

    CONSTRAINT "competition_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" SERIAL NOT NULL,
    "api_venue_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "capacity" INTEGER,
    "surface" TEXT,
    "image_url" TEXT,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "api_team_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "code" TEXT,
    "country" TEXT,
    "founded" INTEGER,
    "logo_url" TEXT,
    "venue_id" INTEGER,
    "first_seen_competition_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_entries" (
    "id" SERIAL NOT NULL,
    "competition_season_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,

    CONSTRAINT "competition_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_ids" (
    "id" SERIAL NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "source" "ExternalSource" NOT NULL,
    "external_id" TEXT NOT NULL,

    CONSTRAINT "external_ids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" SERIAL NOT NULL,
    "api_player_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "firstname" TEXT,
    "lastname" TEXT,
    "birth_date" DATE,
    "birth_place" TEXT,
    "birth_country" TEXT,
    "nationality" TEXT,
    "height_cm" INTEGER,
    "weight_kg" INTEGER,
    "photo_url" TEXT,
    "profile_fetched_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "squad_entries" (
    "id" SERIAL NOT NULL,
    "player_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "season_year" INTEGER NOT NULL,
    "jersey_number" INTEGER,
    "position" TEXT,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "observed_at" TIMESTAMPTZ(6) NOT NULL,
    "transfer_type" "TransferType" NOT NULL DEFAULT 'UNKNOWN',
    "parent_team_id" INTEGER,

    CONSTRAINT "squad_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaches" (
    "id" SERIAL NOT NULL,
    "api_coach_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "birth_date" DATE,
    "nationality" TEXT,
    "photo_url" TEXT,

    CONSTRAINT "coaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_tenures" (
    "id" SERIAL NOT NULL,
    "coach_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "observed_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "coach_tenures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" SERIAL NOT NULL,
    "api_fixture_id" INTEGER NOT NULL,
    "competition_season_id" INTEGER NOT NULL,
    "round_id" INTEGER NOT NULL,
    "kickoff_at" TIMESTAMPTZ(6) NOT NULL,
    "status_short" TEXT NOT NULL,
    "status_long" TEXT,
    "elapsed" INTEGER,
    "extra_elapsed" INTEGER,
    "venue_id" INTEGER,
    "referee" TEXT,
    "home_team_id" INTEGER NOT NULL,
    "away_team_id" INTEGER NOT NULL,
    "goals_home" INTEGER,
    "goals_away" INTEGER,
    "ht_home" INTEGER,
    "ht_away" INTEGER,
    "ft_home" INTEGER,
    "ft_away" INTEGER,
    "et_home" INTEGER,
    "et_away" INTEGER,
    "pen_home" INTEGER,
    "pen_away" INTEGER,
    "winner_team_id" INTEGER,
    "tie_id" INTEGER,
    "leg" "MatchLeg",
    "detail_eligible" BOOLEAN NOT NULL DEFAULT false,
    "has_events" BOOLEAN,
    "has_lineups" BOOLEAN,
    "has_team_stats" BOOLEAN,
    "has_player_stats" BOOLEAN,
    "detail_checked_at" TIMESTAMPTZ(6),
    "data_version" INTEGER NOT NULL DEFAULT 0,
    "as_of" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knockout_ties" (
    "id" SERIAL NOT NULL,
    "competition_season_id" INTEGER NOT NULL,
    "round_id" INTEGER NOT NULL,
    "home_team_id" INTEGER NOT NULL,
    "away_team_id" INTEGER NOT NULL,
    "first_leg_match_id" INTEGER,
    "second_leg_match_id" INTEGER,
    "aggregate_home" INTEGER,
    "aggregate_away" INTEGER,
    "winner_team_id" INTEGER,
    "win_reason" "WinReason",
    "status" "TieStatus" NOT NULL DEFAULT 'SCHEDULED',
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "knockout_ties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bracket_slots" (
    "id" SERIAL NOT NULL,
    "competition_season_id" INTEGER NOT NULL,
    "round_id" INTEGER NOT NULL,
    "slot_index" INTEGER NOT NULL,
    "state" "SlotState" NOT NULL DEFAULT 'UNDRAWN',
    "match_id" INTEGER,
    "tie_id" INTEGER,
    "source_slot_a_id" INTEGER,
    "source_slot_b_id" INTEGER,
    "placeholder_label" TEXT,

    CONSTRAINT "bracket_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_events" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "minute_extra" INTEGER,
    "team_id" INTEGER NOT NULL,
    "player_id" INTEGER,
    "assist_player_id" INTEGER,
    "type" TEXT NOT NULL,
    "detail" TEXT,
    "comments" TEXT,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_lineups" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "formation" TEXT,
    "coach_id" INTEGER,

    CONSTRAINT "match_lineups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineup_entries" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "player_id" INTEGER NOT NULL,
    "jersey_number" INTEGER,
    "position" TEXT,
    "grid" TEXT,
    "is_starter" BOOLEAN NOT NULL,

    CONSTRAINT "lineup_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_match_stats" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "shots_on_goal" INTEGER NOT NULL DEFAULT 0,
    "shots_off_goal" INTEGER NOT NULL DEFAULT 0,
    "total_shots" INTEGER NOT NULL DEFAULT 0,
    "blocked_shots" INTEGER NOT NULL DEFAULT 0,
    "shots_insidebox" INTEGER NOT NULL DEFAULT 0,
    "shots_outsidebox" INTEGER NOT NULL DEFAULT 0,
    "fouls" INTEGER NOT NULL DEFAULT 0,
    "corner_kicks" INTEGER NOT NULL DEFAULT 0,
    "offsides" INTEGER NOT NULL DEFAULT 0,
    "ball_possession" INTEGER NOT NULL DEFAULT 0,
    "yellow_cards" INTEGER NOT NULL DEFAULT 0,
    "red_cards" INTEGER NOT NULL DEFAULT 0,
    "goalkeeper_saves" INTEGER NOT NULL DEFAULT 0,
    "total_passes" INTEGER NOT NULL DEFAULT 0,
    "passes_accurate" INTEGER NOT NULL DEFAULT 0,
    "passes_percentage" INTEGER NOT NULL DEFAULT 0,
    "expected_goals" DECIMAL(5,2),
    "goals_prevented" DECIMAL(5,2),

    CONSTRAINT "team_match_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_match_stats" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "player_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "competition_season_id" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "jersey_number" INTEGER,
    "position" TEXT,
    "rating" DECIMAL(4,2),
    "is_captain" BOOLEAN NOT NULL DEFAULT false,
    "is_substitute" BOOLEAN NOT NULL DEFAULT false,
    "shots_total" INTEGER NOT NULL DEFAULT 0,
    "shots_on" INTEGER NOT NULL DEFAULT 0,
    "goals_total" INTEGER NOT NULL DEFAULT 0,
    "goals_conceded" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "passes_total" INTEGER NOT NULL DEFAULT 0,
    "passes_key" INTEGER NOT NULL DEFAULT 0,
    "passes_accuracy" INTEGER,
    "tackles_total" INTEGER NOT NULL DEFAULT 0,
    "blocks" INTEGER NOT NULL DEFAULT 0,
    "interceptions" INTEGER NOT NULL DEFAULT 0,
    "duels_total" INTEGER NOT NULL DEFAULT 0,
    "duels_won" INTEGER NOT NULL DEFAULT 0,
    "dribbles_attempts" INTEGER NOT NULL DEFAULT 0,
    "dribbles_success" INTEGER NOT NULL DEFAULT 0,
    "dribbles_past" INTEGER NOT NULL DEFAULT 0,
    "fouls_drawn" INTEGER NOT NULL DEFAULT 0,
    "fouls_committed" INTEGER NOT NULL DEFAULT 0,
    "yellow_cards" INTEGER NOT NULL DEFAULT 0,
    "red_cards" INTEGER NOT NULL DEFAULT 0,
    "penalty_won" INTEGER NOT NULL DEFAULT 0,
    "penalty_committed" INTEGER NOT NULL DEFAULT 0,
    "penalty_scored" INTEGER NOT NULL DEFAULT 0,
    "penalty_missed" INTEGER NOT NULL DEFAULT 0,
    "penalty_saved" INTEGER NOT NULL DEFAULT 0,
    "offsides" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "player_match_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standings" (
    "id" SERIAL NOT NULL,
    "competition_season_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "group_name" TEXT,
    "stage" TEXT,
    "rank" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "played" INTEGER NOT NULL,
    "win" INTEGER NOT NULL,
    "draw" INTEGER NOT NULL,
    "lose" INTEGER NOT NULL,
    "goals_for" INTEGER NOT NULL,
    "goals_against" INTEGER NOT NULL,
    "goal_diff" INTEGER NOT NULL,
    "home_played" INTEGER NOT NULL DEFAULT 0,
    "home_win" INTEGER NOT NULL DEFAULT 0,
    "home_draw" INTEGER NOT NULL DEFAULT 0,
    "home_lose" INTEGER NOT NULL DEFAULT 0,
    "home_gf" INTEGER NOT NULL DEFAULT 0,
    "home_ga" INTEGER NOT NULL DEFAULT 0,
    "away_played" INTEGER NOT NULL DEFAULT 0,
    "away_win" INTEGER NOT NULL DEFAULT 0,
    "away_draw" INTEGER NOT NULL DEFAULT 0,
    "away_lose" INTEGER NOT NULL DEFAULT 0,
    "away_gf" INTEGER NOT NULL DEFAULT 0,
    "away_ga" INTEGER NOT NULL DEFAULT 0,
    "form" TEXT,
    "description" TEXT,
    "status" TEXT,
    "as_of" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_season_stats" (
    "id" SERIAL NOT NULL,
    "player_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "competition_season_id" INTEGER NOT NULL,
    "appearances" INTEGER NOT NULL DEFAULT 0,
    "lineups_count" INTEGER NOT NULL DEFAULT 0,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "yellow_cards" INTEGER NOT NULL DEFAULT 0,
    "yellowred_cards" INTEGER NOT NULL DEFAULT 0,
    "red_cards" INTEGER NOT NULL DEFAULT 0,
    "rating_avg" DECIMAL(4,2),
    "shots_total" INTEGER NOT NULL DEFAULT 0,
    "shots_on" INTEGER NOT NULL DEFAULT 0,
    "passes_key" INTEGER NOT NULL DEFAULT 0,
    "tackles_total" INTEGER NOT NULL DEFAULT 0,
    "interceptions" INTEGER NOT NULL DEFAULT 0,
    "duels_total" INTEGER NOT NULL DEFAULT 0,
    "duels_won" INTEGER NOT NULL DEFAULT 0,
    "dribbles_success" INTEGER NOT NULL DEFAULT 0,
    "source" "StatsSource" NOT NULL DEFAULT 'AGGREGATED',
    "as_of" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "player_season_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_season_stats" (
    "id" SERIAL NOT NULL,
    "competition_season_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "form" TEXT,
    "played_home" INTEGER NOT NULL DEFAULT 0,
    "played_away" INTEGER NOT NULL DEFAULT 0,
    "played_total" INTEGER NOT NULL DEFAULT 0,
    "wins_home" INTEGER NOT NULL DEFAULT 0,
    "wins_away" INTEGER NOT NULL DEFAULT 0,
    "draws_home" INTEGER NOT NULL DEFAULT 0,
    "draws_away" INTEGER NOT NULL DEFAULT 0,
    "loses_home" INTEGER NOT NULL DEFAULT 0,
    "loses_away" INTEGER NOT NULL DEFAULT 0,
    "goals_for_home" INTEGER NOT NULL DEFAULT 0,
    "goals_for_away" INTEGER NOT NULL DEFAULT 0,
    "goals_against_home" INTEGER NOT NULL DEFAULT 0,
    "goals_against_away" INTEGER NOT NULL DEFAULT 0,
    "biggest_win_home" TEXT,
    "biggest_win_away" TEXT,
    "biggest_lose_home" TEXT,
    "biggest_lose_away" TEXT,
    "clean_sheet_total" INTEGER NOT NULL DEFAULT 0,
    "failed_to_score_total" INTEGER NOT NULL DEFAULT 0,
    "penalty_scored" INTEGER NOT NULL DEFAULT 0,
    "penalty_missed" INTEGER NOT NULL DEFAULT 0,
    "formations" JSONB,
    "cards" JSONB,
    "as_of" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "team_season_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "top_rankings" (
    "id" SERIAL NOT NULL,
    "competition_season_id" INTEGER NOT NULL,
    "category" "RankingCategory" NOT NULL,
    "rank" INTEGER NOT NULL,
    "player_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "as_of" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "top_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "injuries" (
    "id" SERIAL NOT NULL,
    "competition_season_id" INTEGER NOT NULL,
    "player_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "match_id" INTEGER,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "fixture_date" DATE NOT NULL,
    "as_of" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "injuries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backfill_jobs" (
    "id" SERIAL NOT NULL,
    "competition_season_id" INTEGER NOT NULL,
    "phase" "BackfillPhase" NOT NULL DEFAULT 'PENDING',
    "cursor_match_id" INTEGER,
    "total" INTEGER NOT NULL DEFAULT 0,
    "done" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "backfill_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_runs" (
    "id" SERIAL NOT NULL,
    "layer" "IngestionLayer" NOT NULL,
    "competition_season_id" INTEGER,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "calls_used" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "error" TEXT,

    CONSTRAINT "ingestion_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_quota_snapshots" (
    "id" SERIAL NOT NULL,
    "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calls_used" INTEGER NOT NULL,
    "limit_day" INTEGER NOT NULL,
    "plan" TEXT,
    "expires_on" DATE,

    CONSTRAINT "api_quota_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "localized_names" (
    "id" SERIAL NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "source" "LocaleSource" NOT NULL DEFAULT 'API',

    CONSTRAINT "localized_names_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "competitions_api_competition_id_key" ON "competitions"("api_competition_id");

-- CreateIndex
CREATE INDEX "competitions_top_flight_competition_id_idx" ON "competitions"("top_flight_competition_id");

-- CreateIndex
CREATE INDEX "competitions_is_tracked_display_order_idx" ON "competitions"("is_tracked", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_year_key" ON "seasons"("year");

-- CreateIndex
CREATE INDEX "competition_seasons_season_id_idx" ON "competition_seasons"("season_id");

-- CreateIndex
CREATE INDEX "competition_seasons_status_idx" ON "competition_seasons"("status");

-- CreateIndex
CREATE INDEX "competition_seasons_list_from_round_id_idx" ON "competition_seasons"("list_from_round_id");

-- CreateIndex
CREATE INDEX "competition_seasons_detail_cutoff_round_id_idx" ON "competition_seasons"("detail_cutoff_round_id");

-- CreateIndex
CREATE UNIQUE INDEX "competition_seasons_competition_id_season_id_key" ON "competition_seasons"("competition_id", "season_id");

-- CreateIndex
CREATE INDEX "competition_rounds_competition_season_id_ordinal_idx" ON "competition_rounds"("competition_season_id", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "competition_rounds_competition_season_id_name_key" ON "competition_rounds"("competition_season_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "venues_api_venue_id_key" ON "venues"("api_venue_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_api_team_id_key" ON "teams"("api_team_id");

-- CreateIndex
CREATE INDEX "teams_venue_id_idx" ON "teams"("venue_id");

-- CreateIndex
CREATE INDEX "teams_country_idx" ON "teams"("country");

-- CreateIndex
CREATE INDEX "teams_first_seen_competition_id_idx" ON "teams"("first_seen_competition_id");

-- CreateIndex
CREATE INDEX "competition_entries_team_id_idx" ON "competition_entries"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "competition_entries_competition_season_id_team_id_key" ON "competition_entries"("competition_season_id", "team_id");

-- CreateIndex
CREATE INDEX "external_ids_entity_type_entity_id_idx" ON "external_ids"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_ids_source_entity_type_external_id_key" ON "external_ids"("source", "entity_type", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "players_api_player_id_key" ON "players"("api_player_id");

-- CreateIndex
CREATE INDEX "squad_entries_team_id_season_year_idx" ON "squad_entries"("team_id", "season_year");

-- CreateIndex
CREATE INDEX "squad_entries_player_id_idx" ON "squad_entries"("player_id");

-- CreateIndex
CREATE INDEX "squad_entries_parent_team_id_idx" ON "squad_entries"("parent_team_id");

-- CreateIndex
CREATE UNIQUE INDEX "coaches_api_coach_id_key" ON "coaches"("api_coach_id");

-- CreateIndex
CREATE INDEX "coach_tenures_coach_id_idx" ON "coach_tenures"("coach_id");

-- CreateIndex
CREATE INDEX "coach_tenures_team_id_idx" ON "coach_tenures"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "matches_api_fixture_id_key" ON "matches"("api_fixture_id");

-- CreateIndex
CREATE INDEX "matches_competition_season_id_kickoff_at_idx" ON "matches"("competition_season_id", "kickoff_at");

-- CreateIndex
CREATE INDEX "matches_round_id_idx" ON "matches"("round_id");

-- CreateIndex
CREATE INDEX "matches_home_team_id_kickoff_at_idx" ON "matches"("home_team_id", "kickoff_at");

-- CreateIndex
CREATE INDEX "matches_away_team_id_kickoff_at_idx" ON "matches"("away_team_id", "kickoff_at");

-- CreateIndex
CREATE INDEX "matches_kickoff_at_idx" ON "matches"("kickoff_at");

-- CreateIndex
CREATE INDEX "matches_status_short_idx" ON "matches"("status_short");

-- CreateIndex
CREATE INDEX "matches_tie_id_idx" ON "matches"("tie_id");

-- CreateIndex
CREATE INDEX "matches_venue_id_idx" ON "matches"("venue_id");

-- CreateIndex
CREATE INDEX "matches_winner_team_id_idx" ON "matches"("winner_team_id");

-- CreateIndex
CREATE INDEX "knockout_ties_competition_season_id_round_id_idx" ON "knockout_ties"("competition_season_id", "round_id");

-- CreateIndex
CREATE INDEX "knockout_ties_home_team_id_idx" ON "knockout_ties"("home_team_id");

-- CreateIndex
CREATE INDEX "knockout_ties_away_team_id_idx" ON "knockout_ties"("away_team_id");

-- CreateIndex
CREATE INDEX "knockout_ties_first_leg_match_id_idx" ON "knockout_ties"("first_leg_match_id");

-- CreateIndex
CREATE INDEX "knockout_ties_second_leg_match_id_idx" ON "knockout_ties"("second_leg_match_id");

-- CreateIndex
CREATE INDEX "knockout_ties_winner_team_id_idx" ON "knockout_ties"("winner_team_id");

-- CreateIndex
CREATE INDEX "bracket_slots_match_id_idx" ON "bracket_slots"("match_id");

-- CreateIndex
CREATE INDEX "bracket_slots_tie_id_idx" ON "bracket_slots"("tie_id");

-- CreateIndex
CREATE INDEX "bracket_slots_round_id_idx" ON "bracket_slots"("round_id");

-- CreateIndex
CREATE INDEX "bracket_slots_source_slot_a_id_idx" ON "bracket_slots"("source_slot_a_id");

-- CreateIndex
CREATE INDEX "bracket_slots_source_slot_b_id_idx" ON "bracket_slots"("source_slot_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "bracket_slots_competition_season_id_round_id_slot_index_key" ON "bracket_slots"("competition_season_id", "round_id", "slot_index");

-- CreateIndex
CREATE INDEX "match_events_match_id_minute_idx" ON "match_events"("match_id", "minute");

-- CreateIndex
CREATE INDEX "match_events_player_id_idx" ON "match_events"("player_id");

-- CreateIndex
CREATE INDEX "match_events_assist_player_id_idx" ON "match_events"("assist_player_id");

-- CreateIndex
CREATE INDEX "match_events_team_id_idx" ON "match_events"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_events_match_id_seq_key" ON "match_events"("match_id", "seq");

-- CreateIndex
CREATE INDEX "match_lineups_coach_id_idx" ON "match_lineups"("coach_id");

-- CreateIndex
CREATE INDEX "match_lineups_team_id_idx" ON "match_lineups"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_lineups_match_id_team_id_key" ON "match_lineups"("match_id", "team_id");

-- CreateIndex
CREATE INDEX "lineup_entries_match_id_team_id_is_starter_idx" ON "lineup_entries"("match_id", "team_id", "is_starter");

-- CreateIndex
CREATE INDEX "lineup_entries_player_id_idx" ON "lineup_entries"("player_id");

-- CreateIndex
CREATE INDEX "lineup_entries_team_id_idx" ON "lineup_entries"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "lineup_entries_match_id_player_id_key" ON "lineup_entries"("match_id", "player_id");

-- CreateIndex
CREATE INDEX "team_match_stats_team_id_idx" ON "team_match_stats"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_match_stats_match_id_team_id_key" ON "team_match_stats"("match_id", "team_id");

-- CreateIndex
CREATE INDEX "player_match_stats_player_id_competition_season_id_idx" ON "player_match_stats"("player_id", "competition_season_id");

-- CreateIndex
CREATE INDEX "player_match_stats_competition_season_id_team_id_idx" ON "player_match_stats"("competition_season_id", "team_id");

-- CreateIndex
CREATE INDEX "player_match_stats_match_id_idx" ON "player_match_stats"("match_id");

-- CreateIndex
CREATE INDEX "player_match_stats_team_id_idx" ON "player_match_stats"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_match_stats_match_id_player_id_key" ON "player_match_stats"("match_id", "player_id");

-- CreateIndex
CREATE INDEX "standings_competition_season_id_rank_idx" ON "standings"("competition_season_id", "rank");

-- CreateIndex
CREATE INDEX "standings_team_id_idx" ON "standings"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "standings_competition_season_id_team_id_group_name_key" ON "standings"("competition_season_id", "team_id", "group_name");

-- CreateIndex
CREATE INDEX "player_season_stats_competition_season_id_goals_idx" ON "player_season_stats"("competition_season_id", "goals" DESC);

-- CreateIndex
CREATE INDEX "player_season_stats_player_id_idx" ON "player_season_stats"("player_id");

-- CreateIndex
CREATE INDEX "player_season_stats_team_id_idx" ON "player_season_stats"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_season_stats_player_id_team_id_competition_season_id_key" ON "player_season_stats"("player_id", "team_id", "competition_season_id");

-- CreateIndex
CREATE INDEX "team_season_stats_team_id_idx" ON "team_season_stats"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_season_stats_competition_season_id_team_id_key" ON "team_season_stats"("competition_season_id", "team_id");

-- CreateIndex
CREATE INDEX "top_rankings_player_id_idx" ON "top_rankings"("player_id");

-- CreateIndex
CREATE INDEX "top_rankings_team_id_idx" ON "top_rankings"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "top_rankings_competition_season_id_category_rank_key" ON "top_rankings"("competition_season_id", "category", "rank");

-- CreateIndex
CREATE INDEX "injuries_team_id_idx" ON "injuries"("team_id");

-- CreateIndex
CREATE INDEX "injuries_match_id_idx" ON "injuries"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "injuries_player_id_competition_season_id_fixture_date_key" ON "injuries"("player_id", "competition_season_id", "fixture_date");

-- CreateIndex
CREATE UNIQUE INDEX "backfill_jobs_competition_season_id_key" ON "backfill_jobs"("competition_season_id");

-- CreateIndex
CREATE INDEX "backfill_jobs_cursor_match_id_idx" ON "backfill_jobs"("cursor_match_id");

-- CreateIndex
CREATE INDEX "ingestion_runs_layer_started_at_idx" ON "ingestion_runs"("layer", "started_at");

-- CreateIndex
CREATE INDEX "ingestion_runs_competition_season_id_idx" ON "ingestion_runs"("competition_season_id");

-- CreateIndex
CREATE INDEX "api_quota_snapshots_captured_at_idx" ON "api_quota_snapshots"("captured_at");

-- CreateIndex
CREATE INDEX "localized_names_entity_type_locale_idx" ON "localized_names"("entity_type", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "localized_names_entity_type_entity_id_locale_key" ON "localized_names"("entity_type", "entity_id", "locale");

-- ─────────────────────────────────────────────────────────────
-- 아래는 손으로 추가 — Prisma 가 표현 못 하는 partial unique index (prisma/sql/partial-indexes.sql)
-- ─────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS "competition_seasons_current_uq"
  ON "competition_seasons" ("competition_id")
  WHERE "is_current" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "squad_entries_current_uq"
  ON "squad_entries" ("player_id", "season_year")
  WHERE "valid_to" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "coach_tenures_current_uq"
  ON "coach_tenures" ("team_id")
  WHERE "valid_to" IS NULL;

CREATE INDEX IF NOT EXISTS "matches_live_idx"
  ON "matches" ("kickoff_at")
  WHERE "status_short" IN ('1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE');
