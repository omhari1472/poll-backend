-- Drop tables that are no longer needed
DROP TABLE IF EXISTS `poll_tags`;
DROP TABLE IF EXISTS `tags`;
DROP TABLE IF EXISTS `categories`;

-- Remove columns from polls table that are no longer needed
ALTER TABLE `polls` DROP INDEX IF EXISTS `polls_category_idx`;
ALTER TABLE `polls` DROP COLUMN IF EXISTS `category_id`;
ALTER TABLE `polls` DROP COLUMN IF EXISTS `allow_multiple_votes`;
ALTER TABLE `polls` DROP COLUMN IF EXISTS `expires_at`;

