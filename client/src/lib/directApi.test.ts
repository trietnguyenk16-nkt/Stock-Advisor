import { describe, expect, it } from "vitest";
import { normalizeAiAnalysisResponse } from "./directApi";

describe("direct API response normalization", () => {
  it("falls back to result count and selected model when production omits fields", () => {
    const normalized = normalizeAiAnalysisResponse({ results: [{ ticker: "VNM.VN" } as never] }, "gpt-4o-mini", 3);
    expect(normalized.analyzed).toBe(1);
    expect(normalized.skipped).toBe(2);
    expect(normalized.model).toBe("gpt-4o-mini");
  });

  it("preserves explicit counts and model from the endpoint", () => {
    const normalized = normalizeAiAnalysisResponse({ analyzed: 2, skipped: 1, model: "gpt-5-mini", results: [] }, "gpt-4o-mini", 3);
    expect(normalized).toEqual({ analyzed: 2, skipped: 1, model: "gpt-5-mini", results: [] });
  });
});
