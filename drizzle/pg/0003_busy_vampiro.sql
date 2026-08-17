ALTER TABLE "stock_advisor"."ai_advice_runs" ADD COLUMN "summary_title" text;--> statement-breakpoint
ALTER TABLE "stock_advisor"."ai_advice_runs" ADD COLUMN "detail_text" text;--> statement-breakpoint
ALTER TABLE "stock_advisor"."sync_runs" ADD COLUMN "summary_title" text;--> statement-breakpoint
ALTER TABLE "stock_advisor"."sync_runs" ADD COLUMN "detail_text" text;--> statement-breakpoint
ALTER TABLE "stock_advisor"."sync_runs" ADD COLUMN "details_json" jsonb;