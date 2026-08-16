import { ArrowDownRight, ArrowUpRight, FileText, ShieldAlert, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatConfidence, formatNumber } from "@/lib/formatters";
import type { PortfolioAnalysis } from "@/lib/directApi";

function signalLabel(signal: PortfolioAnalysis["signal"]) {
  return signal === "BUY" ? "NÊN MUA" : signal === "SELL" ? "NÊN BÁN" : "NÊN GIỮ";
}

function signalClass(signal: PortfolioAnalysis["signal"]) {
  return signal === "BUY" ? "bg-[#e4f5e9] text-[#23714b]" : signal === "SELL" ? "bg-[#fff0ee] text-[#a34f47]" : "bg-[#f3f4e9] text-[#7c7948]";
}

export default function AiResultsPanel({ analyses }: { analyses: PortfolioAnalysis[] }) {
  if (analyses.length === 0) return null;
  return (
    <Card className="dashboard-card border-[#cfe2d3] bg-[#fbfefb]">
      <CardHeader className="border-b border-[#e5eee6] px-5 pb-4 pt-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-[#5d9072]">AI RESULTS</p>
            <CardTitle className="mt-1 text-lg tracking-[-0.03em]">Kết quả phân tích cho người dùng</CardTitle>
            <p className="mt-1 text-xs leading-5 text-[#718177]">Mỗi mã được tách riêng để bạn dễ đọc tín hiệu, mức giá tham khảo và rủi ro.</p>
          </div>
          <span className="rounded-full bg-[#e8f5ec] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#2b7653]">{analyses.length} mã</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-5 py-4 sm:px-6">
        {analyses.map((analysis) => (
          <article key={analysis.ticker} className="rounded-2xl border border-[#e1ece3] bg-white p-4 shadow-[0_5px_18px_rgba(35,73,51,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#244b37]">{analysis.name || analysis.ticker}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.13em] text-[#8b9a90]">{analysis.ticker}</p>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${signalClass(analysis.signal)}`}>
                {analysis.signal === "BUY" ? <ArrowUpRight size={13} /> : analysis.signal === "SELL" ? <ArrowDownRight size={13} /> : <Target size={13} />}
                {signalLabel(analysis.signal)}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl bg-[#f5f9f5] p-2.5"><p className="text-[10px] text-[#8b9a90]">Giá tham chiếu</p><p className="mt-1 text-xs font-bold text-[#315542]">{formatNumber(analysis.referencePrice)}</p></div>
              <div className="rounded-xl bg-[#f5f9f5] p-2.5"><p className="text-[10px] text-[#8b9a90]">Giá mục tiêu</p><p className="mt-1 text-xs font-bold text-[#315542]">{formatNumber(analysis.targetPrice)}</p></div>
              <div className="rounded-xl bg-[#f5f9f5] p-2.5"><p className="text-[10px] text-[#8b9a90]">Độ tin cậy</p><p className="mt-1 text-xs font-bold text-[#315542]">{formatConfidence(analysis.confidence)}</p></div>
              <div className="rounded-xl bg-[#f5f9f5] p-2.5"><p className="text-[10px] text-[#8b9a90]">Nguồn tin</p><p className="mt-1 truncate text-xs font-bold text-[#315542]">{analysis.news?.length ? `${analysis.news.length} nguồn` : "Không có"}</p></div>
            </div>
            <div className="mt-4 space-y-2 text-xs leading-5 text-[#52645a]">
              <p><strong className="text-[#315542]">Nhận định:</strong> {analysis.summary}</p>
              <p className="flex gap-1.5 text-[#8a6652]"><ShieldAlert size={14} className="mt-0.5 shrink-0" /><span><strong>Rủi ro:</strong> {analysis.risk}</span></p>
            </div>
            {analysis.news?.length > 0 && <div className="mt-3 border-t border-[#edf2ed] pt-3"><p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7b9182]"><FileText size={13} />Nguồn tham khảo</p><div className="mt-2 flex flex-wrap gap-1.5">{analysis.news.map((item) => item.publisher).filter(Boolean).slice(0, 5).map((publisher) => <span key={publisher} className="rounded-full bg-[#f1f6f1] px-2 py-1 text-[10px] text-[#557263]">{publisher}</span>)}</div></div>}
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
