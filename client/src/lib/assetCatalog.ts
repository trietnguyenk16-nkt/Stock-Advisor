export type AssetKind = "Cổ phiếu" | "Chứng chỉ quỹ" | "Vàng";

export type Asset = { ticker: string; name: string; kind: AssetKind; currency: string; providerCode?: string; price?: number; change?: number };
export type CatalogAsset = { ticker: string; name: string; kind: AssetKind; providerCode: string; currency: string; description: string };

/**
 * Curated Vietnamese market picker. Equity symbols are common VN-Index/HOSE constituents;
 * fund symbols are listed Vietnamese ETFs. The quote provider remains the source of live price.
 */
export const assetCatalog: CatalogAsset[] = [
  ["VNM", "Vinamilk", "Thực phẩm"], ["FPT", "FPT Corporation", "Công nghệ"], ["VCB", "Vietcombank", "Ngân hàng"], ["BID", "BIDV", "Ngân hàng"], ["CTG", "VietinBank", "Ngân hàng"], ["MBB", "MB Bank", "Ngân hàng"], ["TCB", "Techcombank", "Ngân hàng"], ["ACB", "ACB", "Ngân hàng"], ["VPB", "VPBank", "Ngân hàng"], ["HDB", "HDBank", "Ngân hàng"], ["VIC", "Vingroup", "Bất động sản"], ["VHM", "Vinhomes", "Bất động sản"], ["VRE", "Vincom Retail", "Bất động sản"], ["HPG", "Hòa Phát", "Thép"], ["GAS", "PV Gas", "Năng lượng"], ["PLX", "Petrolimex", "Năng lượng"], ["SAB", "Sabeco", "Đồ uống"], ["MSN", "Masan Group", "Tiêu dùng"], ["MWG", "Thế Giới Di Động", "Bán lẻ"], ["SSI", "SSI Securities", "Chứng khoán"], ["VND", "VNDirect", "Chứng khoán"], ["VCI", "Vietcap", "Chứng khoán"], ["HCM", "Hồ Chí Minh Securities", "Chứng khoán"], ["GVR", "Cao su Việt Nam", "Vật liệu"], ["DGC", "Hóa chất Đức Giang", "Hóa chất"], ["POW", "PV Power", "Năng lượng"], ["VJC", "Vietjet Air", "Hàng không"], ["BVH", "Bảo Việt", "Bảo hiểm"], ["REE", "Cơ điện lạnh", "Hạ tầng"], ["VPI", "Văn Phú Invest", "Bất động sản"],
].map(([ticker, name, sector]) => ({ ticker: `${ticker}.VN`, name, kind: "Cổ phiếu" as const, providerCode: `${ticker}.VN`, currency: "VND", description: `${sector} · VN-Index` }));

export const fundCatalog: CatalogAsset[] = [
  ["E1VFVN30", "DCVFM VN30 ETF", "ETF VN30"], ["FUEVFVND", "DCVFM VN Diamond ETF", "ETF VN Diamond"], ["FUESSVFL", "SSIAM VNFIN Lead ETF", "ETF tài chính"], ["FUEMAV30", "Mirae Asset VN30 ETF", "ETF VN30"], ["FUEKIVFS", "KIM Growth VN30 ETF", "ETF VN30"], ["FUEBFVND", "BVFVN Diamond ETF", "ETF VN Diamond"], ["FUESSV50", "SSIAM VNX50 ETF", "ETF VNX50"], ["FUEIP100", "IPAAM VN100 ETF", "ETF VN100"],
].map(([ticker, name, description]) => ({ ticker: `${ticker}.VN`, name, kind: "Chứng chỉ quỹ" as const, providerCode: `${ticker}.VN`, currency: "VND", description }));

export const assetCatalogWithGold: CatalogAsset[] = [
  ...assetCatalog,
  ...fundCatalog,
  { ticker: "SJC", name: "Vàng miếng SJC", kind: "Vàng", providerCode: "GC=F", currency: "VND", description: "Vàng trong nước · mặc định" },
];

export function filterAssetCatalog(kind: AssetKind, query: string) {
  const needle = query.trim().toLowerCase();
  return assetCatalogWithGold.filter((item) => item.kind === kind && `${item.ticker} ${item.name} ${item.description}`.toLowerCase().includes(needle));
}

export function isAssetSelected(ticker: string, selectedTickers: string[]) {
  return selectedTickers.some((selected) => selected.toUpperCase() === ticker.toUpperCase());
}
