CREATE TABLE "stock_advisor"."ai_settings" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_advisor"."ai_settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"workspace_key" varchar(96) DEFAULT 'owner' NOT NULL,
	"model" varchar(64) DEFAULT 'gpt-4o-mini' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_settings_workspace_key_unique" UNIQUE("workspace_key")
);
