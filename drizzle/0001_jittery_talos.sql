CREATE TABLE `sessions` (
	`session_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_active_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_session_id` PRIMARY KEY(`session_id`)
);

DROP TABLE `users`;
DROP INDEX `likes_user_idx` ON `likes`;
DROP INDEX `votes_user_idx` ON `votes`;
ALTER TABLE `likes` ADD CONSTRAINT `likes_poll_session_unique` UNIQUE(`poll_id`,`session_id`);
ALTER TABLE `votes` ADD CONSTRAINT `votes_poll_session_unique` UNIQUE(`poll_id`,`session_id`);
ALTER TABLE `likes` DROP INDEX `likes_poll_user_unique`;
ALTER TABLE `votes` DROP INDEX `votes_poll_user_unique`;
ALTER TABLE `likes` ADD `session_id` varchar(36) NOT NULL;
ALTER TABLE `votes` ADD `session_id` varchar(36) NOT NULL;
CREATE INDEX `likes_session_idx` ON `likes` (`session_id`);
CREATE INDEX `votes_session_idx` ON `votes` (`session_id`);
ALTER TABLE `likes` DROP COLUMN `user_id`;
ALTER TABLE `votes` DROP COLUMN `user_id`;