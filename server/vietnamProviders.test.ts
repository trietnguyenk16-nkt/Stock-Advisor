import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchVietnamQuote, parseVietnamNumber } from "./vietnamProviders";

const asset = { id: 1, workspaceKey: "owner", ticker: "ABC", displayName: "ABC", assetType: "equity" as const, exchange: "HNX", providerCode: "ABC", currency: "VND", unit: "share", isActive: 1, createdAt: new Date(), updatedAt: new Date() };

describe("Vietnam market providers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses Vietnamese numeric formats without fabricating values", () => {
    expect(parseVietnamNumber("41.536,04 đ")).toBe(41536.04);
    expect(parseVietnamNumber("43.400")).toBe(43400);
    expect(parseVietnamNumber("-1,27%")).toBe(-1.27);
    expect(parseVietnamNumber("không có")).toBeUndefined();
  });

  it("returns delayed HNX quote with source metadata", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => "... ABC ... 43.400 ... -100 ... (-0,23%) ..." }));
    const quote = await fetchVietnamQuote(asset);
    expect(quote.sourceName).toBe("HNX");
    expect(quote.freshness).toBe("delayed");
    expect(quote.price).toBe(43400);
    expect(quote.sourceUrl).toContain("hnx.vn");
  });
});

  it("extracts the NAV value after the CafeF date label", async () => {
    const fund = { ...asset, ticker: "DCDS", displayName: "DCDS", assetType: "fund" as const, providerCode: "DCDS" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => '<title>DCDS: Giá NAV (ngày 16-08-2026): 93,969.17 VNĐ</title>' }));
    const quote = await fetchVietnamQuote(fund);
    expect(quote.price).toBe(93969.17);
    expect(quote.sourceName).toBe("CafeF fund data");
    expect(quote.freshness).toBe("eod");
  });

  it("uses the PNJ public API for the default SJC gold quote", async () => {
    const gold = { ...asset, ticker: "SJC", displayName: "Vàng SJC", assetType: "gold" as const, providerCode: "GC=F" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ masp: "SJC", giamua: 14100, giaban: 14400 }] }),
    }));
    const quote = await fetchVietnamQuote(gold);
    expect(quote.price).toBe(14400000);
    expect(quote.bid).toBe(14100000);
    expect(quote.ask).toBe(14400000);
    expect(quote.sourceName).toBe("PNJ SJC API");
    expect(quote.freshness).toBe("live");
  });
