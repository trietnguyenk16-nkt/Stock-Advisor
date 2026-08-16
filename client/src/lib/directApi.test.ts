import { describe, expect, it } from "vitest";
import { directApi, normalizeAiAnalysisResponse, subscribeToSyncComplete, SYNC_COMPLETE_EVENT } from "./directApi";

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

describe("AI current quote request contract", () => {
  it("includes valid Watchlist quotes in the analysis request", async () => {
    const originalFetch = globalThis.fetch;
    let requestBody: Record<string, unknown> | undefined;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ ok: true, analyzed: 1, skipped: 0, results: [] }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    try {
      await directApi.analyzeAi("gpt-5-mini", "đầu tư dài hạn", [{ ticker: "VNM.VN", name: "Vinamilk", currency: "VND", price: 65000, change: null, asOf: new Date().toISOString(), source: "Yahoo Finance" }]);
      expect(requestBody).toMatchObject({ model: "gpt-5-mini", requirement: "đầu tư dài hạn", quotes: [{ ticker: "VNM.VN", price: 65000, source: "Yahoo Finance" }] });
    } finally {
      globalThis.fetch = originalFetch;
    }
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
