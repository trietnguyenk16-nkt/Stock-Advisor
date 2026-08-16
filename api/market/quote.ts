import { sendJson, requestUrl, type ApiRequest, type ApiResponse } from "../_lib/node";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const ticker = requestUrl(req).searchParams.get("ticker")?.trim().toUpperCase() ?? "";
  if (!ticker) return sendJson(res, { error: "Ticker is required" }, 400);
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=5d&interval=1d`, { headers: { accept: "application/json", "user-agent": "LumenPersonalDesk/1.0" } });
    if (!response.ok) throw new Error(`Market data request failed: ${response.status}`);
    const payload = await response.json() as any;
    const result = payload.chart?.result?.[0];
    if (!result) throw new Error(`Không tìm thấy dữ liệu cho ${ticker}`);
    const meta = result.meta ?? {};
    const closes = (result.indicators?.quote?.[0]?.close ?? []).filter((value: unknown): value is number => typeof value === "number");
    const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : closes.at(-1);
    const previous = typeof meta.previousClose === "number" ? meta.previousClose : closes.at(-2);
    const change = price !== undefined && previous ? ((price - previous) / previous) * 100 : undefined;
    return sendJson(res, { ticker, name: meta.longName ?? meta.shortName ?? ticker, currency: meta.currency ?? "", price, change, asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(), source: "Yahoo Finance public chart endpoint" });
  } catch (error) {
    return sendJson(res, { error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
}
