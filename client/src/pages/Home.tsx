import { useEffect, useMemo, useState } from "react";
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
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";


type AssetKind = "Cổ phiếu" | "Chứng chỉ quỹ" | "Vàng";
type Asset = { ticker: string; name: string; kind: AssetKind; currency: string; price?: number; change?: number };

const defaultAssets: Asset[] = [
  { ticker: "VNM.VN", name: "Vinamilk", kind: "Cổ phiếu", currency: "VND" },
  { ticker: "E1VFVN30.VN", name: "DCVFM VN30 ETF", kind: "Chứng chỉ quỹ", currency: "VND" },
  { ticker: "GC=F", name: "Gold Futures", kind: "Vàng", currency: "USD" },
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
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("Chưa có lần đồng bộ");

  useEffect(() => {
    localStorage.setItem("stock-advisor-assets", JSON.stringify(assets));
  }, [assets]);

  const syncedAssets = useMemo(() => assets.filter((asset) => asset.price !== undefined), [assets]);

  const addAsset = () => {
    const normalized = ticker.trim().toUpperCase();
    if (!normalized || assets.some((asset) => asset.ticker === normalized)) return;
    setAssets((current) => [...current, { ticker: normalized, name: normalized, kind, currency: kind === "Vàng" ? "USD" : "VND" }]);
    setTicker("");
    setIsAdding(false);
  };

  const removeAsset = (tickerToRemove: string) => setAssets((current) => current.filter((asset) => asset.ticker !== tickerToRemove));

  const refresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 650));
    setLastUpdated(new Date().toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }));
    setIsRefreshing(false);
  };

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17221e]">
      <div className="mx-auto max-w-[1480px] px-4 py-4 sm:px-6 lg:px-10 lg:py-7">
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
              <Button onClick={refresh} className="rounded-full bg-[#d8f0df] px-4 text-[#173a2b] hover:bg-white" disabled={isRefreshing}><RefreshCw size={15} className={isRefreshing ? "mr-2 animate-spin" : "mr-2"} />{isRefreshing ? "Đang đồng bộ" : "Đồng bộ ngay"}</Button>
              <div className="flex items-center gap-2 text-xs text-[#a7beb1]"><Clock3 size={14} />Tự động mỗi 2 giờ</div>
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
              <Button onClick={() => setIsAdding((value) => !value)} variant="outline" className="rounded-full border-[#d8e2db] bg-white text-[#265d47] hover:bg-[#eff7f1]"><Plus size={16} className="mr-1.5" />Thêm mã</Button>
            </CardHeader>
            {isAdding && <div className="border-b border-[#e9eeea] bg-[#fbfcfa] px-5 py-4 sm:px-6"><div className="flex flex-col gap-2 sm:flex-row"><Input value={ticker} onChange={(event) => setTicker(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addAsset()} placeholder="Nhập ticker, ví dụ VNM.VN" className="h-10 rounded-xl border-[#dce5df] bg-white" autoFocus /><select value={kind} onChange={(event) => setKind(event.target.value as AssetKind)} className="h-10 rounded-xl border border-[#dce5df] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#b9d8c5]"><option>Cổ phiếu</option><option>Chứng chỉ quỹ</option><option>Vàng</option></select><Button onClick={addAsset} className="h-10 rounded-xl bg-[#173c2b] hover:bg-[#24543e]">Lưu mã</Button><Button onClick={() => setIsAdding(false)} variant="ghost" className="h-10 rounded-xl"><X size={16} /></Button></div><p className="mt-2 text-[11px] text-[#8b9891]">Ticker cần khớp với nguồn dữ liệu thị trường tương ứng. Hệ thống sẽ chỉ hiển thị giá sau khi đồng bộ thành công.</p></div>}
            <CardContent className="p-0">
              <div className="hidden grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_28px] gap-4 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9aa69f] sm:grid"><span>Tài sản</span><span>Giá hiện tại</span><span>Biến động</span><span>Trạng thái</span><span /></div>
              <div className="divide-y divide-[#edf1ed]">
                {assets.map((asset) => <AssetRow key={asset.ticker} asset={asset} onRemove={removeAsset} />)}
                {assets.length === 0 && <div className="px-6 py-14 text-center"><Search className="mx-auto mb-3 text-[#a7b6ad]" size={22} /><p className="text-sm font-medium">Watchlist đang trống</p><p className="mt-1 text-xs text-[#8b9891]">Thêm ticker đầu tiên để bắt đầu theo dõi.</p></div>}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="dashboard-card">
              <CardHeader className="px-5 pb-3 pt-5"><div className="flex items-center justify-between"><div><p className="eyebrow">AI LENS</p><CardTitle className="mt-1 text-lg tracking-[-0.03em]">Nhận định tổng hợp</CardTitle></div><div className="ai-icon"><Sparkles size={16} /></div></div></CardHeader>
              <CardContent className="px-5 pb-5"><div className="rounded-2xl bg-[#f4f8f4] p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-[#2b7152]">Đang chờ dữ liệu</span><span className="text-[10px] uppercase tracking-[0.14em] text-[#94a29a]">AI / 0 assets</span></div><p className="text-sm leading-6 text-[#65736b]">Sau lần đồng bộ đầu tiên, Lumen sẽ đưa ra tín hiệu <strong className="font-semibold text-[#31473a]">mua / bán / giữ</strong>, mức giá tham khảo và các rủi ro cần theo dõi.</p><div className="mt-4 flex items-center gap-2 text-[11px] text-[#8b9891]"><FileText size={13} />Không kết luận khi thiếu dữ liệu có nguồn</div></div><p className="mt-3 text-[11px] leading-5 text-[#9aa59e]">Phân tích AI chỉ mang tính tham khảo, không phải tư vấn đầu tư được cấp phép.</p></CardContent>
            </Card>
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

function AssetRow({ asset, onRemove }: { asset: Asset; onRemove: (ticker: string) => void }) {
  const quote = trpc.market.quote.useQuery({ ticker: asset.ticker }, { retry: false, staleTime: 1000 * 60 * 10 });
  const liveAsset: Asset = quote.data ? { ...asset, name: quote.data.name, currency: quote.data.currency || asset.currency, price: quote.data.price, change: quote.data.change } : asset;
  const hasChange = liveAsset.change !== undefined;
  return <div className="asset-row grid gap-3 px-5 py-4 sm:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_28px] sm:items-center sm:gap-4 sm:px-6"><div className="flex min-w-0 items-center gap-3"><div className={`ticker-badge ${liveAsset.kind === "Vàng" ? "gold" : liveAsset.kind === "Chứng chỉ quỹ" ? "fund" : "stock"}`}>{liveAsset.ticker.replace(".VN", "").replace("=F", "").slice(0, 4)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#2c3e32]">{liveAsset.name}</p><p className="mt-0.5 truncate text-[11px] text-[#95a199]">{liveAsset.ticker} · {liveAsset.kind}</p></div></div><div className="flex items-center justify-between sm:block"><span className="text-[10px] uppercase tracking-[0.12em] text-[#a0aaa4] sm:hidden">Giá</span><p className="text-sm font-semibold text-[#304439]">{quote.isLoading ? "Đang tải" : formatPrice(liveAsset)} <span className="text-[10px] font-medium text-[#9da8a1]">{liveAsset.currency}</span></p></div><div className="flex items-center justify-between sm:block"><span className="text-[10px] uppercase tracking-[0.12em] text-[#a0aaa4] sm:hidden">Biến động</span><p className={`flex items-center gap-1 text-sm font-semibold ${hasChange && liveAsset.change! >= 0 ? "text-[#2d8961]" : hasChange ? "text-[#c45e54]" : "text-[#909d95]"}`}>{hasChange && (liveAsset.change! >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />)}{formatChange(liveAsset)}</p></div><div className="flex items-center justify-between sm:block"><span className="text-[10px] uppercase tracking-[0.12em] text-[#a0aaa4] sm:hidden">Trạng thái</span><Badge variant="outline" className="rounded-full border-[#dce8df] bg-[#f6faf7] text-[10px] font-medium text-[#65806f]">{quote.isLoading ? "Đang tải" : quote.isError ? "Không có dữ liệu" : hasChange ? "Đã cập nhật" : "Chờ đồng bộ"}</Badge></div><button onClick={() => onRemove(asset.ticker)} className="absolute right-5 top-4 text-[#b2bdb6] transition hover:text-[#bd5e54] sm:static" aria-label={`Xóa ${asset.ticker}`}><Trash2 size={15} /></button></div>;
}
