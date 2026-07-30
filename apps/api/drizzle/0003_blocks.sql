ALTER TABLE `todo` RENAME TO `block`;--> statement-breakpoint
ALTER TABLE `block` RENAME COLUMN `title` TO `text`;--> statement-breakpoint
ALTER TABLE `block` ADD `kind` text DEFAULT 'todo' NOT NULL;--> statement-breakpoint
ALTER TABLE `block` ADD `position` real DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `block` SET `position` = (SELECT COUNT(*) FROM `block` b2 WHERE b2.`list_id` = `block`.`list_id` AND (b2.`created_at` < `block`.`created_at` OR (b2.`created_at` = `block`.`created_at` AND b2.`id` <= `block`.`id`)));
