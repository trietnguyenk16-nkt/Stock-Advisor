import { afterEach, describe, expect, it, vi } from "vitest";
import aiConfig from "../api/ai/config";
import aiModel, { classifyPersistenceError } from "../api/ai/model";
import marketQuote from "../api/market/quote";
import marketHistory from "../api/market/history";
import marketSync from "../api/market/sync";
import marketAssets from "../api/market/assets";
import pushConfig from "../api/push/config";

const originalOpenAiKey = process.env.OPENAI_API_KEY;
const originalSupabaseUrl = process.env.SUPABASE_DATABASE_URL;
const originalDatabaseUrl = process.env.DATABASE_URL;
function responseHarness() {
  let body = "";
  const res = { statusCode: 200, headers: new Map<string, string>(), setHeader(key: string, value: string) { this.headers.set(key, value); }, end(value?: string | Uint8Array) { body = typeof value === "string" ? value : value ? new TextDecoder().decode(value) : ""; } };
  return { res, read: () => JSON.parse(body) };
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAiKey;
  if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_DATABASE_URL;
  else process.env.SUPABASE_DATABASE_URL = originalSupabaseUrl;
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

describe("direct Vercel endpoint contracts", () => {
  it("returns OpenAI config without requiring a database connection", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const harness = responseHarness();
    await aiConfig({} as any, harness.res as any);
    expect(harness.res.statusCode).toBe(200);
    const config = harness.read();
    expect(config.enabled).toBe(true);
    expect(["gpt-4o-mini", "gpt-5-mini"]).toContain(config.model);
  });

  it("validates model POST input and returns a JSON error", async () => {
    const harness = responseHarness();
    await aiModel({ body: { model: "invalid" } } as any, harness.res as any);
    expect(harness.res.statusCode).toBe(400);
    expect(harness.read().error).toContain("không được hỗ trợ");
  });

  it("returns structured 503 when model database URL is unavailable", async () => {
    delete process.env.SUPABASE_DATABASE_URL;
    delete process.env.DATABASE_URL;
    const harness = responseHarness();
    await aiModel({ body: { model: "gpt-5-mini" } } as any, harness.res as any);
    expect(harness.res.statusCode).toBe(503);
    expect(harness.read()).toMatchObject({ code: "DATABASE_URL_MISSING", persisted: false, model: "gpt-5-mini" });
  });

  it("classifies model persistence database failures", () => {
    expect(classifyPersistenceError(new Error("permission denied for schema stock_advisor")).code).toBe("SCHEMA_PERMISSION_DENIED");
    expect(classifyPersistenceError(new Error("relation stock_advisor.ai_settings does not exist")).code).toBe("AI_SETTINGS_TABLE_MISSING");
    expect(classifyPersistenceError(new Error("connection refused")).code).toBe("AI_SETTINGS_PERSIST_FAILED");
  });

  it("returns structured error when asset persistence has no database configuration", async () => {
    delete process.env.SUPABASE_DATABASE_URL;
    delete process.env.DATABASE_URL;
    const harness = responseHarness();
    await marketAssets({ method: "POST", body: { ticker: "VNM.VN", displayName: "Vinamilk", assetType: "equity", providerCode: "VNM.VN" } } as any, harness.res as any);
    expect(harness.res.statusCode).toBe(503);
    expect(harness.read()).toMatchObject({ code: "DATABASE_URL_MISSING" });
  });

  it("returns structured JSON when manual sync has no database configuration", async () => {
    delete process.env.SUPABASE_DATABASE_URL;
    delete process.env.DATABASE_URL;
    const harness = responseHarness();
    await marketSync({} as any, harness.res as any);
    expect(harness.res.statusCode).toBe(200);
    expect(harness.read()).toMatchObject({ ok: false, status: "failed", code: "DATABASE_UNAVAILABLE" });
  });

  it("returns structured empty history when database is unavailable", async () => {
    delete process.env.SUPABASE_DATABASE_URL;
    delete process.env.DATABASE_URL;
    const harness = responseHarness();
    await marketHistory({} as any, harness.res as any);
    expect(harness.res.statusCode).toBe(200);
    expect(harness.read()).toMatchObject({ ok: false, code: "DATABASE_URL_MISSING", syncRuns: [], emailDeliveries: [] });
  });

  it("supports a Web Request invocation without a Node response object", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ chart: { result: [{ meta: { shortName: "Vinamilk", currency: "VND", regularMarketPrice: 70000, previousClose: 69000 }, indicators: { quote: [{ close: [69000, 70000] }] } }] } }), { status: 200, headers: { "content-type": "application/json" } })));
    const response = await marketQuote(new Request("https://example.com/api/market/quote?ticker=vnm.vn") as any);
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ticker: "VNM.VN", price: 70000 });
  });

  it("reads a raw Node request body before returning configuration errors", async () => {
    delete process.env.SUPABASE_DATABASE_URL;
    delete process.env.DATABASE_URL;
    const listeners = new Map<string, (...args: any[]) => void>();
    const request = { on(event: string, listener: (...args: any[]) => void) { listeners.set(event, listener); return request; } };
    const harness = responseHarness();
    const promise = aiModel(request as any, harness.res as any);
    listeners.get("data")?.(Buffer.from('{"model":"gpt-5-mini"}'));
    listeners.get("end")?.();
    await promise;
    expect(harness.res.statusCode).toBe(503);
    expect(harness.read()).toMatchObject({ code: "DATABASE_URL_MISSING", model: "gpt-5-mini" });
  });

  it("serves quote GET with the expected normalized response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ chart: { result: [{ meta: { shortName: "Vinamilk", currency: "VND", regularMarketPrice: 70000, previousClose: 69000 }, indicators: { quote: [{ close: [69000, 70000] }] } }] } }), { status: 200, headers: { "content-type": "application/json" } })));
    const harness = responseHarness();
    await marketQuote({ url: "/api/market/quote?ticker=vnm.vn", headers: {} } as any, harness.res as any);
    expect(harness.res.statusCode).toBe(200);
    expect(harness.read()).toMatchObject({ ticker: "VNM.VN", name: "Vinamilk", price: 70000, currency: "VND" });
  });

  it("returns CafeF NAV for an open-ended fund rather than requiring a Yahoo symbol", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<meta content='Giá NAV (ngày 16-08-2026): 93,969.17 VNĐ.'>", { status: 200, headers: { "content-type": "text/html" } })));
    const harness = responseHarness();
    await marketQuote({ url: "/api/market/quote?ticker=DCDS", headers: {} } as any, harness.res as any);
    expect(harness.res.statusCode).toBe(200);
    expect(harness.read()).toMatchObject({ ticker: "DCDS", price: 93969.17, currency: "VND", source: "CafeF NAV" });
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
