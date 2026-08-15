import { readFileSync } from "node:fs";

export const MARKET_SYNC_TIMEZONE = "Asia/Ho_Chi_Minh";

type VercelConfig = { crons?: Array<{ path?: string; schedule?: string }> };

export function readVercelMarketSyncCron() {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as VercelConfig;
  const cron = config.crons?.find((item) => item.path === "/api/cron/sync-market")?.schedule;
  if (!cron) throw new Error("Missing /api/cron/sync-market schedule in vercel.json");
  return cron;
}

/** Vercel Cron uses UTC; Vietnam is UTC+7 year-round. */
export function vietnamTimeToVercelCron(hour: number, minute: number) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error("Vietnam hour must be between 0 and 23");
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error("Vietnam minute must be between 0 and 59");
  return `${minute} ${(hour - 7 + 24) % 24} * * *`;
}

export const VERCEL_MARKET_SYNC_CRON = readVercelMarketSyncCron();
