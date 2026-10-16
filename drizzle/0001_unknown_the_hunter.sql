CREATE TABLE `listing_drafts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_url` text NOT NULL,
	`marketplace` text DEFAULT 'US' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`bullets` text DEFAULT '[]' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
