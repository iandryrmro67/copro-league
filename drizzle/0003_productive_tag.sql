ALTER TABLE `teams` ADD `name` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE teams SET name = CASE side WHEN 'A' THEN 'Équipe A' ELSE 'Équipe B' END WHERE name = '';
--> statement-breakpoint
UPDATE match_player_stats SET data = json_set(data, '$.admin_rating', json_extract(data, '$.rating')) WHERE json_type(data,'$.rating') IN ('integer','real') AND json_type(data,'$.admin_rating') IS NULL;
