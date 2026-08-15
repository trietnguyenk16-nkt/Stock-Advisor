CREATE SCHEMA "stock_advisor";
--> statement-breakpoint
CREATE TABLE "stock_advisor"."asset_analyses" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_advisor"."asset_analyses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"asset_id" bigint NOT NULL,
	"run_key" varchar(96) NOT NULL,
	"signal" varchar(8) NOT NULL,
	"summary" text NOT NULL,
	"reference_price" numeric(20, 6),
	"target_price" numeric(20, 6),
	"risk" text NOT NULL,
	"confidence" numeric(6, 4),
	"as_of" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_advisor"."email_deliveries" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_advisor"."email_deliveries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"run_key" varchar(96) NOT NULL,
	"recipient" varchar(320) NOT NULL,
	"status" varchar(16) NOT NULL,
	"provider_message_id" varchar(255),
	"error_message" text,
	"sent_at" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_deliveries_run_key_unique" UNIQUE("run_key")
);
--> statement-breakpoint
CREATE TABLE "stock_advisor"."news_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_advisor"."news_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"asset_id" bigint NOT NULL,
	"fingerprint" varchar(128) NOT NULL,
	"title" varchar(512) NOT NULL,
	"source_name" varchar(128) NOT NULL,
	"source_url" varchar(1024) NOT NULL,
	"snippet" text,
	"published_at" bigint,
	"fetched_at" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_advisor"."price_snapshots" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_advisor"."price_snapshots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"asset_id" bigint NOT NULL,
	"run_key" varchar(96) NOT NULL,
	"price" numeric(20, 6),
	"bid" numeric(20, 6),
	"ask" numeric(20, 6),
	"change_percent" numeric(12, 6),
	"as_of" bigint NOT NULL,
	"source_name" varchar(128) NOT NULL,
	"source_url" varchar(1024),
	"freshness" varchar(32) DEFAULT 'unknown' NOT NULL,
	"warning" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_advisor"."push_subscriptions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_advisor"."push_subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"workspace_key" varchar(96) DEFAULT 'owner' NOT NULL,
	"endpoint" varchar(2048) NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_advisor"."sync_runs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_advisor"."sync_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"run_key" varchar(96) NOT NULL,
	"status" varchar(16) NOT NULL,
	"started_at" bigint NOT NULL,
	"finished_at" bigint,
	"assets_processed" integer DEFAULT 0 NOT NULL,
	"assets_succeeded" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_runs_run_key_unique" UNIQUE("run_key")
);
--> statement-breakpoint
CREATE TABLE "stock_advisor"."tracked_assets" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_advisor"."tracked_assets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"workspace_key" varchar(96) DEFAULT 'owner' NOT NULL,
	"ticker" varchar(32) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"asset_type" varchar(16) NOT NULL,
	"exchange" varchar(16),
	"provider_code" varchar(64) NOT NULL,
	"currency" varchar(8) DEFAULT 'VND' NOT NULL,
	"unit" varchar(32) DEFAULT 'share' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_advisor"."users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_advisor"."users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"open_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"login_method" varchar(64),
	"role" varchar(16) DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_signed_in" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);
--> statement-breakpoint
ALTER TABLE "stock_advisor"."asset_analyses" ADD CONSTRAINT "asset_analyses_asset_id_tracked_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "stock_advisor"."tracked_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_advisor"."news_items" ADD CONSTRAINT "news_items_asset_id_tracked_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "stock_advisor"."tracked_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_advisor"."price_snapshots" ADD CONSTRAINT "price_snapshots_asset_id_tracked_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "stock_advisor"."tracked_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_analyses_run_asset_unique" ON "stock_advisor"."asset_analyses" USING btree ("run_key","asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "news_items_asset_fingerprint_unique" ON "stock_advisor"."news_items" USING btree ("asset_id","fingerprint");--> statement-breakpoint
CREATE INDEX "news_items_asset_published_index" ON "stock_advisor"."news_items" USING btree ("asset_id","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "price_snapshots_run_asset_unique" ON "stock_advisor"."price_snapshots" USING btree ("run_key","asset_id");--> statement-breakpoint
CREATE INDEX "price_snapshots_asset_asof_index" ON "stock_advisor"."price_snapshots" USING btree ("asset_id","as_of");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_workspace_endpoint_unique" ON "stock_advisor"."push_subscriptions" USING btree ("workspace_key","endpoint");--> statement-breakpoint
CREATE UNIQUE INDEX "tracked_assets_workspace_ticker_unique" ON "stock_advisor"."tracked_assets" USING btree ("workspace_key","ticker");--> statement-breakpoint
CREATE INDEX "tracked_assets_workspace_active_index" ON "stock_advisor"."tracked_assets" USING btree ("workspace_key","is_active");