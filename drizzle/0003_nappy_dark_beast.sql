ALTER TABLE `listing_drafts` ADD `confirmed_at` text;--> statement-breakpoint
ALTER TABLE `listing_drafts` ADD `lingxing_external_id` text;--> statement-breakpoint
ALTER TABLE `listing_drafts` ADD `sync_message` text DEFAULT '' NOT NULL;