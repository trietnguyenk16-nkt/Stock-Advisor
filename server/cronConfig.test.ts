import { describe, expect, it } from "vitest";
import { MARKET_SYNC_TIMEZONE, VERCEL_MARKET_SYNC_CRON, readVercelMarketSyncCron, vietnamTimeToVercelCron } from "./cronConfig";

describe("Vercel cron configuration", () => {
  it("maps 18:00 Vietnam time to 11:00 UTC", () => {
    expect(MARKET_SYNC_TIMEZONE).toBe("Asia/Ho_Chi_Minh");
    expect(vietnamTimeToVercelCron(18, 0)).toBe("0 11 * * *");
    expect(VERCEL_MARKET_SYNC_CRON).toBe("0 11 * * *");
    expect(readVercelMarketSyncCron()).toBe(VERCEL_MARKET_SYNC_CRON);
  });

  it("supports a user-editable daily schedule", () => {
    expect(vietnamTimeToVercelCron(7, 30)).toBe("30 0 * * *");
    expect(vietnamTimeToVercelCron(0, 0)).toBe("0 17 * * *");
  });
});
