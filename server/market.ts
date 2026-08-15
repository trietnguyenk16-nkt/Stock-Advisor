import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { publicProcedure, router } from "./_core/trpc";
import { getDashboardData } from "./db";

const tickerInput = z.object({ ticker: z.string().min(1).max(32) });

async function getYahoo<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "LumenPersonalDesk/1.0" } });
  if (!response.ok) throw new Error(`Market data request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export const marketRouter = router({
  dashboard: publicProcedure.query(() => getDashboardData("owner")),
  quote: publicProcedure.input(tickerInput).query(async ({ input }) => {
    const ticker = input.ticker.trim().toUpperCase();
    const payload = await getYahoo<any>(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=5d&interval=1d`);
    const result = payload.chart?.result?.[0];
    if (!result) throw new Error(`Không tìm thấy dữ liệu cho ${ticker}`);
    const meta = result.meta ?? {};
    const closes = (result.indicators?.quote?.[0]?.close ?? []).filter((value: unknown): value is number => typeof value === "number");
    const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : closes.at(-1);
    const previous = typeof meta.previousClose === "number" ? meta.previousClose : closes.at(-2);
    const change = price !== undefined && previous ? ((price - previous) / previous) * 100 : undefined;
    return { ticker, name: meta.longName ?? meta.shortName ?? ticker, currency: meta.currency ?? "", price, change, asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(), source: "Yahoo Finance public chart endpoint" };
  }),
  news: publicProcedure.input(tickerInput).query(async ({ input }) => {
    const ticker = input.ticker.trim().toUpperCase();
    const payload = await getYahoo<any>(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&newsCount=6&quotesCount=0`);
    return (payload.news ?? []).slice(0, 6).map((item: any) => ({ title: item.title, publisher: item.publisher, link: item.link, publishedAt: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : null, thumbnail: item.thumbnail?.resolutions?.[0]?.url ?? null }));
  }),
  analyze: publicProcedure.input(z.object({ ticker: z.string(), price: z.number().optional(), change: z.number().optional(), news: z.array(z.object({ title: z.string(), publisher: z.string().optional() })).default([]) })).mutation(async ({ input }) => {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Bạn là một trợ lý phân tích thị trường thận trọng. Chỉ đưa ra nhận định tham khảo dựa trên dữ liệu được cung cấp, không khẳng định chắc chắn. Luôn trả về JSON hợp lệ." },
        { role: "user", content: JSON.stringify({ task: "Phân tích tài sản và đề xuất BUY, SELL hoặc HOLD kèm mức giá tham khảo cụ thể. Nếu thiếu cơ sở, trả về HOLD và nêu rõ thiếu dữ liệu.", asset: input }) },
      ],
      response_format: { type: "json_schema", json_schema: { name: "asset_analysis", strict: true, schema: { type: "object", properties: { signal: { type: "string", enum: ["BUY", "SELL", "HOLD"] }, summary: { type: "string" }, referencePrice: { type: "number" }, targetPrice: { type: "number" }, risk: { type: "string" }, confidence: { type: "number" } }, required: ["signal", "summary", "referencePrice", "targetPrice", "risk", "confidence"], additionalProperties: false } } },
    });
    const content = response.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("AI không trả về kết quả hợp lệ");
    return JSON.parse(content);
  }),
});
