import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  Crown,
  FileText,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { directApi, type AiConfig, type PortfolioAnalysis, type Quote } from "@/lib/directApi";
import { getAssetStatusLabel } from "@/lib/assetStatus";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import PushNotificationCard from "@/components/PushNotificationCard";
import { toast } from "sonner";


import { filterAssetCatalog, isAssetSelected, type Asset, type AssetKind, type CatalogAsset } from "@/lib/assetCatalog";

const defaultAssets: Asset[] = [
  { ticker: "VNM.VN", name: "Vinamilk", kind: "Cổ phiếu", currency: "VND", providerCode: "VNM.VN" },
  { ticker: "E1VFVN30.VN", name: "DCVFM VN30 ETF", kind: "Chứng chỉ quỹ", currency: "VND", providerCode: "E1VFVN30.VN" },
  { ticker: "SJC", name: "Vàng miếng SJC", kind: "Vàng", currency: "VND", providerCode: "GC=F" },
];

const newsPlaceholders = [
  { label: "TIN TỨC", title: "Các bản tin mới sẽ xuất hiện sau lần đồng bộ dữ liệu đầu tiên", meta: "Nguồn công khai · Đang chờ cập nhật" },
  { label: "PHÂN TÍCH", title: "AI sẽ đối chiếu giá, biến động và tin tức để tạo nhận định có căn cứ", meta: "Không dùng dữ liệu nếu chưa có timestamp" },
];

function formatPrice(asset: Asset) {
  if (asset.price === undefined) return "—";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(asset.price);
}

function formatChange(asset: Asset) {
  if (asset.change === undefined) return "Chưa đồng bộ";
  return `${asset.change >= 0 ? "+" : ""}${asset.change.toFixed(2)}%`;
}

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>(() => {
    try {
      const stored = localStorage.getItem("stock-advisor-assets");
      return stored ? JSON.parse(stored) : defaultAssets;
    } catch {
      return defaultAssets;
    }
  });
  const [ticker, setTicker] = useState("");
  const [kind, setKind] = useState<AssetKind>("Cổ phiếu");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("Chưa có lần đồng bộ");
  const [quoteVersion, setQuoteVersion] = useState(0);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [aiConfigError, setAiConfigError] = useState(false);
  const [isSavingAiModel, setIsSavingAiModel] = useState(false);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [lastAiResult, setLastAiResult] = useState<string | null>(null);
  const [aiAnalyses, setAiAnalyses] = useState<PortfolioAnalysis[]>([]);
  const [selectedAiModel, setSelectedAiModel] = useState<AiConfig["model"]>("gpt-4o-mini");
  const previousAiModel = useRef<AiConfig["model"]>("gpt-4o-mini");
  const assetsPersisted = useRef(false);

  useEffect(() => {
    directApi.aiConfig().then((config) => {
      setAiConfig(config);
      setSelectedAiModel(config.model);
      previousAiModel.current = config.model;
    }).catch(() => setAiConfigError(true));
  }, []);

  const startAiAnalysis = async () => {
    if (!aiConfig?.enabled || isAnalyzingAi) {
      toast.error("OpenAI chưa sẵn sàng", { description: "Hãy cấu hình OPENAI_API_KEY trên Vercel trước khi phân tích." });
      return;
    }
    setIsAnalyzingAi(true);
    setLastAiResult(null);
    try {
      const result = await directApi.analyzeAi(selectedAiModel);
      if (!result.ok && result.analyzed === 0) throw new Error(result.errors?.[0] ?? "Không tạo được phân tích");
      setAiAnalyses(result.results);
      setLastAiResult(`${result.analyzed} tài sản đã phân tích${result.skipped ? ` · ${result.skipped} tài sản chờ dữ liệu` : ""}`);
      toast.success("Đã hoàn tất phân tích AI", { description: `${result.analyzed} tài sản được cập nhật bằng ${result.model}.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể chạy phân tích AI";
      toast.error("Phân tích AI chưa hoàn tất", { description: message });
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const saveAiModel = async (model: AiConfig["model"]) => {
    setSelectedAiModel(model);
    setIsSavingAiModel(true);
    try {
      const result = await directApi.saveAiModel(model);
      if (!result.ok) throw new Error("Không lưu được model vào Supabase");
      previousAiModel.current = result.model;
      toast.success("Đã lưu model AI", { description: `Các lần đồng bộ sau sẽ dùng ${result.model}.` });
    } catch {
      setSelectedAiModel(previousAiModel.current);
      toast.error("Không thể lưu model AI", { description: "Giữ nguyên lựa chọn trước đó và thử lại sau." });
    } finally {
      setIsSavingAiModel(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("stock-advisor-assets", JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    if (assetsPersisted.current) return;
    assetsPersisted.current = true;
    void Promise.all(assets.map((asset) => directApi.addAsset({ ticker: asset.ticker, displayName: asset.name, assetType: asset.kind === "Vàng" ? "gold" : asset.kind === "Chứng chỉ quỹ" ? "fund" : "equity", providerCode: asset.providerCode ?? asset.ticker }))).catch(() => undefined);
  }, [assets]);

  const syncedAssets = useMemo(() => assets.filter((asset) => asset.price !== undefined), [assets]);
  const filteredCatalog = useMemo(() => filterAssetCatalog(kind, catalogSearch).slice(0, 12), [kind, catalogSearch]);

  const addAsset = async (catalogAsset?: CatalogAsset) => {
    const normalized = (catalogAsset?.ticker ?? ticker).trim().toUpperCase();
    const existing = isAssetSelected(normalized, assets.map((asset) => asset.ticker));
    if (!normalized) return;
    if (existing) {
      toast.error("Mã đã được thêm trước đó", { description: `${normalized} đang có trong danh mục; không thể thêm trùng.` });
      return;
    }
    const selected = catalogAsset ?? { ticker: normalized, name: normalized, kind, currency: "VND", providerCode: normalized, description: "Tài sản tùy chỉnh" };
    const nextAsset = { ticker: selected.ticker, name: selected.name, kind: selected.kind, currency: selected.currency, providerCode: selected.providerCode };
    try {
      await directApi.addAsset({ ticker: selected.ticker, displayName: selected.name, assetType: selected.kind === "Vàng" ? "gold" : selected.kind === "Chứng chỉ quỹ" ? "fund" : "equity", providerCode: selected.providerCode });
      setAssets((current) => [...current, nextAsset]);
      setTicker("");
      setCatalogSearch("");
      setIsAdding(false);
      toast.success("Đã lưu tài sản", { description: "Tài sản sẽ được đưa vào lần đồng bộ kế tiếp." });
    } catch (error) {
      toast.error("Không thể lưu tài sản", { description: error instanceof Error ? error.message : "Kiểm tra cấu hình Supabase trên Vercel." });
    }
  };

  const removeAsset = async (tickerToRemove: string) => {
    try {
      await directApi.removeAsset(tickerToRemove);
      setAssets((current) => current.filter((asset) => asset.ticker !== tickerToRemove));
    } catch (error) {
      toast.error("Không thể xóa tài sản", { description: error instanceof Error ? error.message : "Kiểm tra cấu hình Supabase trên Vercel." });
    }
  };

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await directApi.sync();
      if (result.status === "failed") throw new Error(result.message ?? "Manual sync failed");
      setQuoteVersion((value) => value + 1);
      setLastUpdated(new Date().toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }));
      toast.success("Đã đồng bộ dữ liệu", { description: "Giá và trạng thái AI đã được làm mới." });
    } catch (error) {
      toast.error("Đồng bộ chưa thành công", { description: error instanceof Error ? error.message : "Vui lòng kiểm tra cấu hình Vercel và Supabase." });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f8f5] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[#17221e]">
      <div className="mx-auto w-full max-w-[1480px] px-4 py-4 sm:px-6 lg:px-10 lg:py-7">
        <header className="mb-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="brand-mark"><TrendingUp size={19} strokeWidth={2.4} /></div>
            <div>
              <div className="flex items-center gap-2"><span className="text-[15px] font-semibold tracking-[-0.02em]">Lumen</span><Badge className="rounded-full bg-[#e3eee8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b7152] hover:bg-[#e3eee8]">Private desk</Badge></div>
              <p className="mt-0.5 text-[11px] text-[#7c8983]">Theo dõi tài sản với dữ liệu có dấu thời gian</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="icon-button hidden sm:flex" aria-label="Trợ giúp"><CircleHelp size={17} /></button>
            <button className="icon-button hidden sm:flex" aria-label="Thông báo"><Bell size={17} /></button>
            <div className="avatar">TN</div>
          </div>
        </header>

        <section className="hero-panel mb-6 overflow-hidden rounded-[24px] p-6 sm:p-8 lg:p-10">
          <div className="relative z-10 max-w-3xl">
            <p className="eyebrow text-[#93b9a7]">PERSONAL INVESTMENT BRIEF</p>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#f6faf6] sm:text-5xl">Một góc nhìn rõ ràng hơn cho mỗi lần cập nhật.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#b5c8be] sm:text-[15px]">Giá, tin tức và phân tích AI được gom vào cùng một nhịp theo dõi. Bạn luôn biết dữ liệu được cập nhật lúc nào và nhận định dựa trên điều gì.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button onClick={refresh} className="min-h-11 rounded-full bg-[#d8f0df] px-4 text-[#173a2b] hover:bg-white" disabled={isRefreshing}><RefreshCw size={15} className={isRefreshing ? "mr-2 animate-spin" : "mr-2"} />{isRefreshing ? "Đang đồng bộ" : "Đồng bộ ngay"}</Button>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#a7beb1]"><div className="flex items-center gap-2"><Clock3 size={14} />Cron mỗi ngày lúc 18:00</div><Link href="/history" className="inline-flex min-h-11 items-center rounded-full border border-[#709a85] px-3 text-[#d8f0df] hover:bg-[#285844]">Lịch sử sync</Link></div>
            </div>
          </div>
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-grid" />
        </section>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Tài sản theo dõi" value={String(assets.length)} suffix="mã" icon={<Activity size={17} />} />
          <Metric label="Đã có dữ liệu giá" value={String(syncedAssets.length)} suffix={`/ ${assets.length}`} icon={<TrendingUp size={17} />} accent="green" />
          <Metric label="Cập nhật gần nhất" value={lastUpdated} suffix="" icon={<Clock3 size={17} />} compact />
          <Metric label="Email digest" value="Mỗi 2 giờ" suffix="" icon={<Mail size={17} />} accent="gold" compact />
        </div>

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(330px,0.8fr)]">
          <Card className="dashboard-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#e9eeea] px-5 py-5 sm:px-6">
              <div><p className="eyebrow">WATCHLIST</p><CardTitle className="mt-1 text-lg tracking-[-0.03em]">Danh mục quan tâm</CardTitle></div>
              <Button onClick={() => setIsAdding((value) => !value)} variant="outline" className="min-h-11 rounded-full border-[#d8e2db] bg-white text-[#265d47] hover:bg-[#eff7f1]"><Plus size={16} className="mr-1.5" />Thêm mã</Button>
            </CardHeader>
            {isAdding && <div className="border-b border-[#e9eeea] bg-[#fbfcfa] px-5 py-5 sm:px-6"><div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold text-[#244b37]">Chọn tài sản theo danh mục</p><p className="mt-1 text-[11px] text-[#8b9891]">Tìm theo mã hoặc tên. Vàng sẽ mặc định là SJC.</p></div><Button onClick={() => setIsAdding(false)} variant="ghost" className="h-9 min-w-9 rounded-xl"><X size={16} /></Button></div><div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#edf5ef] p-1"><button onClick={() => { setKind("Cổ phiếu"); setCatalogSearch(""); }} className={kind === "Cổ phiếu" ? "bg-white text-[#245a42] shadow-sm" : "text-[#779080]"}>Cổ phiếu</button><button onClick={() => { setKind("Chứng chỉ quỹ"); setCatalogSearch(""); }} className={kind === "Chứng chỉ quỹ" ? "bg-white text-[#245a42] shadow-sm" : "text-[#779080]"}>Quỹ</button><button onClick={() => { setKind("Vàng"); setCatalogSearch(""); }} className={kind === "Vàng" ? "bg-white text-[#245a42] shadow-sm" : "text-[#779080]"}>Vàng</button></div><div className="relative mt-3"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a59a]" /><Input value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder={kind === "Vàng" ? "SJC" : "Tìm mã hoặc tên tài sản"} className="h-11 rounded-xl border-[#dce5df] bg-white pl-9" autoFocus /></div><div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1">{filteredCatalog.map((item) => { const alreadyAdded = isAssetSelected(item.ticker, assets.map((asset) => asset.ticker)); return <button key={item.ticker} onClick={() => void addAsset(item)} className={alreadyAdded ? "flex items-center justify-between rounded-2xl border border-[#dce8df] bg-[#f5f8f5] px-3 py-3 text-left" : "flex items-center justify-between rounded-2xl border border-[#e1ebe3] bg-white px-3 py-3 text-left hover:border-[#9fc6aa] hover:bg-[#f6fbf7]"}><span className="min-w-0"><span className="block text-sm font-semibold text-[#2b4637]">{item.name}</span><span className="mt-0.5 block text-[11px] text-[#89988e]">{item.ticker} · {item.description}{item.source ? ` · ${item.source}` : ""}</span></span><span className={alreadyAdded ? "ml-3 shrink-0 text-[11px] font-semibold text-[#8b9a90]" : "ml-3 shrink-0 text-[11px] font-semibold text-[#2a8057]"}>{alreadyAdded ? "Đã thêm" : "Thêm"}</span></button>; })}{filteredCatalog.length === 0 && <p className="rounded-2xl bg-white px-4 py-6 text-center text-xs text-[#8a988f]">Không tìm thấy tài sản phù hợp.</p>}</div><div className="mt-3 border-t border-[#e9eeea] pt-3"><p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[#9aa69f]">Hoặc nhập ticker tùy chỉnh</p><div className="flex gap-2"><Input value={ticker} onChange={(event) => setTicker(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void addAsset()} placeholder="Ví dụ VNM.VN" className="h-10 rounded-xl border-[#dce5df] bg-white" /><Button onClick={() => void addAsset()} className="h-10 rounded-xl bg-[#173c2b] px-4 hover:bg-[#24543e]">Thêm</Button></div></div></div>}
            <CardContent className="p-0">
              <div className="hidden grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_28px] gap-4 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9aa69f] sm:grid"><span>Tài sản</span><span>Giá hiện tại</span><span>Biến động</span><span>Trạng thái</span><span /></div>
              <div className="divide-y divide-[#edf1ed]">
                {assets.map((asset) => <AssetRow key={asset.ticker} asset={asset} refreshKey={quoteVersion} onQuote={(ticker, quote) => setAssets((current) => current.map((item) => item.ticker === ticker ? { ...item, name: quote.name, currency: quote.currency || item.currency, price: quote.price, change: quote.change } : item))} onRemove={removeAsset} />)}
                {assets.length === 0 && <div className="px-6 py-14 text-center"><Search className="mx-auto mb-3 text-[#a7b6ad]" size={22} /><p className="text-sm font-medium">Watchlist đang trống</p><p className="mt-1 text-xs text-[#8b9891]">Thêm ticker đầu tiên để bắt đầu theo dõi.</p></div>}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="dashboard-card">
              <CardHeader className="px-5 pb-3 pt-5"><div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><p className="eyebrow">AI LENS</p><span className="rounded-full bg-[#e8f5ec] px-2 py-1 text-[9px] font-bold tracking-[0.12em] text-[#2b7653]">{aiConfig?.enabled ? "READY" : "SETUP"}</span></div><CardTitle className="mt-1 text-lg tracking-[-0.03em]">Phân tích đầu tư</CardTitle></div><div className="ai-icon"><Sparkles size={16} /></div></div></CardHeader>
              <CardContent className="px-5 pb-5"><div className="mb-4 rounded-2xl border border-[#e4ece6] bg-[#fbfdfb] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-[#2b7152]">Model phân tích</p><p className="mt-1 text-[11px] text-[#89968e]">Lựa chọn được lưu cho các lần đồng bộ sau.</p></div><select aria-label="Chọn model AI" value={selectedAiModel} disabled={!aiConfig?.enabled || isSavingAiModel} onChange={(event) => { const model = event.target.value as AiConfig["model"]; void saveAiModel(model); }} className="h-10 rounded-xl border border-[#dce5df] bg-white px-3 text-xs font-medium text-[#315542] outline-none focus:ring-2 focus:ring-[#b9d8c5]"><option value="gpt-4o-mini">gpt-4o-mini</option><option value="gpt-5-mini">gpt-5-mini</option></select></div><p className="mt-2 text-[10px] text-[#9aa59e]">{aiConfigError ? "Không gọi được API cấu hình OpenAI" : !aiConfig ? "Đang kiểm tra cấu hình…" : aiConfig.enabled ? "OpenAI đã sẵn sàng" : "Chưa cấu hình OPENAI_API_KEY trên Vercel"}</p></div><div className="rounded-2xl bg-[#f4f8f4] p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-[#2b7152]">{aiConfig?.enabled ? "Sẵn sàng phân tích" : "Cần cấu hình OpenAI"}</span><span className="text-[10px] uppercase tracking-[0.14em] text-[#94a29a]">AI / {assets.length} assets</span></div><button type="button" onClick={() => void startAiAnalysis()} disabled={isAnalyzingAi || !aiConfig?.enabled} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1d4734] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#28624a] disabled:cursor-not-allowed disabled:opacity-50"><Sparkles size={14} />{isAnalyzingAi ? "Đang phân tích…" : "Bắt đầu phân tích AI"}</button>{lastAiResult && <p className="mb-3 text-[11px] font-medium text-[#2b7653]">{lastAiResult}</p>}{aiAnalyses.length > 0 && <div className="mb-4 divide-y divide-[#dbe8de] overflow-hidden rounded-2xl border border-[#dbe8de] bg-white">{aiAnalyses.map((analysis) => <article key={analysis.ticker} className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold text-[#244b37]">{analysis.name || analysis.ticker}</p><p className="text-[10px] uppercase tracking-[0.12em] text-[#8b9a90]">{analysis.ticker} · Độ tin cậy {Math.round(analysis.confidence * 100)}%</p></div><span className={analysis.signal === "BUY" ? "rounded-full bg-[#e4f5e9] px-2.5 py-1 text-[10px] font-bold text-[#23714b]" : analysis.signal === "SELL" ? "rounded-full bg-[#fff0ee] px-2.5 py-1 text-[10px] font-bold text-[#a34f47]" : "rounded-full bg-[#f3f4e9] px-2.5 py-1 text-[10px] font-bold text-[#7c7948]"}>{analysis.signal === "BUY" ? "NÊN MUA" : analysis.signal === "SELL" ? "NÊN BÁN" : "NÊN GIỮ"}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#65736b]"><span>Giá tham chiếu <strong className="text-[#315542]">{analysis.referencePrice.toLocaleString("vi-VN")}</strong></span><span>Giá mục tiêu <strong className="text-[#315542]">{analysis.targetPrice.toLocaleString("vi-VN")}</strong></span></div><p className="mt-3 text-xs leading-5 text-[#52645a]">{analysis.summary}</p><p className="mt-2 text-[11px] leading-5 text-[#8a6652]">Rủi ro: {analysis.risk}</p>{analysis.news.length > 0 && <p className="mt-2 text-[10px] text-[#8b9a90]">Nguồn tin: {analysis.news.map((item) => item.publisher).filter(Boolean).join(", ")}</p>}</article>)}</div>}<p className="text-sm leading-6 text-[#65736b]">Sau khi đồng bộ có timestamp, Lumen sẽ đưa ra tín hiệu <strong className="font-semibold text-[#31473a]">mua / bán / giữ</strong>, giá tham khảo và rủi ro cho từng tài sản trong danh mục.</p><div className="mt-4 flex items-center gap-2 text-[11px] text-[#8b9891]"><FileText size={13} />Không kết luận khi thiếu dữ liệu có nguồn</div></div><p className="mt-3 text-[11px] leading-5 text-[#9aa59e]">Phân tích AI chỉ mang tính tham khảo, không phải tư vấn đầu tư được cấp phép.</p></CardContent>
            </Card>
            <PushNotificationCard />
            <Card className="dashboard-card">
              <CardHeader className="px-5 pb-3 pt-5"><div className="flex items-center justify-between"><div><p className="eyebrow">INSIGHTS FEED</p><CardTitle className="mt-1 text-lg tracking-[-0.03em]">Tin & tín hiệu</CardTitle></div><button className="text-[#789187] transition hover:text-[#285e47]" aria-label="Mở rộng"><ChevronRight size={18} /></button></div></CardHeader>
              <CardContent className="space-y-3 px-5 pb-5">{newsPlaceholders.map((item) => <div key={item.label} className="rounded-2xl border border-[#edf1ed] p-3.5"><div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-[0.16em] text-[#789187]">{item.label}</span><ArrowUpRight size={14} className="text-[#a7b6ad]" /></div><p className="mt-2 text-sm font-medium leading-5 text-[#34443a]">{item.title}</p><p className="mt-2 text-[10px] text-[#9aa59e]">{item.meta}</p></div>)}</CardContent>
            </Card>
          </div>
        </section>

        <footer className="mt-7 flex flex-col justify-between gap-3 border-t border-[#e3eae4] py-5 text-[11px] text-[#89968e] sm:flex-row sm:items-center"><span>© 2026 Lumen Personal Desk · Dữ liệu thị trường cần được xác minh trước khi ra quyết định.</span><div className="flex items-center gap-4"><span className="flex items-center gap-1.5"><Settings2 size={13} />Cài đặt digest</span><span className="flex items-center gap-1.5"><Command size={13} />⌘ K</span></div></footer>
      </div>
    </main>
  );
}

function Metric({ label, value, suffix, icon, accent = "default", compact = false }: { label: string; value: string; suffix: string; icon: React.ReactNode; accent?: string; compact?: boolean }) {
  return <div className="metric-card"><div className={`metric-icon ${accent}`}><span>{icon}</span></div><div className="min-w-0"><p className="text-[11px] font-medium text-[#84928a]">{label}</p><div className={`mt-1 flex items-baseline gap-1.5 ${compact ? "text-base" : "text-xl"} font-semibold tracking-[-0.04em] text-[#20352a]`}><span className="truncate">{value}</span><span className="text-[11px] font-medium tracking-normal text-[#a0aaa4]">{suffix}</span></div></div></div>;
}

function AssetRow({ asset, onRemove, refreshKey, onQuote }: { asset: Asset; onRemove: (ticker: string) => void; refreshKey: number; onQuote: (ticker: string, quote: Quote) => void }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(true);
  const [quoteError, setQuoteError] = useState(false);
  useEffect(() => {
    let active = true;
    setIsLoadingQuote(true);
    setQuoteError(false);
    directApi.quote(asset.ticker).then((value) => { if (active) { setQuote(value); onQuote(asset.ticker, value); } }).catch(() => { if (active) setQuoteError(true); }).finally(() => { if (active) setIsLoadingQuote(false); });
    return () => { active = false; };
  }, [asset.ticker, refreshKey]);
  const liveAsset: Asset = quote ? { ...asset, name: quote.name, currency: quote.currency || asset.currency, price: quote.price, change: quote.change } : asset;
  const hasChange = liveAsset.change !== undefined;
  return <div className="asset-row relative grid gap-3 px-5 py-4 pr-14 sm:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_28px] sm:items-center sm:gap-4 sm:px-6"><div className="flex min-w-0 items-center gap-3"><div className={`ticker-badge ${liveAsset.kind === "Vàng" ? "gold" : liveAsset.kind === "Chứng chỉ quỹ" ? "fund" : "stock"}`}>{liveAsset.ticker.replace(".VN", "").replace("=F", "").slice(0, 4)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#2c3e32]">{liveAsset.name}</p><p className="mt-0.5 truncate text-[11px] text-[#95a199]">{liveAsset.ticker} · {liveAsset.kind}</p></div></div><div className="flex items-center justify-between sm:block"><span className="text-[10px] uppercase tracking-[0.12em] text-[#a0aaa4] sm:hidden">Giá</span><p className="text-sm font-semibold text-[#304439]">{isLoadingQuote ? "Đang tải" : formatPrice(liveAsset)} <span className="text-[10px] font-medium text-[#9da8a1]">{liveAsset.currency}</span></p></div><div className="flex items-center justify-between sm:block"><span className="text-[10px] uppercase tracking-[0.12em] text-[#a0aaa4] sm:hidden">Biến động</span><p className={`flex items-center gap-1 text-sm font-semibold ${hasChange && liveAsset.change! >= 0 ? "text-[#2d8961]" : hasChange ? "text-[#c45e54]" : "text-[#909d95]"}`}>{hasChange && (liveAsset.change! >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />)}{formatChange(liveAsset)}</p></div><div className="flex items-center justify-between sm:block"><span className="text-[10px] uppercase tracking-[0.12em] text-[#a0aaa4] sm:hidden">Trạng thái</span><Badge variant="outline" className="rounded-full border-[#dce8df] bg-[#f6faf7] text-[10px] font-medium text-[#65806f]">{getAssetStatusLabel({ isLoading: isLoadingQuote, hasError: quoteError, hasChange })}</Badge></div><button onClick={() => onRemove(asset.ticker)} className="absolute right-4 top-4 grid min-h-11 min-w-11 place-items-center rounded-full text-[#b2bdb6] transition hover:bg-[#f3f7f3] hover:text-[#bd5e54] sm:static sm:min-h-0 sm:min-w-0" aria-label={`Xóa ${asset.ticker}`}><Trash2 size={15} /></button></div>;
}
