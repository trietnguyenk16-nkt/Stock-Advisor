import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AI result reset contract", () => {
  it("clears the previous result before quote refresh and analysis request", () => {
    const source = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    const resetIndex = source.indexOf("setAiAnalyses([]);");
    const quoteRefreshIndex = source.indexOf("Promise.allSettled(assets.map((asset) => directApi.quote", resetIndex);
    const analyzeIndex = source.indexOf("directApi.analyzeAi", resetIndex);
    expect(resetIndex).toBeGreaterThan(0);
    expect(quoteRefreshIndex).toBeGreaterThan(resetIndex);
    expect(analyzeIndex).toBeGreaterThan(resetIndex);
  });
});

export {};
