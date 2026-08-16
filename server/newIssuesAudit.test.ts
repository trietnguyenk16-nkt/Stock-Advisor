import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("new GitHub issue acceptance contracts", () => {
  it("keeps Watchlist quote metadata and selected-date comparison wired", () => {
    const api = read("client/src/lib/directApi.ts");
    const home = read("client/src/pages/Home.tsx");
    expect(api).toContain("bid?: number | null");
    expect(api).toContain("ask?: number | null");
    expect(api).toContain("changeBasis?: string");
    expect(api).toContain("comparisons: Array");
    expect(home).toContain("So sánh ngày");
    expect(home).toContain("source");
  });

  it("keeps detailed sync history and AI advice persistence contracts", () => {
    const historyApi = read("api/market/history.ts");
    const analyzeApi = read("api/ai/analyze.ts");
    const schema = read("drizzle/schema.ts");
    expect(historyApi).toContain("syncAssets");
    expect(historyApi).toContain("aiAdviceRuns");
    expect(analyzeApi).toContain("additional_requirement");
    expect(analyzeApi).toContain("requested_ticker");
    expect(schema).toContain("ai_advice_runs");
  });

  it("keeps Vietnamese fund/gold fallback and trusted-news AI safeguards", () => {
    const analyzeApi = read("api/ai/analyze.ts");
    const providers = read("server/vietnamProviders.ts");
    expect(analyzeApi).toContain("PNJ SJC API");
    expect(analyzeApi).toContain("SSI-SCA");
    expect(analyzeApi).toContain("không dùng nguồn không có trong payload");
    expect(providers).toContain("CafeF");
    expect(providers).toContain("PNJ");
  });

  it("keeps configuration-safe notification and email messaging in the dashboard", () => {
    const home = read("client/src/pages/Home.tsx");
    const push = read("api/push/config.ts");
    expect(home).toContain("Email digest");
    expect(home).toContain("18:00");
    expect(push).toContain("enabled");
  });
});
