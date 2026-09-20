CREATE TABLE `admins` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_attributes` (
	`player_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `match_events` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`player_id` text NOT NULL,
	`team` text NOT NULL,
	`event_type` text NOT NULL,
	`timestamp` real NOT NULL,
	`related_player_id` text,
	`metadata` text NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`related_player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_match_time` ON `match_events` (`match_id`,`timestamp`);--> statement-breakpoint
CREATE TABLE `match_players` (
	`match_id` text NOT NULL,
	`player_id` text NOT NULL,
	`team` text,
	PRIMARY KEY(`match_id`, `player_id`),
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `match_player_stats` (
	`match_id` text NOT NULL,
	`player_id` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`match_id`, `player_id`),
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`season_id` text NOT NULL,
	`number` integer NOT NULL,
	`date` text NOT NULL,
	`duration` integer NOT NULL,
	`location` text NOT NULL,
	`status` text NOT NULL,
	`score_a` integer,
	`score_b` integer,
	`mvp_id` text,
	`level` integer DEFAULT 1 NOT NULL,
	`tracked_keys` text DEFAULT '[]' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`edit_token` text,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mvp_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `matches_season_date` ON `matches` (`season_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `matches_season_number` ON `matches` (`season_id`,`number`);--> statement-breakpoint
CREATE TABLE `player_awards` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`season_id` text NOT NULL,
	`label` text NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`photo` text DEFAULT '' NOT NULL,
	`fun_facts` text DEFAULT '' NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`edit_token` text
);
--> statement-breakpoint
CREATE TABLE `season_awards` (
	`season_id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`status` text NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`contribution` real DEFAULT 1 NOT NULL,
	`min_participation` real DEFAULT 0.3 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`edit_token` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`side` text NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_match_side` ON `teams` (`match_id`,`side`);--> statement-breakpoint
CREATE TABLE `videos` (
	`match_id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
