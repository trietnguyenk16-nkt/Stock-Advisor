import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("History populated data contract", () => {
  const historySource = readFileSync(new URL("../client/src/pages/History.tsx", import.meta.url), "utf8");
  const endpointSource = readFileSync(new URL("../api/market/history.ts", import.meta.url), "utf8");

  it("defaults to Vietnam today and requests an explicit date", () => {
    expect(historySource).toContain('useState(() => vietnamToday())');
    expect(historySource).toContain('directApi.history(historyDate)');
    expect(endpointSource).toContain("started_at BETWEEN $1 AND $2");
  });

  it("sorts sync and AI history newest first and surfaces database errors", () => {
    expect(historySource).toContain('sort((a: any, b: any) => Number(b.startedAt ?? 0) - Number(a.startedAt ?? 0))');
    expect(historySource).toContain("Không đọc được lịch sử từ database.");
    expect(endpointSource).toContain('ORDER BY started_at DESC');
  });

  it("reads both persisted run collections from the stock_advisor schema", () => {
    expect(endpointSource).toContain("FROM stock_advisor.sync_runs");
    expect(endpointSource).toContain("FROM stock_advisor.ai_advice_runs");
    expect(endpointSource).toContain('response_json AS "responseJson"');
  });

  it("returns persisted summary/detail fields and exposes a closeable detail panel", () => {
    expect(endpointSource).toContain('summary_title AS "summaryTitle"');
    expect(endpointSource).toContain('detail_text AS "detailText"');
    expect(endpointSource).toContain('details_json AS "detailsJson"');
    expect(historySource).toContain('openSyncDetail');
    expect(historySource).toContain('openAiDetail');
    expect(historySource).toContain('Đóng');
  });
});
