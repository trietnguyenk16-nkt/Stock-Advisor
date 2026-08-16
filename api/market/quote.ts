type AnyRequest = { url?: string; query?: Record<string, string | string[] | undefined> };
type AnyResponse = { statusCode?: number; setHeader?: (name: string, value: string) => void; status?: (code: number) => AnyResponse; json?: (value: unknown) => AnyResponse; end?: (body?: string) => void };
function getUrl(req: AnyRequest) { const url = new URL(req.url ?? "/", "http://localhost"); if (!req.url) for (const [key, value] of Object.entries(req.query ?? {})) { if (Array.isArray(value)) value.forEach((item) => item !== undefined && url.searchParams.append(key, item)); else if (value !== undefined) url.searchParams.set(key, value); } return url; }
function send(res: AnyResponse | undefined, body: unknown, status = 200) { if (!res) return Response.json(body, { status }); const text = JSON.stringify(body); res.setHeader?.("content-type", "application/json; charset=utf-8"); if (res.status && res.json) { res.status(status).json(body); return; } res.statusCode = status; res.end?.(text); }

export default async function handler(req: AnyRequest, res?: AnyResponse) {
  const ticker = getUrl(req).searchParams.get("ticker")?.trim().toUpperCase() ?? "";
  if (!ticker) return send(res, { error: "Ticker is required" }, 400);
  try {
    if (ticker === "SJC" || ticker === "GC=F") {
      const sourceUrl = "https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price?zone=00";
      const response = await fetch(sourceUrl, { headers: { accept: "application/json", "user-agent": "LumenPersonalDesk/1.0" } });
      if (!response.ok) throw new Error(`PNJ ${response.status}`);
      const payload = await response.json() as any;
      const row = (payload?.data ?? []).find((item: any) => String(item?.masp ?? "").toUpperCase() === "SJC");
      const price = Number(row?.giaban) * 1000;
      if (!Number.isFinite(price)) throw new Error("PNJ không trả về giá bán SJC hợp lệ");
      return send(res, { ticker, name: "Vàng miếng SJC", currency: "VND", price, change: null, asOf: new Date().toISOString(), source: "PNJ SJC API" });
    }
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
    return send(res, { ticker, name: meta.longName ?? meta.shortName ?? ticker, currency: meta.currency ?? "", price, change, asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(), source: "Yahoo Finance public chart endpoint" });
  } catch (error) {
    return send(res, { error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
}
