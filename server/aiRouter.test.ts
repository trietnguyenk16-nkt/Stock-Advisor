import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { setAiModel } from "./db";
import { resolveSyncAiModel } from "./syncMarket";

const ctx: TrpcContext = {
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("AI model procedures", () => {
  it("exposes config and setModel procedures", () => {
    expect(appRouter._def.record.ai).toBeDefined();
  });

  it("persists the selected model and sync resolves it from ai_settings", async () => {
    const caller = appRouter.createCaller(ctx);
    const selected = await caller.ai.setModel({ model: "gpt-5-mini" });
    expect(selected).toEqual({ ok: true, model: "gpt-5-mini" });

    const config = await caller.ai.config();
    expect(config.model).toBe("gpt-5-mini");
    expect(config.models).toEqual(["gpt-4o-mini", "gpt-5-mini"]);
    expect(config.enabled).toBe(true);
    await setAiModel("gpt-4o-mini");
    await expect(resolveSyncAiModel()).resolves.toBe("gpt-4o-mini");
  });
});
