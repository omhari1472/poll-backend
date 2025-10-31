CREATE TABLE `categories` (
	`category_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_category_id` PRIMARY KEY(`category_id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);

CREATE TABLE `likes` (
	`like_id` varchar(36) NOT NULL,
	`poll_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`liked_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `likes_like_id` PRIMARY KEY(`like_id`),
	CONSTRAINT `likes_poll_user_unique` UNIQUE(`poll_id`,`user_id`)
);

CREATE TABLE `poll_options` (
	`option_id` varchar(36) NOT NULL,
	`poll_id` varchar(36) NOT NULL,
	`option_text` varchar(500) NOT NULL,
	`vote_count` int NOT NULL DEFAULT 0,
	`display_order` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `poll_options_option_id` PRIMARY KEY(`option_id`)
);

CREATE TABLE `poll_tags` (
	`poll_id` varchar(36) NOT NULL,
	`tag_id` varchar(36) NOT NULL,
	CONSTRAINT `poll_tags_unique` UNIQUE(`poll_id`,`tag_id`)
);

CREATE TABLE `polls` (
	`poll_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`created_by` varchar(36) NOT NULL,
	`category_id` varchar(36),
	`allow_multiple_votes` boolean NOT NULL DEFAULT false,
	`expires_at` timestamp,
	`is_active` boolean NOT NULL DEFAULT true,
	`total_votes` int NOT NULL DEFAULT 0,
	`total_likes` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `polls_poll_id` PRIMARY KEY(`poll_id`)
);

CREATE TABLE `tags` (
	`tag_id` varchar(36) NOT NULL,
	`name` varchar(50) NOT NULL,
	`slug` varchar(50) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_tag_id` PRIMARY KEY(`tag_id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`),
	CONSTRAINT `tags_slug_unique` UNIQUE(`slug`)
);

CREATE TABLE `users` (
	`user_id` varchar(36) NOT NULL,
	`clerk_id` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`avatar_url` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_user_id` PRIMARY KEY(`user_id`),
	CONSTRAINT `users_clerk_id_unique` UNIQUE(`clerk_id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);

CREATE TABLE `votes` (
	`vote_id` varchar(36) NOT NULL,
	`poll_id` varchar(36) NOT NULL,
	`option_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`voted_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `votes_vote_id` PRIMARY KEY(`vote_id`),
	CONSTRAINT `votes_poll_user_unique` UNIQUE(`poll_id`,`user_id`)
);

CREATE INDEX `likes_poll_idx` ON `likes` (`poll_id`);
CREATE INDEX `likes_user_idx` ON `likes` (`user_id`);
CREATE INDEX `poll_options_poll_idx` ON `poll_options` (`poll_id`);
CREATE INDEX `poll_options_order_idx` ON `poll_options` (`poll_id`,`display_order`);
CREATE INDEX `poll_tags_poll_idx` ON `poll_tags` (`poll_id`);
CREATE INDEX `poll_tags_tag_idx` ON `poll_tags` (`tag_id`);
CREATE INDEX `polls_created_by_idx` ON `polls` (`created_by`);
CREATE INDEX `polls_category_idx` ON `polls` (`category_id`);
CREATE INDEX `polls_active_idx` ON `polls` (`is_active`);
CREATE INDEX `polls_created_at_idx` ON `polls` (`created_at`);
CREATE INDEX `votes_poll_idx` ON `votes` (`poll_id`);
CREATE INDEX `votes_user_idx` ON `votes` (`user_id`);