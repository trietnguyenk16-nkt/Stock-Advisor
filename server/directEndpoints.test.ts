import { afterEach, describe, expect, it, vi } from "vitest";
import aiConfig from "../api/ai/config";
import aiModel from "../api/ai/model";
import marketQuote from "../api/market/quote";
import marketHistory from "../api/market/history";
import pushConfig from "../api/push/config";

const originalOpenAiKey = process.env.OPENAI_API_KEY;
function responseHarness() {
  let body = "";
  const res = { statusCode: 200, headers: new Map<string, string>(), setHeader(key: string, value: string) { this.headers.set(key, value); }, end(value?: string | Uint8Array) { body = typeof value === "string" ? value : value ? new TextDecoder().decode(value) : ""; } };
  return { res, read: () => JSON.parse(body) };
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAiKey;
});

describe("direct Vercel endpoint contracts", () => {
  it("returns OpenAI config without requiring a database connection", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const harness = responseHarness();
    await aiConfig({} as any, harness.res as any);
    expect(harness.res.statusCode).toBe(200);
    expect(harness.read()).toMatchObject({ enabled: true, model: "gpt-4o-mini" });
  });

  it("validates model POST input and returns a JSON error", async () => {
    const harness = responseHarness();
    await aiModel({ body: { model: "invalid" } } as any, harness.res as any);
    expect(harness.res.statusCode).toBe(400);
    expect(harness.read().error).toContain("không được hỗ trợ");
  });

  it("serves quote GET with the expected normalized response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ chart: { result: [{ meta: { shortName: "Vinamilk", currency: "VND", regularMarketPrice: 70000, previousClose: 69000 }, indicators: { quote: [{ close: [69000, 70000] }] } }] } }), { status: 200, headers: { "content-type": "application/json" } })));
    const harness = responseHarness();
    await marketQuote({ url: "/api/market/quote?ticker=vnm.vn", headers: {} } as any, harness.res as any);
    expect(harness.res.statusCode).toBe(200);
    expect(harness.read()).toMatchObject({ ticker: "VNM.VN", name: "Vinamilk", price: 70000, currency: "VND" });
  });

  it("returns safe empty history and push config responses without optional secrets", async () => {
    const historyHarness = responseHarness();
    await marketHistory({} as any, historyHarness.res as any);
    expect(historyHarness.res.statusCode).toBe(200);
    const historyBody = historyHarness.read() as { syncRuns: unknown[]; emailDeliveries: unknown[] };
    expect(Array.isArray(historyBody.syncRuns)).toBe(true);
    expect(Array.isArray(historyBody.emailDeliveries)).toBe(true);
    const pushHarness = responseHarness();
    await pushConfig({} as any, pushHarness.res as any);
    expect(pushHarness.res.statusCode).toBe(200);
    expect(pushHarness.read()).toEqual({ enabled: false, publicKey: null });
  });
});
