import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.


import { and, desc } from "drizzle-orm";
import { assetAnalyses, emailDeliveries, newsItems, priceSnapshots, syncRuns, trackedAssets } from "../drizzle/schema";

export async function getTrackedAssets(workspaceKey = "owner") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trackedAssets).where(and(eq(trackedAssets.workspaceKey, workspaceKey), eq(trackedAssets.isActive, 1))).orderBy(trackedAssets.id);
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
  const result = await db.insert(syncRuns).values({ runKey, status: "running", startedAt }).onDuplicateKeyUpdate({ set: { runKey } });
  const rows = await db.select().from(syncRuns).where(eq(syncRuns.runKey, runKey)).limit(1);
  const affectedRows = Number((result as unknown as Array<{ affectedRows?: number }>)[0]?.affectedRows ?? 0);
  return { run: rows[0], claimed: affectedRows === 1 };
}

export async function finishSyncRun(runKey: string, result: { status: "success" | "partial" | "failed"; finishedAt: number; assetsProcessed: number; assetsSucceeded: number; errorMessage?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(syncRuns).set(result).where(eq(syncRuns.runKey, runKey));
}

export async function insertPriceSnapshot(values: typeof priceSnapshots.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(priceSnapshots).values(values).onDuplicateKeyUpdate({ set: { asOf: values.asOf, price: values.price, bid: values.bid, ask: values.ask, changePercent: values.changePercent, sourceName: values.sourceName, sourceUrl: values.sourceUrl, freshness: values.freshness, warning: values.warning } });
}

export async function insertNewsItem(values: typeof newsItems.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(newsItems).values(values).onDuplicateKeyUpdate({ set: { fetchedAt: values.fetchedAt, title: values.title, snippet: values.snippet, publishedAt: values.publishedAt } });
}

export async function insertAssetAnalysis(values: typeof assetAnalyses.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(assetAnalyses).values(values).onDuplicateKeyUpdate({ set: { signal: values.signal, summary: values.summary, referencePrice: values.referencePrice, targetPrice: values.targetPrice, risk: values.risk, confidence: values.confidence, asOf: values.asOf } });
}

export async function recordEmailDelivery(values: typeof emailDeliveries.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(emailDeliveries).values(values).onDuplicateKeyUpdate({ set: { status: values.status, providerMessageId: values.providerMessageId, errorMessage: values.errorMessage, sentAt: values.sentAt } });
}

export async function getLatestSnapshots(workspaceKey = "owner") {
  const db = await getDb();
  if (!db) return [];
  return db.select({ asset: trackedAssets, snapshot: priceSnapshots }).from(trackedAssets).leftJoin(priceSnapshots, eq(trackedAssets.id, priceSnapshots.assetId)).where(and(eq(trackedAssets.workspaceKey, workspaceKey), eq(trackedAssets.isActive, 1))).orderBy(desc(priceSnapshots.asOf));
}


export async function addTrackedAsset(values: typeof trackedAssets.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(trackedAssets).values(values).onDuplicateKeyUpdate({ set: { displayName: values.displayName, assetType: values.assetType, exchange: values.exchange, providerCode: values.providerCode, currency: values.currency, unit: values.unit, isActive: 1 } });
  const rows = await db.select().from(trackedAssets).where(and(eq(trackedAssets.workspaceKey, values.workspaceKey ?? "owner"), eq(trackedAssets.ticker, values.ticker))).limit(1);
  return rows[0];
}

export async function deactivateTrackedAsset(ticker: string, workspaceKey = "owner") {
  const db = await getDb();
  if (!db) return;
  await db.update(trackedAssets).set({ isActive: 0 }).where(and(eq(trackedAssets.workspaceKey, workspaceKey), eq(trackedAssets.ticker, ticker)));
}


export async function getEmailDelivery(runKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(emailDeliveries).where(eq(emailDeliveries.runKey, runKey)).limit(1);
  return rows[0];
}
