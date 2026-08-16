import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyze: vi.fn(),
  getAiModel: vi.fn(),
  createSyncRun: vi.fn(),
  finishSyncRun: vi.fn(),
  getTrackedAssets: vi.fn(),
  insertPriceSnapshot: vi.fn(),
  insertNewsItem: vi.fn(),
  insertAssetAnalysis: vi.fn(),
  getEmailDelivery: vi.fn(),
  recordEmailDelivery: vi.fn(),
  sendPushNotification: vi.fn(),
  fetchVietnamQuote: vi.fn(),
  fetchVietnamNews: vi.fn(),
}));

vi.mock("./openai", () => ({
  analyzeAssetWithOpenAI: mocks.analyze,
  getConfiguredAiModel: (value?: string | null) => value === "gpt-5-mini" ? "gpt-5-mini" : "gpt-4o-mini",
}));
vi.mock("./db", () => ({
  getAiModel: mocks.getAiModel,
  createSyncRun: mocks.createSyncRun,
  finishSyncRun: mocks.finishSyncRun,
  getTrackedAssets: mocks.getTrackedAssets,
  insertPriceSnapshot: mocks.insertPriceSnapshot,
  insertNewsItem: mocks.insertNewsItem,
  insertAssetAnalysis: mocks.insertAssetAnalysis,
  getEmailDelivery: mocks.getEmailDelivery,
  recordEmailDelivery: mocks.recordEmailDelivery,
}));
vi.mock("./vietnamProviders", () => ({ fetchVietnamQuote: mocks.fetchVietnamQuote, fetchVietnamNews: mocks.fetchVietnamNews }));
vi.mock("./push", () => ({ sendPushNotification: mocks.sendPushNotification }));

import { syncMarket } from "./syncMarket";

describe("syncMarket AI model handoff", () => {
  it("passes the persisted ai_settings model into the OpenAI helper", async () => {
    mocks.getAiModel.mockResolvedValue("gpt-5-mini");
    mocks.createSyncRun.mockResolvedValue({ claimed: true });
    mocks.getTrackedAssets.mockResolvedValue([{ id: 7, ticker: "VNM.VN", displayName: "Vinamilk", assetType: "stock" }]);
    mocks.fetchVietnamQuote.mockResolvedValue({ price: 62000, changePercent: 1.2, sourceName: "test", asOf: Date.now() });
    mocks.fetchVietnamNews.mockResolvedValue([]);
    mocks.analyze.mockResolvedValue({ signal: "HOLD", summary: "test", referencePrice: 62000, targetPrice: 63000, risk: "test", confidence: 0.5 });
    mocks.getEmailDelivery.mockResolvedValue(undefined);
    mocks.sendPushNotification.mockResolvedValue(undefined);

    const result = await syncMarket("model-handoff-test");

    expect(mocks.analyze).toHaveBeenCalledWith("gpt-5-mini", expect.objectContaining({ asset: expect.objectContaining({ ticker: "VNM.VN" }) }));
    expect(result.status).toBe("success");
    expect(mocks.finishSyncRun).toHaveBeenCalled();
  }, 15000);
});
