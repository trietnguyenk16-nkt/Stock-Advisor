import { afterEach, describe, expect, it, vi } from "vitest";
import aiConfig from "../api/ai/config";
import aiModel from "../api/ai/model";
import marketQuote from "../api/market/quote";
import marketHistory from "../api/market/history";
import marketSync from "../api/market/sync";
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

  it("returns structured 503 when model persistence is unavailable", async () => {
    const harness = responseHarness();
    const dbModule = await import("../server/db");
    vi.spyOn(dbModule, "setAiModel").mockResolvedValue(undefined);
    await aiModel({ body: { model: "gpt-5-mini" } } as any, harness.res as any);
    expect(harness.res.statusCode).toBe(503);
    expect(harness.read()).toMatchObject({ code: "DATABASE_UNAVAILABLE", persisted: false, model: "gpt-5-mini" });
  });

  it("returns structured error when manual sync rejects", async () => {
    const harness = responseHarness();
    const syncModule = await import("../server/syncMarket");
    vi.spyOn(syncModule, "syncMarket").mockRejectedValue(new Error("database unavailable"));
    await marketSync({} as any, harness.res as any);
    expect(harness.res.statusCode).toBe(500);
    expect(harness.read()).toEqual({ error: "database unavailable" });
  });

  it("supports a Web Request invocation without a Node response object", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ chart: { result: [{ meta: { shortName: "Vinamilk", currency: "VND", regularMarketPrice: 70000, previousClose: 69000 }, indicators: { quote: [{ close: [69000, 70000] }] } }] } }), { status: 200, headers: { "content-type": "application/json" } })));
    const response = await marketQuote(new Request("https://example.com/api/market/quote?ticker=vnm.vn") as any);
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ticker: "VNM.VN", price: 70000 });
  });

  it("reads a raw Node request body for model persistence", async () => {
    const listeners = new Map<string, (...args: any[]) => void>();
    const request = { on(event: string, listener: (...args: any[]) => void) { listeners.set(event, listener); return request; } };
    const harness = responseHarness();
    const dbModule = await import("../server/db");
    vi.spyOn(dbModule, "setAiModel").mockResolvedValue({ id: 1, workspaceKey: "owner", model: "gpt-5-mini", updatedAt: new Date() } as any);
    const promise = aiModel(request as any, harness.res as any);
    listeners.get("data")?.(Buffer.from('{"model":"gpt-5-mini"}'));
    listeners.get("end")?.();
    await promise;
    expect(harness.res.statusCode).toBe(200);
    expect(harness.read()).toMatchObject({ ok: true, model: "gpt-5-mini", persisted: true });
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
