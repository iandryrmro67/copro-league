PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_match_events` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`player_id` text NOT NULL,
	`team` text NOT NULL,
	`event_type` text NOT NULL,
	`timestamp` real,
	`related_player_id` text,
	`metadata` text NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`related_player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_match_events`("id", "match_id", "player_id", "team", "event_type", "timestamp", "related_player_id", "metadata") SELECT "id", "match_id", "player_id", "team", "event_type", "timestamp", "related_player_id", "metadata" FROM `match_events`;--> statement-breakpoint
DROP TABLE `match_events`;--> statement-breakpoint
ALTER TABLE `__new_match_events` RENAME TO `match_events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `events_match_time` ON `match_events` (`match_id`,`timestamp`);