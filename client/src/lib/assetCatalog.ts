export type AssetKind = "Cổ phiếu" | "Chứng chỉ quỹ" | "Vàng";

export type Asset = { ticker: string; name: string; kind: AssetKind; currency: string; providerCode?: string; price?: number | null; bid?: number | null; ask?: number | null; change?: number | null; source?: string; sourceUrl?: string; changeBasis?: string };
export type CatalogAsset = { ticker: string; name: string; kind: AssetKind; providerCode: string; currency: string; description: string; source?: string };

/**
 * Curated Vietnamese market picker. Equity symbols are common VN-Index/HOSE constituents;
 * fund symbols are listed Vietnamese ETFs. The quote provider remains the source of live price.
 */
export const assetCatalog: CatalogAsset[] = [
  ["VNM", "Vinamilk", "Thực phẩm"], ["FPT", "FPT Corporation", "Công nghệ"], ["VCB", "Vietcombank", "Ngân hàng"], ["BID", "BIDV", "Ngân hàng"], ["CTG", "VietinBank", "Ngân hàng"], ["MBB", "MB Bank", "Ngân hàng"], ["TCB", "Techcombank", "Ngân hàng"], ["ACB", "ACB", "Ngân hàng"], ["VPB", "VPBank", "Ngân hàng"], ["HDB", "HDBank", "Ngân hàng"], ["VIC", "Vingroup", "Bất động sản"], ["VHM", "Vinhomes", "Bất động sản"], ["VRE", "Vincom Retail", "Bất động sản"], ["HPG", "Hòa Phát", "Thép"], ["GAS", "PV Gas", "Năng lượng"], ["PLX", "Petrolimex", "Năng lượng"], ["SAB", "Sabeco", "Đồ uống"], ["MSN", "Masan Group", "Tiêu dùng"], ["MWG", "Thế Giới Di Động", "Bán lẻ"], ["SSI", "SSI Securities", "Chứng khoán"], ["VND", "VNDirect", "Chứng khoán"], ["VCI", "Vietcap", "Chứng khoán"], ["HCM", "Hồ Chí Minh Securities", "Chứng khoán"], ["GVR", "Cao su Việt Nam", "Vật liệu"], ["DGC", "Hóa chất Đức Giang", "Hóa chất"], ["POW", "PV Power", "Năng lượng"], ["VJC", "Vietjet Air", "Hàng không"], ["BVH", "Bảo Việt", "Bảo hiểm"], ["REE", "Cơ điện lạnh", "Hạ tầng"], ["VPI", "Văn Phú Invest", "Bất động sản"],
].map(([ticker, name, sector]) => ({ ticker: `${ticker}.VN`, name, kind: "Cổ phiếu" as const, providerCode: `${ticker}.VN`, currency: "VND", description: `${sector} · VN-Index` }));

export const fundCatalog: CatalogAsset[] = [
  ["E1VFVN30", "DCVFM VN30 ETF", "ETF VN30", "ETF niêm yết · Fmarket"], ["FUEVFVND", "DCVFM VN Diamond ETF", "ETF VN Diamond", "ETF niêm yết · Fmarket"], ["FUESSVFL", "SSIAM VNFIN Lead ETF", "ETF tài chính", "ETF niêm yết · Fmarket"], ["FUEMAV30", "Mirae Asset VN30 ETF", "ETF VN30", "ETF niêm yết · Fmarket"], ["FUEKIVFS", "KIM Growth VN30 ETF", "ETF VN30", "ETF niêm yết · Fmarket"], ["FUEBFVND", "BVFVN Diamond ETF", "ETF VN Diamond", "ETF niêm yết · Fmarket"], ["DCDS", "Quỹ đầu tư chứng khoán năng động DC", "Quỹ cổ phiếu", "Quỹ mở · Fmarket"], ["VCBF-BCF", "Quỹ đầu tư cổ phiếu hàng đầu VCBF", "Quỹ cổ phiếu", "Quỹ mở · Fmarket/VCBF"], ["VCBF-MGF", "Quỹ đầu tư cổ phiếu tăng trưởng VCBF", "Quỹ cổ phiếu", "Quỹ mở · Fmarket/VCBF"], ["VCBF-AIF", "Quỹ đầu tư thu nhập chủ động VCBF", "Quỹ cân bằng", "Quỹ mở · Fmarket/VCBF"], ["VCBF-TBF", "Quỹ đầu tư cân bằng chiến lược VCBF", "Quỹ cân bằng", "Quỹ mở · Fmarket/VCBF"], ["VCBF-FIF", "Quỹ đầu tư trái phiếu VCBF", "Quỹ trái phiếu", "Quỹ mở · Fmarket/VCBF"], ["SSISCA", "Quỹ cổ phiếu chiến lược SSI", "Quỹ cổ phiếu", "Quỹ mở · Fmarket"], ["VESAF", "Quỹ đầu tư cổ phiếu Hưng Thịnh VinaWealth", "Quỹ cổ phiếu", "Quỹ mở · Fmarket"], ["VEOF", "Quỹ đầu tư cổ phiếu năng động Eastspring", "Quỹ cổ phiếu", "Quỹ mở · Fmarket"], ["MAGEF", "Quỹ đầu tư giá trị Mirae Asset", "Quỹ cổ phiếu", "Quỹ mở · Fmarket"], ["BVFED", "Quỹ đầu tư cổ phiếu năng động Bảo Việt", "Quỹ cổ phiếu", "Quỹ mở · Fmarket"], ["BVPF", "Quỹ đầu tư trái phiếu Bảo Việt", "Quỹ trái phiếu", "Quỹ mở · Fmarket"], ["DCAF", "Quỹ đầu tư trái phiếu DC", "Quỹ trái phiếu", "Quỹ mở · Fmarket"], ["TCGF", "Quỹ đầu tư cổ phiếu tăng trưởng Techcom", "Quỹ cổ phiếu", "Quỹ mở · Fmarket"], ["KDEF", "Quỹ đầu tư cổ phiếu KIM", "Quỹ cổ phiếu", "Quỹ mở · Fmarket"], ["RVPIF", "Quỹ đầu tư cổ phiếu Rồng Việt", "Quỹ cổ phiếu", "Quỹ mở · Fmarket"], ["NTPPF", "Quỹ đầu tư cổ phiếu triển vọng", "Quỹ cổ phiếu", "Quỹ mở · Fmarket"], ["GDEGF", "Quỹ đầu tư tăng trưởng dài hạn", "Quỹ cổ phiếu", "Quỹ mở · Fmarket"], ["DCDE", "Quỹ đầu tư cổ phiếu Diamond", "Quỹ cổ phiếu", "Quỹ mở · Fmarket"], ["AEIF", "Quỹ đầu tư cổ phiếu tiếp cận châu Á", "Quỹ cổ phiếu", "Quỹ mở · Fmarket"], ["LPLF", "Quỹ đầu tư cổ phiếu triển vọng", "Quỹ cổ phiếu", "Quỹ mở · Fmarket"], ["ABEF", "Quỹ đầu tư cân bằng", "Quỹ cân bằng", "Quỹ mở · Fmarket"],
].map(([ticker, name, description, source]) => ({ ticker, name, kind: "Chứng chỉ quỹ" as const, providerCode: ticker, currency: "VND", description, source }));

export const assetCatalogWithGold: CatalogAsset[] = [
  ...assetCatalog,
  ...fundCatalog,
  { ticker: "SJC", name: "Vàng miếng SJC", kind: "Vàng", providerCode: "GC=F", currency: "VND", description: "Vàng trong nước · mặc định", source: "SJC" },
];

export function filterAssetCatalog(kind: AssetKind, query: string) {
  const needle = query.trim().toLowerCase();
  return assetCatalogWithGold.filter((item) => item.kind === kind && `${item.ticker} ${item.name} ${item.description}`.toLowerCase().includes(needle));
}

export function isAssetSelected(ticker: string, selectedTickers: string[]) {
  return selectedTickers.some((selected) => selected.toUpperCase() === ticker.toUpperCase());
}
