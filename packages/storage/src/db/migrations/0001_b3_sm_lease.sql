ALTER TABLE `workflow_run` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `planner_queue_item` ADD `lease_expires_at` text;
