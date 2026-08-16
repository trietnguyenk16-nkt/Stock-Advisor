import { describe, expect, it, vi } from "vitest";
import handler, { buildAnalysisMessages, buildAssetsFromQuotes, fetchNews, PORTFOLIO_AI_SYSTEM_PROMPT, readBody } from "../api/ai/analyze";

describe("portfolio AI analysis contract", () => {
  it("defines a cautious prompt with signals, prices, reasoning and risk rules", () => {
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("chọn BUY");
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("SELL");
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("chọn HOLD");
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("giá mục tiêu");
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("bản tin kinh tế uy tín");
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("bản tin kinh tế uy tín");
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("không dùng nguồn không có trong payload");
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("HOLD");
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("không phải tư vấn đầu tư");
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("Không được chọn HOLD theo mặc định");
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("vùng vào lệnh");
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("mức cắt lỗ");
  });
});

describe("AI quote eligibility regression", () => {
  it("builds all four analyzable assets from valid Watchlist quotes", () => {
    const assets = buildAssetsFromQuotes([
      { ticker: "VNM.VN", name: "Vinamilk", price: 65000, source: "Yahoo Finance" },
      { ticker: "FPT.VN", name: "FPT", price: 120000, source: "Yahoo Finance" },
      { ticker: "DCDS", name: "DCDS", price: 15000, source: "CafeF" },
      { ticker: "SJC", name: "SJC", price: 88000000, source: "PNJ SJC API" },
    ]);
    expect(assets).toHaveLength(4);
    expect(assets.map((asset) => asset.ticker)).toEqual(["VNM.VN", "FPT.VN", "DCDS", "SJC"]);
  });

  it("propagates the user requirement with explicit priority to every AI analysis", () => {
    const messages = buildAnalysisMessages({ ticker: "VNM.VN" }, { price: 65000, asOf: Date.now(), sourceName: "Yahoo Finance" }, [], "Chỉ phân tích điểm mua ngắn hạn, không tư vấn dài hạn");
    expect(messages[0].content).toContain("Chỉ phân tích điểm mua ngắn hạn, không tư vấn dài hạn");
    expect(messages[0].content).toContain("Bắt buộc ưu tiên");
    expect(JSON.parse(messages[1].content).userRequirement).toBe("Chỉ phân tích điểm mua ngắn hạn, không tư vấn dài hạn");
  });

  it("combines CafeF and Yahoo Finance news with source metadata", async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input); calls.push(url);
      if (url.includes("cafef.vn")) return new Response('<a href="/tin/vnm-news">Vinamilk công bố kết quả kinh doanh quý mới nhất</a>', { status: 200 });
      return new Response(JSON.stringify({ news: [{ title: "VNM market update", publisher: "Reuters", link: "https://reuters.com/vnm", providerPublishTime: 1700000000 }] }), { status: 200 });
    }) as typeof fetch;
    try {
      const news = await fetchNews("VNM.VN Vinamilk");
      expect(calls.some((url) => url.includes("cafef.vn"))).toBe(true);
      expect(calls.some((url) => url.includes("yahoo.com"))).toBe(true);
      expect(news).toEqual(expect.arrayContaining([expect.objectContaining({ publisher: "CafeF", sourceType: "VietnamNews" }), expect.objectContaining({ publisher: "Reuters", sourceType: "YahooFinance" })]));
      expect(news.every((item) => item.link && item.fetchedAt)).toBe(true);
    } finally { globalThis.fetch = originalFetch; }
  });

  it("reads JSON request bodies when Vercel supplies the body as a string", async () => {
    const body = await readBody({ body: JSON.stringify({ quotes: [{ ticker: "VNM.VN", price: 65000 }] }) } as never);
    expect(body).toEqual({ quotes: [{ ticker: "VNM.VN", price: 65000 }] });
  });

  it("does not treat zero or missing prices as analyzable", () => {
    expect(buildAssetsFromQuotes([{ ticker: "VNM.VN", price: 0 }, { ticker: "FPT.VN" }, { ticker: "VCB.VN", price: 100000 }])).toHaveLength(1);
  });
});

describe("direct AI analyze endpoint", () => {
  it("returns a structured 503 when database configuration is missing", async () => {
    const previousDb = process.env.SUPABASE_DATABASE_URL;
    const previousOpenAi = process.env.OPENAI_API_KEY;
    delete process.env.SUPABASE_DATABASE_URL;
    delete process.env.DATABASE_URL;
    process.env.OPENAI_API_KEY = "test-key";
    const response = { statusCode: 0, body: null as any, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return body; } };
    await handler({ method: "POST", body: {} }, response);
    expect(response.statusCode).toBe(503);
    expect(response.body.code).toBe("DATABASE_URL_MISSING");
    if (previousDb) process.env.SUPABASE_DATABASE_URL = previousDb;
    if (previousOpenAi) process.env.OPENAI_API_KEY = previousOpenAi;
    else delete process.env.OPENAI_API_KEY;
    vi.restoreAllMocks();
  });
});
