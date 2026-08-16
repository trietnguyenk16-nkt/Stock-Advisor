import { describe, expect, it, vi } from "vitest";
import handler, { PORTFOLIO_AI_SYSTEM_PROMPT } from "../api/ai/analyze";

describe("portfolio AI analysis contract", () => {
  it("defines a cautious prompt with signals, prices, reasoning and risk rules", () => {
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("BUY, SELL hoặc HOLD");
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("giá mục tiêu");
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("tin tức");
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("HOLD");
    expect(PORTFOLIO_AI_SYSTEM_PROMPT).toContain("không phải tư vấn đầu tư");
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
