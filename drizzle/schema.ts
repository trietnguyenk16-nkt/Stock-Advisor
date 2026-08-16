import { bigint, boolean, decimal, index, integer, jsonb, pgSchema, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const stockAdvisor = pgSchema("stock_advisor");

export const users = stockAdvisor.table("users", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: varchar("role", { length: 16 }).default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
});

export const trackedAssets = stockAdvisor.table("tracked_assets", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  workspaceKey: varchar("workspace_key", { length: 96 }).notNull().default("owner"),
  ticker: varchar("ticker", { length: 32 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  assetType: varchar("asset_type", { length: 16 }).notNull(),
  exchange: varchar("exchange", { length: 16 }),
  providerCode: varchar("provider_code", { length: 64 }).notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("VND"),
  unit: varchar("unit", { length: 32 }).notNull().default("share"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workspaceTickerUnique: uniqueIndex("tracked_assets_workspace_ticker_unique").on(table.workspaceKey, table.ticker),
  workspaceActiveIndex: index("tracked_assets_workspace_active_index").on(table.workspaceKey, table.isActive),
}));

export const priceSnapshots = stockAdvisor.table("price_snapshots", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  assetId: bigint("asset_id", { mode: "number" }).notNull().references(() => trackedAssets.id, { onDelete: "cascade" }),
  runKey: varchar("run_key", { length: 96 }).notNull(),
  price: decimal("price", { precision: 20, scale: 6 }),
  bid: decimal("bid", { precision: 20, scale: 6 }),
  ask: decimal("ask", { precision: 20, scale: 6 }),
  changePercent: decimal("change_percent", { precision: 12, scale: 6 }),
  asOf: bigint("as_of", { mode: "number" }).notNull(),
  sourceName: varchar("source_name", { length: 128 }).notNull(),
  sourceUrl: varchar("source_url", { length: 1024 }),
  freshness: varchar("freshness", { length: 32 }).notNull().default("unknown"),
  warning: text("warning"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  runAssetUnique: uniqueIndex("price_snapshots_run_asset_unique").on(table.runKey, table.assetId),
  assetAsOfIndex: index("price_snapshots_asset_asof_index").on(table.assetId, table.asOf),
}));

export const newsItems = stockAdvisor.table("news_items", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  assetId: bigint("asset_id", { mode: "number" }).notNull().references(() => trackedAssets.id, { onDelete: "cascade" }),
  fingerprint: varchar("fingerprint", { length: 128 }).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  sourceName: varchar("source_name", { length: 128 }).notNull(),
  sourceUrl: varchar("source_url", { length: 1024 }).notNull(),
  snippet: text("snippet"),
  publishedAt: bigint("published_at", { mode: "number" }),
  fetchedAt: bigint("fetched_at", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  assetFingerprintUnique: uniqueIndex("news_items_asset_fingerprint_unique").on(table.assetId, table.fingerprint),
  assetPublishedIndex: index("news_items_asset_published_index").on(table.assetId, table.publishedAt),
}));

export const assetAnalyses = stockAdvisor.table("asset_analyses", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  assetId: bigint("asset_id", { mode: "number" }).notNull().references(() => trackedAssets.id, { onDelete: "cascade" }),
  runKey: varchar("run_key", { length: 96 }).notNull(),
  signal: varchar("signal", { length: 8 }).notNull(),
  summary: text("summary").notNull(),
  referencePrice: decimal("reference_price", { precision: 20, scale: 6 }),
  targetPrice: decimal("target_price", { precision: 20, scale: 6 }),
  risk: text("risk").notNull(),
  confidence: decimal("confidence", { precision: 6, scale: 4 }),
  asOf: bigint("as_of", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  runAssetUnique: uniqueIndex("asset_analyses_run_asset_unique").on(table.runKey, table.assetId),
}));

export const syncRuns = stockAdvisor.table("sync_runs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  runKey: varchar("run_key", { length: 96 }).notNull().unique(),
  status: varchar("status", { length: 16 }).notNull(),
  startedAt: bigint("started_at", { mode: "number" }).notNull(),
  finishedAt: bigint("finished_at", { mode: "number" }),
  assetsProcessed: integer("assets_processed").notNull().default(0),
  assetsSucceeded: integer("assets_succeeded").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const syncRunAssets = stockAdvisor.table("sync_run_assets", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  runKey: varchar("run_key", { length: 96 }).notNull(),
  assetId: bigint("asset_id", { mode: "number" }).notNull().references(() => trackedAssets.id, { onDelete: "cascade" }),
  ticker: varchar("ticker", { length: 32 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 16 }).notNull(),
  previousPrice: decimal("previous_price", { precision: 20, scale: 6 }),
  price: decimal("price", { precision: 20, scale: 6 }),
  bid: decimal("bid", { precision: 20, scale: 6 }),
  ask: decimal("ask", { precision: 20, scale: 6 }),
  changePercent: decimal("change_percent", { precision: 12, scale: 6 }),
  sourceName: varchar("source_name", { length: 128 }),
  sourceUrl: varchar("source_url", { length: 1024 }),
  asOf: bigint("as_of", { mode: "number" }),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  runAssetUnique: uniqueIndex("sync_run_assets_run_asset_unique").on(table.runKey, table.assetId),
  runKeyIndex: index("sync_run_assets_run_key_index").on(table.runKey),
}));

export const pushSubscriptions = stockAdvisor.table("push_subscriptions", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  workspaceKey: varchar("workspace_key", { length: 96 }).notNull().default("owner"),
  endpoint: varchar("endpoint", { length: 2048 }).notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: varchar("user_agent", { length: 512 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workspaceEndpointUnique: uniqueIndex("push_subscriptions_workspace_endpoint_unique").on(table.workspaceKey, table.endpoint),
}));

export const aiSettings = stockAdvisor.table("ai_settings", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  workspaceKey: varchar("workspace_key", { length: 96 }).notNull().default("owner").unique(),
  model: varchar("model", { length: 64 }).notNull().default("gpt-4o-mini"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const aiAdviceRuns = stockAdvisor.table("ai_advice_runs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  runKey: varchar("run_key", { length: 96 }).notNull().unique(),
  workspaceKey: varchar("workspace_key", { length: 96 }).notNull().default("owner"),
  requestedTicker: varchar("requested_ticker", { length: 32 }),
  additionalRequirement: text("additional_requirement"),
  model: varchar("model", { length: 64 }).notNull(),
  status: varchar("status", { length: 16 }).notNull(),
  assetsRequested: integer("assets_requested").notNull().default(0),
  assetsAnalyzed: integer("assets_analyzed").notNull().default(0),
  assetsSkipped: integer("assets_skipped").notNull().default(0),
  errorMessage: text("error_message"),
  responseJson: jsonb("response_json"),
  startedAt: bigint("started_at", { mode: "number" }).notNull(),
  finishedAt: bigint("finished_at", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workspaceStartedIndex: index("ai_advice_runs_workspace_started_index").on(table.workspaceKey, table.startedAt),
}));

export const emailDeliveries = stockAdvisor.table("email_deliveries", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  runKey: varchar("run_key", { length: 96 }).notNull().unique(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  status: varchar("status", { length: 16 }).notNull(),
  providerMessageId: varchar("provider_message_id", { length: 255 }),
  errorMessage: text("error_message"),
  sentAt: bigint("sent_at", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type TrackedAsset = typeof trackedAssets.$inferSelect;
export type InsertTrackedAsset = typeof trackedAssets.$inferInsert;
export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type NewsItem = typeof newsItems.$inferSelect;
export type AssetAnalysis = typeof assetAnalyses.$inferSelect;
export type SyncRun = typeof syncRuns.$inferSelect;
export type SyncRunAsset = typeof syncRunAssets.$inferSelect;
export type EmailDelivery = typeof emailDeliveries.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type AiAdviceRun = typeof aiAdviceRuns.$inferSelect;
