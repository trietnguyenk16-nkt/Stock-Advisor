import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("not-DONE issue implementation contracts", () => {
  it("keeps the Vercel daily cron route and secret guard aligned", () => {
    const config = read("vercel.json");
    const cronHandler = read("api/cron/sync-market.ts");
    expect(config).toContain('"path": "/api/cron/sync-market"');
    expect(config).toContain('"schedule": "0 11 * * *"');
    expect(cronHandler).toContain("CRON_SECRET");
    expect(cronHandler).toContain("dailyRunKey");
  });

  it("keeps the shared Supabase migration additive-only and isolated", () => {
    const migration = read("supabase/migrations/20260815_stock_advisor_additive.sql");
    expect(migration).toContain("create schema if not exists stock_advisor");
    expect(migration).toContain("stock_advisor.tracked_assets");
    expect(migration).toContain("stock_advisor.ai_settings");
    const executableSql = migration.replace(/^\s*--.*$/gm, "");
    expect(executableSql).not.toMatch(/^\s*(drop|truncate|alter|update|delete)\b/gim);
    expect(migration).not.toContain("public.");
  });

  it("keeps the watchlist, history and AI requirements from issue #18–#20 wired", () => {
    const home = read("client/src/pages/Home.tsx");
    const directApi = read("client/src/lib/directApi.ts");
    const history = read("api/market/history.ts");
    const analyze = read("api/ai/analyze.ts");
    expect(home).toContain("So sánh ngày");
    expect(home).toContain("Bắt đầu phân tích AI");
    expect(directApi).toContain("requirement");
    expect(history).toContain("comparisons");
    expect(analyze).toContain("requested_ticker");
  });

  it("keeps the production data and readiness safeguards from issue #21", () => {
    const providers = read("server/vietnamProviders.ts");
    const analyze = read("api/ai/analyze.ts");
    const pushConfig = read("api/push/config.ts");
    expect(providers).toContain("SSISCA");
    expect(analyze).toContain("Không có NAV quỹ hợp lệ");
    expect(analyze).toContain("Không có giá Yahoo hợp lệ");
    expect(pushConfig).toContain("VAPID_PUBLIC_KEY");
  });
});
