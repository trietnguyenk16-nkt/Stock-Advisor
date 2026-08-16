import { describe, expect, it } from "vitest";
import { filterAssetCatalog, isAssetSelected } from "../client/src/lib/assetCatalog";

describe("asset catalog picker", () => {
  it("filters stocks and funds by type and search text", () => {
    expect(filterAssetCatalog("Cổ phiếu", "FPT").map((item) => item.ticker)).toContain("FPT.VN");
    expect(filterAssetCatalog("Chứng chỉ quỹ", "diamond").map((item) => item.ticker)).toContain("FUEVFVND");
    expect(filterAssetCatalog("Cổ phiếu", "diamond")).toHaveLength(0);
  });

  it("offers SJC as the default gold choice", () => {
    const gold = filterAssetCatalog("Vàng", "SJC");
    expect(gold).toHaveLength(1);
    expect(gold[0]).toMatchObject({ ticker: "SJC", providerCode: "GC=F" });
  });

  it("recognizes duplicate selections case-insensitively", () => {
    expect(isAssetSelected("fpt.vn", ["FPT.VN"])).toBe(true);
    expect(isAssetSelected("VCB.VN", ["FPT.VN"])).toBe(false);
  });
});
