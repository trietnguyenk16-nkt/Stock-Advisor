CREATE TABLE `asset_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`runKey` varchar(96) NOT NULL,
	`signal` enum('BUY','SELL','HOLD') NOT NULL,
	`summary` text NOT NULL,
	`referencePrice` decimal(20,6),
	`targetPrice` decimal(20,6),
	`risk` text NOT NULL,
	`confidence` decimal(6,4),
	`asOf` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `asset_analyses_id` PRIMARY KEY(`id`),
	CONSTRAINT `asset_analyses_run_asset_unique` UNIQUE(`runKey`,`assetId`)
);
--> statement-breakpoint
CREATE TABLE `email_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runKey` varchar(96) NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`status` enum('sent','skipped','failed') NOT NULL,
	`providerMessageId` varchar(255),
	`errorMessage` text,
	`sentAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_deliveries_runKey_unique` UNIQUE(`runKey`)
);
--> statement-breakpoint
CREATE TABLE `news_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`fingerprint` varchar(128) NOT NULL,
	`title` varchar(512) NOT NULL,
	`sourceName` varchar(128) NOT NULL,
	`sourceUrl` varchar(1024) NOT NULL,
	`snippet` text,
	`publishedAt` bigint,
	`fetchedAt` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `news_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `news_items_asset_fingerprint_unique` UNIQUE(`assetId`,`fingerprint`)
);
--> statement-breakpoint
CREATE TABLE `price_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`runKey` varchar(96) NOT NULL,
	`price` decimal(20,6),
	`bid` decimal(20,6),
	`ask` decimal(20,6),
	`changePercent` decimal(12,6),
	`asOf` bigint NOT NULL,
	`sourceName` varchar(128) NOT NULL,
	`sourceUrl` varchar(512),
	`freshness` varchar(32) NOT NULL DEFAULT 'unknown',
	`warning` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `price_snapshots_run_asset_unique` UNIQUE(`runKey`,`assetId`)
);
--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runKey` varchar(96) NOT NULL,
	`status` enum('running','success','partial','failed') NOT NULL,
	`startedAt` bigint NOT NULL,
	`finishedAt` bigint,
	`assetsProcessed` int NOT NULL DEFAULT 0,
	`assetsSucceeded` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sync_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `sync_runs_runKey_unique` UNIQUE(`runKey`)
);
--> statement-breakpoint
CREATE TABLE `tracked_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceKey` varchar(96) NOT NULL DEFAULT 'owner',
	`ticker` varchar(32) NOT NULL,
	`displayName` varchar(255) NOT NULL,
	`assetType` enum('equity','fund','gold') NOT NULL,
	`exchange` varchar(16),
	`providerCode` varchar(64) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'VND',
	`unit` varchar(32) NOT NULL DEFAULT 'share',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tracked_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `tracked_assets_workspace_ticker_unique` UNIQUE(`workspaceKey`,`ticker`)
);
--> statement-breakpoint
CREATE INDEX `news_items_asset_published_index` ON `news_items` (`assetId`,`publishedAt`);--> statement-breakpoint
CREATE INDEX `price_snapshots_asset_asof_index` ON `price_snapshots` (`assetId`,`asOf`);--> statement-breakpoint
CREATE INDEX `tracked_assets_workspace_active_index` ON `tracked_assets` (`workspaceKey`,`isActive`);