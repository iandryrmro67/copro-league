CREATE TABLE `recognition_seasons` (
	`season_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`finalized_at` text NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
