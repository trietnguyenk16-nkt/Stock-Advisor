CREATE TABLE "stock_advisor"."ai_advice_runs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_advisor"."ai_advice_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"run_key" varchar(96) NOT NULL,
	"workspace_key" varchar(96) DEFAULT 'owner' NOT NULL,
	"requested_ticker" varchar(32),
	"additional_requirement" text,
	"model" varchar(64) NOT NULL,
	"status" varchar(16) NOT NULL,
	"assets_requested" integer DEFAULT 0 NOT NULL,
	"assets_analyzed" integer DEFAULT 0 NOT NULL,
	"assets_skipped" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"response_json" jsonb,
	"started_at" bigint NOT NULL,
	"finished_at" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_advice_runs_run_key_unique" UNIQUE("run_key")
);
--> statement-breakpoint
CREATE TABLE "stock_advisor"."sync_run_assets" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_advisor"."sync_run_assets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"run_key" varchar(96) NOT NULL,
	"asset_id" bigint NOT NULL,
	"ticker" varchar(32) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"status" varchar(16) NOT NULL,
	"previous_price" numeric(20, 6),
	"price" numeric(20, 6),
	"bid" numeric(20, 6),
	"ask" numeric(20, 6),
	"change_percent" numeric(12, 6),
	"source_name" varchar(128),
	"source_url" varchar(1024),
	"as_of" bigint,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_advisor"."sync_run_assets" ADD CONSTRAINT "sync_run_assets_asset_id_tracked_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "stock_advisor"."tracked_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_advice_runs_workspace_started_index" ON "stock_advisor"."ai_advice_runs" USING btree ("workspace_key","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_run_assets_run_asset_unique" ON "stock_advisor"."sync_run_assets" USING btree ("run_key","asset_id");--> statement-breakpoint
CREATE INDEX "sync_run_assets_run_key_index" ON "stock_advisor"."sync_run_assets" USING btree ("run_key");