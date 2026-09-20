CREATE TABLE `award_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`season_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`mode` text NOT NULL,
	`stat_weight` real NOT NULL,
	`vote_weight` real NOT NULL,
	`voting_open` integer DEFAULT 0 NOT NULL,
	`forbid_self` integer DEFAULT 1 NOT NULL,
	`candidates_json` text DEFAULT '[]' NOT NULL,
	`metric_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `award_definitions_season` ON `award_definitions` (`season_id`);--> statement-breakpoint
CREATE TABLE `award_identities` (
	`email` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`player_id` text NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `award_identities_user_id_unique` ON `award_identities` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `award_identities_player_id_unique` ON `award_identities` (`player_id`);--> statement-breakpoint
CREATE TABLE `award_votes` (
	`season_id` text NOT NULL,
	`award_id` text NOT NULL,
	`voter_player_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`created_at` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`season_id`, `award_id`, `voter_player_id`),
	FOREIGN KEY (`award_id`) REFERENCES `award_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`voter_player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
