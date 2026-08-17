import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Mail, RefreshCw, X, XCircle } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { directApi, subscribeToSyncComplete, type MarketHistory } from "@/lib/directApi";
import { formatNumber, formatPercent } from "@/lib/formatters";

type SelectedDetail = { kind: "sync" | "ai"; run: any; text: string } | null;

function formatDate(value: Date | number | string | null | undefined) {
  return value ? new Date(value).toLocaleString("vi-VN") : "—";
}

function vietnamToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function aiSummary(run: any) {
  if (run.summaryTitle) return run.summaryTitle;
  const results = Array.isArray(run.responseJson?.results) ? run.responseJson.results : [];
  const summaries = results.map((item: any) => item.summary).filter(Boolean).slice(0, 2);
  return summaries.length ? summaries.join(" · ") : run.errorMessage || "Chưa có summary cho lần chạy này.";
}

function aiDetail(run: any) {
  if (run.detailText) return String(run.detailText);
  const results = Array.isArray(run.responseJson?.results) ? run.responseJson.results : [];
  return results.map((item: any) => [
    `${item.ticker || item.name || "Tài sản"}: ${item.signal || "—"}`,
    `Tóm tắt: ${item.summary || "—"}`,
    `Giá tham chiếu: ${item.referencePrice ?? "—"} · Giá mục tiêu: ${item.targetPrice ?? "—"}`,
    `Rủi ro: ${item.risk || "—"}`,
    `Chiến lược: ${item.strategy || "—"}`,
  ].join("\n")).join("\n\n") || run.errorMessage || "Chưa có nội dung chi tiết cho lần phân tích này.";
}

function syncDetail(run: any, runAssets: any[]) {
  if (run.detailText) return String(run.detailText);
  const stored = Array.isArray(run.detailsJson) ? run.detailsJson : [];
  const details = stored.length ? stored : runAssets;
  return details.map((item: any) => {
    const price = item.price == null ? "—" : formatNumber(Number(item.price));
    const previous = item.previousPrice == null ? "—" : formatNumber(Number(item.previousPrice));
    const bidAsk = item.bid == null && item.ask == null ? "" : ` · Mua/Bán: ${formatNumber(Number(item.bid))}/${formatNumber(Number(item.ask))}`;
    return `${item.ticker || "—"} (${item.assetType || item.displayName || "Tài sản"}): ${item.status || "—"} · Giá: ${previous} → ${price}${bidAsk} · Biến động: ${formatPercent(item.changePercent == null ? null : Number(item.changePercent))} · Nguồn: ${item.sourceName || "—"}${item.message ? ` · Lỗi: ${item.message}` : ""}`;
  }).join("\n") || run.errorMessage || "Chưa có nội dung chi tiết cho lần đồng bộ này.";
}

export default function History() {
  const [data, setData] = useState<MarketHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [historyDate, setHistoryDate] = useState(() => vietnamToday());
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try { setData(await directApi.history(historyDate)); } finally { setIsLoading(false); }
  }, [historyDate]);

  useEffect(() => {
    void refetch();
    return subscribeToSyncComplete(() => { void refetch(); });
  }, [refetch]);

  const syncRuns = useMemo(() => [...(data?.syncRuns ?? [])].sort((a: any, b: any) => Number(b.startedAt ?? 0) - Number(a.startedAt ?? 0)), [data?.syncRuns]);
  const syncAssets = data?.syncAssets ?? [];
  const aiRuns = useMemo(() => [...(data?.aiAdviceRuns ?? [])].sort((a: any, b: any) => Number(b.startedAt ?? 0) - Number(a.startedAt ?? 0)), [data?.aiAdviceRuns]);
  const emailDeliveries = useMemo(() => [...(data?.emailDeliveries ?? [])].sort((a: any, b: any) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0)), [data?.emailDeliveries]);
  const assetsByRun = useMemo(() => Object.groupBy(syncAssets, (item: any) => item.runKey), [syncAssets]);

  const openSyncDetail = (run: any) => setSelectedDetail({ kind: "sync", run, text: syncDetail(run, assetsByRun[run.runKey] ?? []) });
  const openAiDetail = (run: any) => setSelectedDetail({ kind: "ai", run, text: aiDetail(run) });

  return <main className="min-h-screen bg-[#f7f8f5] px-4 py-5 text-[#17221e] sm:px-8 sm:py-8">
    <div className="mx-auto max-w-7xl">
      <header className="mb-7 flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="mb-3 inline-flex items-center gap-2 text-xs text-[#678074] hover:text-[#285e47]"><ArrowLeft size={14} />Về dashboard</Link>
          <p className="eyebrow">OPERATIONS</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Lịch sử đồng bộ & tư vấn AI</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#718078]">
            <label className="flex items-center gap-2">Ngày xem lịch sử<input type="date" value={historyDate} onChange={(event) => { setHistoryDate(event.target.value); setSelectedDetail(null); }} className="rounded-lg border border-[#dfe8e0] bg-white px-2 py-1.5" /></label>
            <span className="rounded-full bg-[#edf5ee] px-3 py-1.5 font-semibold text-[#3f6b50]">{syncRuns.length} lần sync · {aiRuns.length} lần AI</span>
            {historyDate !== vietnamToday() && <button type="button" onClick={() => setHistoryDate(vietnamToday())} className="text-[#2b7653] hover:underline">Về hôm nay</button>}
          </div>
        </div>
        <button type="button" onClick={() => void refetch()} className="icon-button" aria-label="Tải lại"><RefreshCw size={17} /></button>
      </header>

      {selectedDetail && <Card className="mb-5 border-[#b9dac5] bg-[#fcfffc] shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">{selectedDetail.kind === "sync" ? selectedDetail.run.summaryTitle || "Chi tiết lần đồng bộ" : selectedDetail.run.summaryTitle || "Chi tiết lần phân tích AI"}</CardTitle>
          <button type="button" onClick={() => setSelectedDetail(null)} className="inline-flex items-center gap-1 rounded-lg border border-[#d7e6db] px-3 py-1.5 text-xs font-semibold text-[#2b7653] hover:bg-[#edf6ef]"><X size={14} />Đóng</button>
        </CardHeader>
        <CardContent><p className="mb-3 text-xs text-[#718078]">{formatDate(selectedDetail.run.startedAt)} · {selectedDetail.kind === "sync" ? selectedDetail.run.status : `${selectedDetail.run.model} · ${selectedDetail.run.status}`}</p><pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f4f8f4] p-4 font-sans text-sm leading-6 text-[#34493b]">{selectedDetail.text}</pre></CardContent>
      </Card>}

      {data?.ok === false ? <Card className="border-[#f0d9d2] bg-[#fff8f6]"><CardContent className="p-5 text-sm text-[#a15c52]"><b>Không đọc được lịch sử từ database.</b><p className="mt-1">{(data as any).message || "Kiểm tra SUPABASE_DATABASE_URL và schema stock_advisor trên Vercel."}</p></CardContent></Card> : <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="dashboard-card">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Clock3 size={17} />Các lần sync <span className="ml-auto rounded-full bg-[#edf5ee] px-2.5 py-1 text-xs font-semibold text-[#3f6b50]">{syncRuns.length} lần</span></CardTitle></CardHeader>
          <CardContent>{isLoading ? <p className="text-sm text-[#829088]">Đang tải lịch sử…</p> : <div className="space-y-3">{syncRuns.length ? syncRuns.map((run: any) => <button type="button" key={run.runKey} onClick={() => openSyncDetail(run)} className="w-full rounded-2xl border border-[#edf1ed] p-4 text-left transition hover:border-[#b9dac5] hover:bg-[#fcfffc]"><div className="flex flex-wrap items-center justify-between gap-3"><b className="text-sm">{run.summaryTitle || `Đồng bộ: ${run.assetsSucceeded ?? 0}/${run.assetsProcessed ?? 0} tài sản`}</b><Badge variant="outline" className="rounded-full">{run.status}</Badge></div><p className="mt-2 text-xs text-[#819087]">{formatDate(run.startedAt)} · Tài sản: {run.assetsSucceeded ?? 0}/{run.assetsProcessed ?? 0} · Bấm để xem chi tiết</p></button>) : <p className="text-sm text-[#829088]">Không có lần đồng bộ nào trong ngày đã chọn.</p>}</div>}</CardContent>
        </Card>
        <div className="space-y-5">
          <Card className="dashboard-card">
            <CardHeader><CardTitle className="text-lg">Phân tích bởi AI <span className="ml-2 text-sm font-normal text-[#718078]">({aiRuns.length})</span></CardTitle></CardHeader>
            <CardContent>{isLoading ? <p className="text-sm text-[#829088]">Đang tải lịch sử…</p> : <div className="space-y-3">{aiRuns.length ? aiRuns.map((run: any) => <button type="button" key={run.runKey} onClick={() => openAiDetail(run)} className="w-full rounded-2xl border border-[#edf1ed] p-4 text-left transition hover:border-[#b9dac5] hover:bg-[#fcfffc]"><div className="flex items-center justify-between gap-2"><b className="text-sm">{aiSummary(run)}</b><Badge variant="outline" className="shrink-0 rounded-full">{run.status}</Badge></div><p className="mt-2 text-[11px] text-[#819087]">{formatDate(run.startedAt)} · {run.model} · {run.assetsAnalyzed}/{run.assetsRequested} mã · Bấm để xem chi tiết</p></button>) : <p className="text-sm text-[#829088]">Không có phân tích AI nào trong ngày đã chọn.</p>}</div>}</CardContent>
          </Card>
          <Card className="dashboard-card">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Mail size={17} />Email digest gần nhất</CardTitle></CardHeader>
            <CardContent><div className="space-y-3">{emailDeliveries.length ? emailDeliveries.map((delivery: any) => <div key={delivery.runKey} className="rounded-2xl border border-[#edf1ed] p-4"><div className="flex items-center gap-2 text-sm font-semibold">{delivery.status === "sent" ? <CheckCircle2 className="text-[#2d8961]" size={16} /> : <XCircle className="text-[#a15c52]" size={16} />}{delivery.status}<span className="ml-auto text-xs font-normal text-[#819087]">{formatDate(delivery.createdAt)}</span></div><p className="mt-2 truncate text-xs text-[#819087]">{delivery.recipient}</p></div>) : <p className="text-sm text-[#829088]">Không có email digest nào trong ngày đã chọn.</p>}</div></CardContent>
          </Card>
        </div>
      </div>}
    </div>
  </main>;
}
