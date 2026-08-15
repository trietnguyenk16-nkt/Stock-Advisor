import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ENV } from "./_core/env";
import { InsertUser, assetAnalyses, emailDeliveries, newsItems, priceSnapshots, pushSubscriptions, syncRuns, trackedAssets, users } from "../drizzle/schema";

type Database = ReturnType<typeof drizzle>;
let _pool: Pool | null = null;
let _db: Database | null = null;
let _ownerEnsured = false;

export async function getDb() {
  const configuredUrl = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!_db && configuredUrl) {
    try {
      const connectionString = configuredUrl.replace(/([?&])sslmode=[^&]*/i, "$1").replace(/[?&]$/, "");
      _pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000, maxUses: 500 });
      _db = drizzle(_pool);
      if (ENV.ownerOpenId && !_ownerEnsured) {
        await _db.insert(users).values({
          openId: ENV.ownerOpenId,
          name: process.env.OWNER_NAME ?? "Stock Advisor Owner",
          email: process.env.ALERT_EMAIL ?? null,
          role: "admin",
          lastSignedIn: new Date(),
        }).onConflictDoUpdate({
          target: users.openId,
          set: { name: process.env.OWNER_NAME ?? "Stock Advisor Owner", email: process.env.ALERT_EMAIL ?? null, role: "admin", updatedAt: new Date() },
        });
        _ownerEnsured = true;
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, name: user.name ?? null, email: user.email ?? null, loginMethod: user.loginMethod ?? null, role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"), lastSignedIn: user.lastSignedIn ?? new Date() };
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: { name: values.name, email: values.email, loginMethod: values.loginMethod, role: values.role, lastSignedIn: values.lastSignedIn, updatedAt: new Date() } });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0];
}

export async function getTrackedAssets(workspaceKey = "owner") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trackedAssets).where(and(eq(trackedAssets.workspaceKey, workspaceKey), eq(trackedAssets.isActive, true))).orderBy(trackedAssets.id);
}

export async function getLatestSyncRun() {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(1);
  return rows[0];
}

export async function createSyncRun(runKey: string, startedAt: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(syncRuns).values({ runKey, status: "running", startedAt }).onConflictDoNothing({ target: syncRuns.runKey });
  const rows = await db.select().from(syncRuns).where(eq(syncRuns.runKey, runKey)).limit(1);
  return { run: rows[0], claimed: result.rowCount === 1 };
}

export async function finishSyncRun(runKey: string, result: { status: "success" | "partial" | "failed"; finishedAt: number; assetsProcessed: number; assetsSucceeded: number; errorMessage?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(syncRuns).set(result).where(eq(syncRuns.runKey, runKey));
}

export async function insertPriceSnapshot(values: typeof priceSnapshots.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(priceSnapshots).values(values).onConflictDoUpdate({ target: [priceSnapshots.runKey, priceSnapshots.assetId], set: { asOf: values.asOf, price: values.price, bid: values.bid, ask: values.ask, changePercent: values.changePercent, sourceName: values.sourceName, sourceUrl: values.sourceUrl, freshness: values.freshness, warning: values.warning } });
}

export async function insertNewsItem(values: typeof newsItems.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(newsItems).values(values).onConflictDoUpdate({ target: [newsItems.assetId, newsItems.fingerprint], set: { fetchedAt: values.fetchedAt, title: values.title, snippet: values.snippet, publishedAt: values.publishedAt } });
}

export async function insertAssetAnalysis(values: typeof assetAnalyses.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(assetAnalyses).values(values).onConflictDoUpdate({ target: [assetAnalyses.runKey, assetAnalyses.assetId], set: { signal: values.signal, summary: values.summary, referencePrice: values.referencePrice, targetPrice: values.targetPrice, risk: values.risk, confidence: values.confidence, asOf: values.asOf } });
}

export async function recordEmailDelivery(values: typeof emailDeliveries.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(emailDeliveries).values(values).onConflictDoUpdate({ target: emailDeliveries.runKey, set: { status: values.status, providerMessageId: values.providerMessageId, errorMessage: values.errorMessage, sentAt: values.sentAt } });
}

export async function getLatestSnapshots(workspaceKey = "owner") {
  const db = await getDb();
  if (!db) return [];
  return db.select({ asset: trackedAssets, snapshot: priceSnapshots }).from(trackedAssets).leftJoin(priceSnapshots, eq(trackedAssets.id, priceSnapshots.assetId)).where(and(eq(trackedAssets.workspaceKey, workspaceKey), eq(trackedAssets.isActive, true))).orderBy(desc(priceSnapshots.asOf));
}

export async function getDashboardData(workspaceKey = "owner") {
  const db = await getDb();
  if (!db) return { assets: [], latestSync: undefined };
  const assets = await getTrackedAssets(workspaceKey);
  const snapshots = await db.select().from(priceSnapshots).orderBy(desc(priceSnapshots.asOf));
  const news = await db.select().from(newsItems).orderBy(desc(newsItems.publishedAt), desc(newsItems.fetchedAt));
  const analyses = await db.select().from(assetAnalyses).orderBy(desc(assetAnalyses.asOf));
  const latestBy = <T extends { assetId: number }>(rows: T[]) => { const map = new Map<number, T>(); for (const row of rows) if (!map.has(row.assetId)) map.set(row.assetId, row); return map; };
  const latestSnapshots = latestBy(snapshots);
  const latestNews = new Map<number, typeof news>();
  for (const item of news) { const list = latestNews.get(item.assetId) ?? []; if (list.length < 5) list.push(item); latestNews.set(item.assetId, list); }
  const latestAnalyses = latestBy(analyses);
  return { assets: assets.map((asset) => ({ asset, snapshot: latestSnapshots.get(asset.id), news: latestNews.get(asset.id) ?? [], analysis: latestAnalyses.get(asset.id) })), latestSync: await getLatestSyncRun() };
}

export async function addTrackedAsset(values: typeof trackedAssets.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(trackedAssets).values({ ...values, isActive: true }).onConflictDoUpdate({ target: [trackedAssets.workspaceKey, trackedAssets.ticker], set: { displayName: values.displayName, assetType: values.assetType, exchange: values.exchange, providerCode: values.providerCode, currency: values.currency, unit: values.unit, isActive: true, updatedAt: new Date() } });
  const rows = await db.select().from(trackedAssets).where(and(eq(trackedAssets.workspaceKey, values.workspaceKey ?? "owner"), eq(trackedAssets.ticker, values.ticker))).limit(1);
  return rows[0];
}

export async function deactivateTrackedAsset(ticker: string, workspaceKey = "owner") {
  const db = await getDb();
  if (!db) return;
  await db.update(trackedAssets).set({ isActive: false, updatedAt: new Date() }).where(and(eq(trackedAssets.workspaceKey, workspaceKey), eq(trackedAssets.ticker, ticker)));
}

export async function getEmailDelivery(runKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(emailDeliveries).where(eq(emailDeliveries.runKey, runKey)).limit(1);
  return rows[0];
}

export async function getSyncHistory(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(Math.min(Math.max(limit, 1), 100));
}

export async function getEmailHistory(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emailDeliveries).orderBy(desc(emailDeliveries.createdAt)).limit(Math.min(Math.max(limit, 1), 100));
}

export async function upsertPushSubscription(values: { workspaceKey?: string; endpoint: string; p256dh: string; auth: string; userAgent?: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const workspaceKey = values.workspaceKey ?? "owner";
  await db.insert(pushSubscriptions).values({ ...values, workspaceKey }).onConflictDoUpdate({ target: [pushSubscriptions.workspaceKey, pushSubscriptions.endpoint], set: { p256dh: values.p256dh, auth: values.auth, userAgent: values.userAgent, updatedAt: new Date() } });
  const rows = await db.select().from(pushSubscriptions).where(and(eq(pushSubscriptions.workspaceKey, workspaceKey), eq(pushSubscriptions.endpoint, values.endpoint))).limit(1);
  return rows[0];
}

export async function deletePushSubscription(endpoint: string, workspaceKey = "owner") {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.workspaceKey, workspaceKey), eq(pushSubscriptions.endpoint, endpoint)));
}

export async function getPushSubscriptions(workspaceKey = "owner") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.workspaceKey, workspaceKey));
}
