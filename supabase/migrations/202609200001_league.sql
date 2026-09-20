-- Final PostgreSQL schema. JSON stays text to preserve existing records exactly.
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"photo" text DEFAULT '' NOT NULL,
	"fun_facts" text DEFAULT '' NOT NULL,
	"archived" integer DEFAULT 0 NOT NULL,
	"demo" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"edit_token" text
);

CREATE TABLE "seasons" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start" text NOT NULL,
	"end" text NOT NULL,
	"status" text NOT NULL,
	"demo" integer DEFAULT 0 NOT NULL,
	"contribution" double precision DEFAULT 1 NOT NULL,
	"min_participation" double precision DEFAULT 0.3 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"edit_token" text
);

CREATE TABLE "admins" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL
);

CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"data" text NOT NULL
);

CREATE TABLE "player_attributes" (
	"player_id" text PRIMARY KEY NOT NULL,
	"data" text NOT NULL,
	FOREIGN KEY ("player_id") REFERENCES "players"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"season_id" text NOT NULL,
	"number" integer NOT NULL,
	"date" text NOT NULL,
	"duration" integer NOT NULL,
	"location" text NOT NULL,
	"status" text NOT NULL,
	"score_a" integer,
	"score_b" integer,
	"mvp_id" text,
	"level" integer DEFAULT 1 NOT NULL,
	"tracked_keys" text DEFAULT '[]' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"edit_token" text,
 "notes" text NOT NULL DEFAULT '',
	FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("mvp_id") REFERENCES "players"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"side" text NOT NULL,
 "name" text NOT NULL DEFAULT '',
	FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "match_players" (
	"match_id" text NOT NULL,
	"player_id" text NOT NULL,
	"team" text,
	PRIMARY KEY("match_id", "player_id"),
	FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("player_id") REFERENCES "players"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "match_player_stats" (
	"match_id" text NOT NULL,
	"player_id" text NOT NULL,
	"data" text NOT NULL,
	PRIMARY KEY("match_id", "player_id"),
	FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("player_id") REFERENCES "players"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "match_events" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"player_id" text NOT NULL,
	"team" text NOT NULL,
	"event_type" text NOT NULL,
	"timestamp" double precision,
	"related_player_id" text,
	"metadata" text NOT NULL,
	FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("player_id") REFERENCES "players"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("related_player_id") REFERENCES "players"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "videos" (
	"match_id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "season_awards" (
	"season_id" text PRIMARY KEY NOT NULL,
	"player_id" text NOT NULL,
	FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("player_id") REFERENCES "players"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "player_awards" (
	"id" text PRIMARY KEY NOT NULL,
	"player_id" text NOT NULL,
	"season_id" text NOT NULL,
	"label" text NOT NULL,
	FOREIGN KEY ("player_id") REFERENCES "players"("id") ON UPDATE no action ON DELETE no action,
	FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "award_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"season_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"mode" text NOT NULL,
	"stat_weight" double precision NOT NULL,
	"vote_weight" double precision NOT NULL,
	"voting_open" integer DEFAULT 0 NOT NULL,
	"forbid_self" integer DEFAULT 1 NOT NULL,
	"candidates_json" text DEFAULT '[]' NOT NULL,
	"metric_json" text DEFAULT '{}' NOT NULL,
	"created_at" text DEFAULT '' NOT NULL,
	FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE "award_identities" (
	"email" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"player_id" text NOT NULL,
	FOREIGN KEY ("player_id") REFERENCES "players"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "award_votes" (
	"season_id" text NOT NULL,
	"award_id" text NOT NULL,
	"voter_player_id" text NOT NULL,
	"candidate_id" text NOT NULL,
	"created_at" text DEFAULT '' NOT NULL,
	PRIMARY KEY("season_id", "award_id", "voter_player_id"),
	FOREIGN KEY ("award_id") REFERENCES "award_definitions"("id") ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY ("voter_player_id") REFERENCES "players"("id") ON UPDATE no action ON DELETE no action
);

CREATE TABLE "recognition_seasons" (
	"season_id" text PRIMARY KEY NOT NULL,
	"data" text NOT NULL,
	"finalized_at" text NOT NULL,
	FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON UPDATE no action ON DELETE no action
);
CREATE INDEX "events_match_time" ON "match_events" ("match_id","timestamp");
CREATE INDEX "matches_season_date" ON "matches" ("season_id","date");
CREATE UNIQUE INDEX "matches_season_number" ON "matches" ("season_id","number");
CREATE UNIQUE INDEX "teams_match_side" ON "teams" ("match_id","side");
CREATE INDEX "award_definitions_season" ON "award_definitions" ("season_id");
CREATE UNIQUE INDEX "award_identities_user_id_unique" ON "award_identities" ("user_id");
CREATE UNIQUE INDEX "award_identities_player_id_unique" ON "award_identities" ("player_id");

CREATE TABLE media_uploads (id text PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('videos','photos')), owner_id text NOT NULL, object_path text UNIQUE NOT NULL, content_type text NOT NULL, size integer NOT NULL, ready integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());

-- No browser-role data access: application server enforces membership and roles.
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recognition_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;
