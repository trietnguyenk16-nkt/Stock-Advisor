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
});
