import { afterEach, describe, expect, it, vi } from "vitest";
import aiConfig from "../api/ai/config";
import aiModel from "../api/ai/model";
import marketQuote from "../api/market/quote";
import marketHistory from "../api/market/history";
import pushConfig from "../api/push/config";

const originalOpenAiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAiKey;
});

describe("direct Vercel endpoint contracts", () => {
  it("returns OpenAI config without requiring a database connection", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const response = await aiConfig();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ enabled: true, model: "gpt-4o-mini" });
  });

  it("validates model POST input and returns a JSON error", async () => {
    const response = await aiModel(new Request("https://example.test/api/ai/model", { method: "POST", body: JSON.stringify({ model: "invalid" }) }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("không được hỗ trợ");
  });

  it("serves quote GET with the expected normalized response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ chart: { result: [{ meta: { shortName: "Vinamilk", currency: "VND", regularMarketPrice: 70000, previousClose: 69000 }, indicators: { quote: [{ close: [69000, 70000] }] } }] } }), { status: 200, headers: { "content-type": "application/json" } })));
    const response = await marketQuote(new Request("https://example.test/api/market/quote?ticker=vnm.vn"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ticker: "VNM.VN", name: "Vinamilk", price: 70000, currency: "VND" });
  });

  it("returns safe empty history and push config responses without optional secrets", async () => {
    const history = await marketHistory();
    expect(history.status).toBe(200);
    const historyBody = await history.json() as { syncRuns: unknown[]; emailDeliveries: unknown[] };
    expect(Array.isArray(historyBody.syncRuns)).toBe(true);
    expect(Array.isArray(historyBody.emailDeliveries)).toBe(true);
    const push = await pushConfig();
    expect(push.status).toBe(200);
    expect(await push.json()).toEqual({ enabled: false, publicKey: null });
  });
});
