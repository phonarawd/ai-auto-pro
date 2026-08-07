CREATE TABLE `account_credential_ref` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`vault_ref` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `platform_account`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `account_credential_ref_account_idx` ON `account_credential_ref` (`account_id`);--> statement-breakpoint
CREATE TABLE `analytics_snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`period` text NOT NULL,
	`metrics_json` text NOT NULL,
	`captured_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analytics_snapshot_project_period_uidx` ON `analytics_snapshot` (`project_id`,`period`);--> statement-breakpoint
CREATE TABLE `audit_event` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`kind` text NOT NULL,
	`actor` text,
	`payload_json` text NOT NULL,
	`trace_id` text,
	`occurred_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_event_project_idx` ON `audit_event` (`project_id`);--> statement-breakpoint
CREATE TABLE `connector_registration` (
	`id` text PRIMARY KEY NOT NULL,
	`connector_id` text NOT NULL,
	`version` text NOT NULL,
	`lifecycle` text NOT NULL,
	`manifest_json` text NOT NULL,
	`registered_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connector_registration_connector_uidx` ON `connector_registration` (`connector_id`);--> statement-breakpoint
CREATE TABLE `content_item` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`workflow_run_id` text,
	`target_account_id` text,
	`channel` text NOT NULL,
	`format` text NOT NULL,
	`status` text NOT NULL,
	`artifact_ref` text,
	`meta_json` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `content_item_project_idx` ON `content_item` (`project_id`);--> statement-breakpoint
CREATE TABLE `decision_record` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`decided_at` text NOT NULL,
	`mission_id` text,
	`graph_json` text NOT NULL,
	`narrative` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `decision_record_project_idx` ON `decision_record` (`project_id`);--> statement-breakpoint
CREATE TABLE `event_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`type` text NOT NULL,
	`payload_json` text NOT NULL,
	`trace_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	`published_at` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `event_outbox_status_idx` ON `event_outbox` (`status`);--> statement-breakpoint
CREATE TABLE `feature_state` (
	`id` text PRIMARY KEY NOT NULL,
	`feature_key` text NOT NULL,
	`scope` text NOT NULL,
	`scope_id` text,
	`lifecycle` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feature_state_key_scope_uidx` ON `feature_state` (`feature_key`,`scope`,`scope_id`);--> statement-breakpoint
CREATE TABLE `global_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `global_settings_key_uidx` ON `global_settings` (`key`);--> statement-breakpoint
CREATE TABLE `goal` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`horizon` text NOT NULL,
	`title` text NOT NULL,
	`kpi_json` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `goal_project_horizon_idx` ON `goal` (`project_id`,`horizon`);--> statement-breakpoint
CREATE TABLE `kill_switch_state` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`scope_id` text,
	`active` integer DEFAULT 0 NOT NULL,
	`reason` text,
	`activated_at` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `knowledge_item` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`namespace` text NOT NULL,
	`type` text NOT NULL,
	`tags_json` text NOT NULL,
	`body` text,
	`blob_ref` text,
	`evolution_json` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `knowledge_item_project_ns_idx` ON `knowledge_item` (`project_id`,`namespace`);--> statement-breakpoint
CREATE TABLE `learning_policy` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`policy_json` text NOT NULL,
	`confidence` real NOT NULL,
	`status` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `learning_policy_project_idx` ON `learning_policy` (`project_id`);--> statement-breakpoint
CREATE TABLE `mission` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`mission_date` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`priority` integer NOT NULL,
	`decision_id` text,
	`payload_json` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mission_project_date_idx` ON `mission` (`project_id`,`mission_date`);--> statement-breakpoint
CREATE TABLE `module_registration` (
	`id` text PRIMARY KEY NOT NULL,
	`module_id` text NOT NULL,
	`version` text NOT NULL,
	`deps_json` text NOT NULL,
	`lifecycle` text NOT NULL,
	`manifest_json` text NOT NULL,
	`registered_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `module_registration_module_uidx` ON `module_registration` (`module_id`);--> statement-breakpoint
CREATE TABLE `planner_queue_item` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`priority` integer NOT NULL,
	`deadline` text,
	`expected_roi` real,
	`dependency_ids_json` text NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`human_approval` integer DEFAULT 0 NOT NULL,
	`decision_id` text,
	`mission_id` text,
	`payload_json` text NOT NULL,
	`status` text NOT NULL,
	`leased_by` text,
	`leased_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `planner_queue_item_project_status_idx` ON `planner_queue_item` (`project_id`,`status`);--> statement-breakpoint
CREATE TABLE `platform_account` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`platform` text NOT NULL,
	`display_name` text NOT NULL,
	`external_id` text,
	`status` text NOT NULL,
	`router_tags_json` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `platform_account_project_idx` ON `platform_account` (`project_id`);--> statement-breakpoint
CREATE TABLE `platform_capability` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`can_publish` integer NOT NULL,
	`publish_mode` text NOT NULL,
	`risk_level` text NOT NULL,
	`flags_json` text NOT NULL,
	`snapshot_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `platform_account`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_capability_account_uidx` ON `platform_capability` (`account_id`);--> statement-breakpoint
CREATE TABLE `policy_rule` (
	`id` text PRIMARY KEY NOT NULL,
	`feature_key` text,
	`scope` text NOT NULL,
	`scope_id` text,
	`rule_json` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`meta_json` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`key` text NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_settings_project_key_uidx` ON `project_settings` (`project_id`,`key`);--> statement-breakpoint
CREATE TABLE `publishing_history_event` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`content_item_id` text,
	`account_id` text,
	`kind` text NOT NULL,
	`publish_mode` text,
	`export_path` text,
	`external_post_id` text,
	`meta_json` text,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `publishing_history_event_project_idx` ON `publishing_history_event` (`project_id`);--> statement-breakpoint
CREATE TABLE `session_record` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`status` text NOT NULL,
	`expires_at` text,
	`last_used_at` text,
	`encrypted_blob_ref` text,
	`meta_json` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `platform_account`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_record_account_idx` ON `session_record` (`account_id`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_key` text NOT NULL,
	`prefs_json` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_key_uidx` ON `user_settings` (`user_key`);--> statement-breakpoint
CREATE TABLE `workflow_run` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`queue_item_id` text,
	`mission_id` text,
	`decision_id` text,
	`dsl_json` text NOT NULL,
	`state` text NOT NULL,
	`cursor_json` text,
	`trace_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workflow_run_project_idx` ON `workflow_run` (`project_id`);--> statement-breakpoint
CREATE INDEX `workflow_run_trace_idx` ON `workflow_run` (`trace_id`);