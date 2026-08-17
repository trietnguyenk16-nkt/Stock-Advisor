import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const syncSource = readFileSync(new URL("../api/market/sync.ts", import.meta.url), "utf8");
const aiSource = readFileSync(new URL("../api/ai/analyze.ts", import.meta.url), "utf8");
const historySource = readFileSync(new URL("../api/market/history.ts", import.meta.url), "utf8");
const historyUi = readFileSync(new URL("../client/src/pages/History.tsx", import.meta.url), "utf8");

describe("run summary and detail persistence", () => {
  it("stores real per-asset sync prices, bid/ask, source and failures in the run record", () => {
    expect(syncSource).toContain("const details: Array<Record<string, unknown>> = []");
    expect(syncSource).toContain("details.push({ ticker: asset.ticker");
    expect(syncSource).toContain("summary_title=$7, detail_text=$8, details_json=$9::jsonb");
  });

  it("stores AI run summary title and readable full analysis detail", () => {
    expect(aiSource).toContain("const summaryTitle = results.length");
    expect(aiSource).toContain("const detailText = results.map");
    expect(aiSource).toContain("summary_title, detail_text, response_json");
  });

  it("returns persisted fields and opens a closeable text detail panel", () => {
    expect(historySource).toContain('summary_title AS "summaryTitle"');
    expect(historySource).toContain('detail_text AS "detailText"');
    expect(historyUi).toContain('setSelectedDetail({ kind: "sync"');
    expect(historyUi).toContain('setSelectedDetail({ kind: "ai"');
    expect(historyUi).toContain("setSelectedDetail(null)");
    expect(historyUi).toContain("Đóng");
  });
});
