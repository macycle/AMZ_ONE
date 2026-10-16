ALTER TABLE `listing_drafts` ADD `attributes` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `listing_drafts` ADD `selected_variant` text DEFAULT '' NOT NULL;