import { describe, expect, it } from "vitest";
import { marketRouter } from "./market";
import { appRouter } from "./routers";
import { getPushConfig } from "./push";

describe("market dashboard features", () => {
  it("exposes manual sync and history procedures", () => {
    expect(marketRouter._def.procedures.syncNow).toBeDefined();
    expect(marketRouter._def.procedures.history).toBeDefined();
  });

  it("exposes push subscription procedures without requiring VAPID configuration", () => {
    expect(appRouter._def.record.push).toBeDefined();
    expect(getPushConfig().enabled).toBe(false);
  });
});
