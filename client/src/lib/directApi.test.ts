import { describe, expect, it } from "vitest";
import { normalizeAiAnalysisResponse, subscribeToSyncComplete, SYNC_COMPLETE_EVENT } from "./directApi";

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

describe("manual sync history refresh event", () => {
  it("notifies History subscribers and removes the listener on cleanup", () => {
    const listeners = new Map<string, () => void>();
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = {
      addEventListener: (name: string, callback: () => void) => listeners.set(name, callback),
      removeEventListener: (name: string) => listeners.delete(name),
    };
    try {
      let calls = 0;
      const unsubscribe = subscribeToSyncComplete(() => { calls += 1; });
      listeners.get(SYNC_COMPLETE_EVENT)?.();
      expect(calls).toBe(1);
      unsubscribe();
      expect(listeners.has(SYNC_COMPLETE_EVENT)).toBe(false);
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });
});
