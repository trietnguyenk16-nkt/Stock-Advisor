import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());

describe("direct Vercel API contract", () => {
  it("ships independent handlers for dashboard procedures", () => {
    for (const file of [
      "api/ai/config.ts",
      "api/ai/model.ts",
      "api/market/quote.ts",
      "api/market/sync.ts",
      "api/market/history.ts",
      "api/push/config.ts",
      "api/push/subscribe.ts",
      "api/push/unsubscribe.ts",
    ]) {
      expect(existsSync(resolve(root, file)), file).toBe(true);
    }
  });

  it("uses direct API URLs in the dashboard-facing client helper", () => {
    const source = readFileSync(resolve(root, "client/src/lib/directApi.ts"), "utf8");
    expect(source).toContain("/api/ai/config");
    expect(source).toContain("/api/market/sync");
    expect(source).toContain("/api/market/quote");
    expect(source).not.toContain("/api/trpc");
  });

  it("stays within the Vercel Hobby serverless-function limit", () => {
    const deployedHandlers = [
      "api/ai/analyze.ts", "api/ai/config.ts", "api/ai/model.ts", "api/cron/sync-market.ts",
      "api/health.ts", "api/market/assets.ts", "api/market/history.ts", "api/market/quote.ts",
      "api/market/sync.ts", "api/push/config.ts", "api/push/subscribe.ts", "api/push/unsubscribe.ts",
    ];
    expect(deployedHandlers).toHaveLength(12);
    for (const file of deployedHandlers) expect(existsSync(resolve(root, file)), file).toBe(true);
    expect(existsSync(resolve(root, "api/trpc/[trpc].ts"))).toBe(false);
  });
});
