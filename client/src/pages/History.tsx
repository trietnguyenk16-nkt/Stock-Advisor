import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, Clock3, Mail, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { directApi, SYNC_COMPLETE_EVENT } from "@/lib/directApi";

function date(value: Date | number | string | null | undefined) {
  return value ? new Date(value).toLocaleString("vi-VN") : "—";
}

export default function History() {
  const [data, setData] = useState<{ syncRuns: any[]; emailDeliveries: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refetch = useCallback(async () => { setIsLoading(true); try { setData(await directApi.history()); } finally { setIsLoading(false); } }, []);
  useEffect(() => {
    void refetch();
    const onSyncComplete = () => { void refetch(); };
    window.addEventListener(SYNC_COMPLETE_EVENT, onSyncComplete);
    return () => window.removeEventListener(SYNC_COMPLETE_EVENT, onSyncComplete);
  }, [refetch]);
  return <main className="min-h-screen bg-[#f7f8f5] px-4 py-5 text-[#17221e] sm:px-8 sm:py-8"><div className="mx-auto max-w-6xl"><div className="mb-7 flex items-center justify-between gap-4"><div><Link href="/" className="mb-3 inline-flex items-center gap-2 text-xs text-[#678074] hover:text-[#285e47]"><ArrowLeft size={14} />Về dashboard</Link><p className="eyebrow">OPERATIONS</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Lịch sử đồng bộ</h1></div><button onClick={() => refetch()} className="icon-button" aria-label="Tải lại"><RefreshCw size={17} /></button></div><div className="grid gap-5 lg:grid-cols-2"><Card className="dashboard-card"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Clock3 size={17} />Các lần sync gần nhất</CardTitle></CardHeader><CardContent>{isLoading ? <p className="text-sm text-[#829088]">Đang tải lịch sử…</p> : <div className="space-y-3">{data?.syncRuns.length ? data.syncRuns.map((run) => <div key={run.runKey} className="rounded-2xl border border-[#edf1ed] p-4"><div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold">{run.runKey}</span><Badge variant="outline" className="rounded-full">{run.status}</Badge></div><p className="mt-2 text-xs text-[#819087]">Bắt đầu: {date(run.startedAt)} · Kết thúc: {date(run.finishedAt)}</p><p className="mt-1 text-xs text-[#819087]">Tài sản: {run.assetsSucceeded ?? 0}/{run.assetsProcessed ?? 0}</p>{run.errorMessage && <p className="mt-2 text-xs text-[#a15c52]">{run.errorMessage}</p>}</div>) : <p className="text-sm text-[#829088]">Chưa có lần đồng bộ nào.</p>}</div>}</CardContent></Card><Card className="dashboard-card"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Mail size={17} />Email digest gần nhất</CardTitle></CardHeader><CardContent><div className="space-y-3">{data?.emailDeliveries.length ? data.emailDeliveries.map((delivery) => <div key={delivery.runKey} className="rounded-2xl border border-[#edf1ed] p-4"><div className="flex items-center gap-2 text-sm font-semibold">{delivery.status === "sent" ? <CheckCircle2 className="text-[#2d8961]" size={16} /> : <XCircle className="text-[#a15c52]" size={16} />}{delivery.status}<span className="ml-auto text-xs font-normal text-[#819087]">{date(delivery.createdAt)}</span></div><p className="mt-2 truncate text-xs text-[#819087]">{delivery.recipient}</p>{delivery.errorMessage && <p className="mt-1 text-xs text-[#a15c52]">{delivery.errorMessage}</p>}</div>) : <p className="text-sm text-[#829088]">Chưa có email digest nào.</p>}</div></CardContent></Card></div></div></main>;
}
