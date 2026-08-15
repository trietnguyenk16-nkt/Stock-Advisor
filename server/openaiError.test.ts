import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeAssetWithOpenAI } from "./openai";

describe("OpenAI error handling", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("returns no analysis when the key is not configured", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(analyzeAssetWithOpenAI("gpt-4o-mini", { asset: {}, quote: {}, news: [] })).resolves.toBeNull();
  });

  it("surfaces a bounded provider error for a rejected request", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid key", { status: 401, statusText: "Unauthorized" })));
    await expect(analyzeAssetWithOpenAI("gpt-5-mini", { asset: {}, quote: {}, news: [] })).rejects.toThrow("OpenAI failed: 401");
  });
});
