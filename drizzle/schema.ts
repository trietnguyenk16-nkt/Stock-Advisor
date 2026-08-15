import { bigint, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar, decimal } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const trackedAssets = mysqlTable("tracked_assets", {
  id: int("id").autoincrement().primaryKey(),
  workspaceKey: varchar("workspaceKey", { length: 96 }).notNull().default("owner"),
  ticker: varchar("ticker", { length: 32 }).notNull(),
  displayName: varchar("displayName", { length: 255 }).notNull(),
  assetType: mysqlEnum("assetType", ["equity", "fund", "gold"]).notNull(),
  exchange: varchar("exchange", { length: 16 }),
  providerCode: varchar("providerCode", { length: 64 }).notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("VND"),
  unit: varchar("unit", { length: 32 }).notNull().default("share"),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  workspaceTickerUnique: uniqueIndex("tracked_assets_workspace_ticker_unique").on(table.workspaceKey, table.ticker),
  workspaceActiveIndex: index("tracked_assets_workspace_active_index").on(table.workspaceKey, table.isActive),
}));

export const priceSnapshots = mysqlTable("price_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  runKey: varchar("runKey", { length: 96 }).notNull(),
  price: decimal("price", { precision: 20, scale: 6 }),
  bid: decimal("bid", { precision: 20, scale: 6 }),
  ask: decimal("ask", { precision: 20, scale: 6 }),
  changePercent: decimal("changePercent", { precision: 12, scale: 6 }),
  asOf: bigint("asOf", { mode: "number" }).notNull(),
  sourceName: varchar("sourceName", { length: 128 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 512 }),
  freshness: varchar("freshness", { length: 32 }).notNull().default("unknown"),
  warning: text("warning"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  runAssetUnique: uniqueIndex("price_snapshots_run_asset_unique").on(table.runKey, table.assetId),
  assetAsOfIndex: index("price_snapshots_asset_asof_index").on(table.assetId, table.asOf),
}));

export const newsItems = mysqlTable("news_items", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  fingerprint: varchar("fingerprint", { length: 128 }).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  sourceName: varchar("sourceName", { length: 128 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1024 }).notNull(),
  snippet: text("snippet"),
  publishedAt: bigint("publishedAt", { mode: "number" }),
  fetchedAt: bigint("fetchedAt", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  assetFingerprintUnique: uniqueIndex("news_items_asset_fingerprint_unique").on(table.assetId, table.fingerprint),
  assetPublishedIndex: index("news_items_asset_published_index").on(table.assetId, table.publishedAt),
}));

export const assetAnalyses = mysqlTable("asset_analyses", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  runKey: varchar("runKey", { length: 96 }).notNull(),
  signal: mysqlEnum("signal", ["BUY", "SELL", "HOLD"]).notNull(),
  summary: text("summary").notNull(),
  referencePrice: decimal("referencePrice", { precision: 20, scale: 6 }),
  targetPrice: decimal("targetPrice", { precision: 20, scale: 6 }),
  risk: text("risk").notNull(),
  confidence: decimal("confidence", { precision: 6, scale: 4 }),
  asOf: bigint("asOf", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  runAssetUnique: uniqueIndex("asset_analyses_run_asset_unique").on(table.runKey, table.assetId),
}));

export const syncRuns = mysqlTable("sync_runs", {
  id: int("id").autoincrement().primaryKey(),
  runKey: varchar("runKey", { length: 96 }).notNull().unique(),
  status: mysqlEnum("status", ["running", "success", "partial", "failed"]).notNull(),
  startedAt: bigint("startedAt", { mode: "number" }).notNull(),
  finishedAt: bigint("finishedAt", { mode: "number" }),
  assetsProcessed: int("assetsProcessed").notNull().default(0),
  assetsSucceeded: int("assetsSucceeded").notNull().default(0),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  workspaceKey: varchar("workspaceKey", { length: 96 }).notNull().default("owner"),
  endpoint: varchar("endpoint", { length: 2048 }).notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: varchar("userAgent", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  workspaceEndpointUnique: uniqueIndex("push_subscriptions_workspace_endpoint_unique").on(table.workspaceKey, table.endpoint),
}));

export const emailDeliveries = mysqlTable("email_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  runKey: varchar("runKey", { length: 96 }).notNull().unique(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["sent", "skipped", "failed"]).notNull(),
  providerMessageId: varchar("providerMessageId", { length: 255 }),
  errorMessage: text("errorMessage"),
  sentAt: bigint("sentAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type TrackedAsset = typeof trackedAssets.$inferSelect;
export type InsertTrackedAsset = typeof trackedAssets.$inferInsert;
export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type NewsItem = typeof newsItems.$inferSelect;
export type AssetAnalysis = typeof assetAnalyses.$inferSelect;
export type SyncRun = typeof syncRuns.$inferSelect;
export type EmailDelivery = typeof emailDeliveries.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
