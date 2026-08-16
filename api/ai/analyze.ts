type AnyRequest = { method?: string; body?: unknown };
type AnyResponse = { status?: (code: number) => AnyResponse; json?: (body: unknown) => unknown; setHeader?: (name: string, value: string) => void; end?: (body?: string) => void };

export type PortfolioAnalysisResult = { signal: "BUY" | "SELL" | "HOLD"; summary: string; referencePrice: number; targetPrice: number; risk: string; confidence: number; news: Array<{ title: string; publisher: string; link: string; publishedAt: string | null }> };

export const PORTFOLIO_AI_SYSTEM_PROMPT = `Bạn là chuyên gia hỗ trợ phân tích danh mục tài sản Việt Nam, gồm cổ phiếu, chứng chỉ quỹ và vàng. Hãy phân tích thận trọng dựa duy nhất trên dữ liệu giá có timestamp và các bản tin kinh tế uy tín được cung cấp; tuyệt đối không bịa dữ liệu, không coi tin đồn là sự thật, không dùng nguồn không có trong payload và không cam kết lợi nhuận. Với mỗi mã, bắt buộc chọn một tín hiệu BUY, SELL hoặc HOLD; nêu giá tham chiếu, giá mục tiêu tham khảo, luận cứ liên kết với biến động giá và từng tin có nguồn, rủi ro chính, cùng độ tin cậy từ 0 đến 1. Nếu thiếu giá hoặc thiếu nguồn đáng tin cậy, ưu tiên HOLD, nói rõ thiếu dữ liệu và giảm confidence. Đây là thông tin tham khảo, không phải tư vấn đầu tư được cấp phép.`;
const TRUSTED_NEWS_PUBLISHERS = new Set(["Reuters", "Bloomberg", "Financial Times", "CNBC", "Nikkei Asia", "The Wall Street Journal", "Vietnam Investment Review", "The Investor", "VnExpress", "CafeF", "Vietstock", "Vietnam News"]);

function send(res: AnyResponse | undefined, body: unknown, status = 200) {
  if (res?.status && res.json) return res.status(status).json(body);
  res?.setHeader?.("content-type", "application/json; charset=utf-8");
  res?.end?.(JSON.stringify(body));
  return body;
}

export async function readBody(req: AnyRequest) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body as Record<string, unknown>;
  const raw = typeof req.body === "string" ? req.body : Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
  if (!raw.trim()) return {};
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

function modelFrom(value: unknown) { return value === "gpt-5-mini" ? "gpt-5-mini" : "gpt-4o-mini"; }

type AiNewsItem = { title: string; publisher: string; link: string; publishedAt: string | null; fetchedAt: string; sourceType: "VietnamNews" | "YahooFinance" };

async function fetchYahooNews(query: string): Promise<AiNewsItem[]> {
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=8&quotesCount=0`, { headers: { accept: "application/json" } });
    if (!response.ok) return [];
    const payload = await response.json() as { news?: Array<{ title?: string; publisher?: string; link?: string; providerPublishTime?: number }> };
    return (payload.news ?? []).map((item) => ({ title: item.title ?? "", publisher: item.publisher ?? "Yahoo Finance", link: item.link ?? "", publishedAt: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : null, fetchedAt: new Date().toISOString(), sourceType: "YahooFinance" as const })).filter((item) => item.title && item.link && TRUSTED_NEWS_PUBLISHERS.has(item.publisher));
  } catch { return []; }
}

async function fetchVietnamNews(query: string): Promise<AiNewsItem[]> {
  try {
    const response = await fetch(`https://cafef.vn/tim-kiem.chn?keywords=${encodeURIComponent(query)}`, { headers: { accept: "text/html", "user-agent": "StockAdvisor/1.0" } });
    if (!response.ok) return [];
    const html = await response.text();
    const fetchedAt = new Date().toISOString();
    return Array.from(html.matchAll(/href=["']([^"']+)["'][^>]*>([^<]{20,220})</gi)).slice(0, 8).map((match) => ({ title: (match[2] ?? "").replace(/\s+/g, " ").trim(), publisher: "CafeF", link: new URL(match[1] ?? "", "https://cafef.vn").toString(), publishedAt: null, fetchedAt, sourceType: "VietnamNews" as const })).filter((item) => item.title && item.link);
  } catch { return []; }
}

export async function fetchNews(query: string) {
  const [vietnamNews, yahooNews] = await Promise.all([fetchVietnamNews(query), fetchYahooNews(query)]);
  const seen = new Set<string>();
  return [...vietnamNews, ...yahooNews].filter((item) => { const key = item.link || item.title; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 8);
}

async function fetchCurrentPrice(asset: Record<string, unknown>) {
  const ticker = String(asset.ticker ?? "").trim().toUpperCase();
  const providerCode = String(asset.provider_code ?? ticker).trim().toUpperCase();
  const assetType = String(asset.asset_type ?? "");
  if (assetType === "gold") {
    const sourceUrl = "https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price?zone=00";
    const response = await fetch(sourceUrl, { headers: { accept: "application/json", "user-agent": "StockAdvisor/1.0" } });
    if (!response.ok) throw new Error(`PNJ ${response.status}`);
    const payload = await response.json() as any;
    const row = (payload?.data ?? []).find((item: any) => String(item?.masp ?? "").toUpperCase() === "SJC");
    const price = Number(row?.giaban) * 1000;
    if (!Number.isFinite(price)) throw new Error("PNJ không trả giá SJC hợp lệ");
    return { price, changePercent: null, asOf: Date.now(), sourceName: "PNJ SJC API", sourceUrl };
  }
  if (assetType === "fund") {
    const codes = Array.from(new Set([providerCode, providerCode === "SSISCA" ? "SSI-SCA" : "", providerCode.replace(/[^A-Z0-9-]/g, "-")].filter(Boolean)));
    for (const code of codes) {
      const sourceUrl = `https://cafef.vn/du-lieu/chung-chi-quy/${encodeURIComponent(code)}.chn`;
      try {
        const response = await fetch(sourceUrl, { headers: { accept: "text/html", "user-agent": "StockAdvisor/1.0" } });
        if (!response.ok) continue;
        const html = await response.text();
        const match = html.match(/Giá\s*NAV[^:]{0,120}:\s*([0-9][0-9.,]*)/i) ?? html.match(/NAV[^:]{0,120}:\s*([0-9][0-9.,]*)/i);
        const raw = match?.[1] ?? "";
        const price = Number(raw.includes(",") && raw.includes(".") ? raw.replace(/,/g, "") : raw.replace(",", "."));
        if (Number.isFinite(price) && price > 0) return { price, changePercent: null, asOf: Date.now(), sourceName: "CafeF fund data", sourceUrl };
      } catch { /* try next source code */ }
    }
    throw new Error(`Không có NAV quỹ hợp lệ cho ${ticker}`);
  }
  const sourceUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(providerCode)}?range=5d&interval=1d`;
  const response = await fetch(sourceUrl, { headers: { accept: "application/json", "user-agent": "StockAdvisor/1.0" } });
  if (!response.ok) throw new Error(`Yahoo ${response.status}`);
  const payload = await response.json() as any;
  const result = payload?.chart?.result?.[0];
  const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter((value: unknown): value is number => typeof value === "number");
  const price = Number(result?.meta?.regularMarketPrice ?? closes.at(-1));
  const previous = Number(result?.meta?.previousClose ?? closes.at(-2));
  if (!Number.isFinite(price)) throw new Error(`Không có giá Yahoo hợp lệ cho ${ticker}`);
  return { price, changePercent: Number.isFinite(previous) && previous !== 0 ? ((price - previous) / previous) * 100 : null, asOf: Date.now(), sourceName: "Yahoo Finance", sourceUrl };
}

function clientQuoteMap(value: unknown) {
  if (!Array.isArray(value)) return new Map<string, Record<string, unknown>>();
  return new Map(value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")).map((item) => [String(item.ticker ?? "").trim().toUpperCase(), item]));
}

function quoteFromClient(asset: Record<string, unknown>, clientQuotes: Map<string, Record<string, unknown>>) {
  const provided = clientQuotes.get(String(asset.ticker ?? "").trim().toUpperCase());
  const price = Number(provided?.price);
  if (!provided || !Number.isFinite(price) || price <= 0) return null;
  return { price, changePercent: Number.isFinite(Number(provided.change)) ? Number(provided.change) : null, asOf: provided.asOf ?? Date.now(), sourceName: String(provided.source ?? "Watchlist quote"), sourceUrl: provided.sourceUrl ? String(provided.sourceUrl) : undefined };
}

export function buildAssetsFromQuotes(value: unknown) {
  return Array.from(clientQuoteMap(value).entries()).filter(([, quote]) => Number.isFinite(Number(quote.price)) && Number(quote.price) > 0).map(([ticker, quote]) => ({ id: null, ticker, display_name: String(quote.name ?? ticker), asset_type: String(quote.assetType ?? "equity"), provider_code: String(quote.providerCode ?? ticker), currency: String(quote.currency ?? "VND"), price: null, change_percent: null, as_of: null }));
}

async function analyze(model: string, asset: Record<string, unknown>, quote: Record<string, unknown>, news: Array<Record<string, unknown>>, requirement: string): Promise<PortfolioAnalysisResult> {
  const system = requirement ? `${PORTFOLIO_AI_SYSTEM_PROMPT}\n\nYêu cầu đầu tư bổ sung của người dùng: ${requirement}` : PORTFOLIO_AI_SYSTEM_PROMPT;
  const messages = [
    { role: "system", content: system },
    { role: "user", content: JSON.stringify({ asset, quote, news, instruction: "Phân tích mã này trong danh mục. Liên kết luận điểm với giá và từng tin có nguồn. Chọn BUY, SELL hoặc HOLD; nêu giá tham chiếu, giá mục tiêu, luận cứ, rủi ro và confidence. Chỉ trả về JSON hợp lệ với các khóa signal, summary, referencePrice, targetPrice, risk, confidence." }) },
  ];
  const schema = { type: "json_schema", json_schema: { name: "manual_asset_analysis", strict: true, schema: { type: "object", properties: { signal: { type: "string", enum: ["BUY", "SELL", "HOLD"] }, summary: { type: "string" }, referencePrice: { type: "number" }, targetPrice: { type: "number" }, risk: { type: "string" }, confidence: { type: "number" } }, required: ["signal", "summary", "referencePrice", "targetPrice", "risk", "confidence"], additionalProperties: false } } };
  let lastError = "OpenAI không trả nội dung phân tích";
  for (const useSchema of [true, false]) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model, ...(model === "gpt-5-mini" ? { reasoning_effort: "low" } : {}), messages, ...(useSchema ? { response_format: schema } : {}) }) });
    const text = await response.text();
    if (!response.ok) { lastError = `OpenAI ${response.status}: ${text.slice(0, 300)}`; continue; }
    try {
      const payload = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) { lastError = "OpenAI không trả nội dung phân tích"; continue; }
      const clean = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      return { ...(JSON.parse(clean) as Omit<PortfolioAnalysisResult, "news">), news: news as PortfolioAnalysisResult["news"] };
    } catch (error) { lastError = error instanceof Error ? error.message : "Không parse được JSON AI"; }
  }
  throw new Error(lastError);
}

export default async function handler(req: AnyRequest, res?: AnyResponse) {
  if (req.method && req.method !== "POST") return send(res, { ok: false, code: "METHOD_NOT_ALLOWED", message: "Chỉ hỗ trợ POST" }, 405);
  const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) return send(res, { ok: false, code: "DATABASE_URL_MISSING", message: "Chưa cấu hình Supabase database trên Vercel" }, 503);
  if (!process.env.OPENAI_API_KEY) return send(res, { ok: false, code: "OPENAI_KEY_MISSING", message: "Chưa cấu hình OPENAI_API_KEY trên Vercel" }, 503);
  let pool: { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>; end: () => Promise<void> } | undefined;
  try {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 8000, idleTimeoutMillis: 10000 }) as typeof pool;
    const body = await readBody(req);
    const additionalRequirement = typeof body.requirement === "string" ? body.requirement.trim().slice(0, 1200) : "";
    const requestedTicker = /^[A-Z0-9][A-Z0-9.=/-]{0,31}$/i.test(additionalRequirement) ? additionalRequirement.toUpperCase() : null;
    const clientQuotes = clientQuoteMap(body.quotes);
    const settings = await pool.query("SELECT model FROM stock_advisor.ai_settings WHERE workspace_key='owner' LIMIT 1").catch(() => ({ rows: [] }));
    const model = modelFrom(body.model ?? settings.rows[0]?.model);
    await pool.query(`CREATE SCHEMA IF NOT EXISTS stock_advisor; CREATE TABLE IF NOT EXISTS stock_advisor.ai_advice_runs (id BIGSERIAL PRIMARY KEY, run_key VARCHAR(96) NOT NULL UNIQUE, workspace_key VARCHAR(96) NOT NULL DEFAULT 'owner', requested_ticker VARCHAR(32), additional_requirement TEXT, model VARCHAR(64) NOT NULL, status VARCHAR(16) NOT NULL, assets_requested INTEGER NOT NULL DEFAULT 0, assets_analyzed INTEGER NOT NULL DEFAULT 0, assets_skipped INTEGER NOT NULL DEFAULT 0, error_message TEXT, response_json JSONB, started_at BIGINT NOT NULL, finished_at BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());`).catch(() => undefined);
    let allAssets: any[] = [];
    try {
      allAssets = (await pool.query(`SELECT ta.id, ta.ticker, ta.display_name, ta.asset_type, ta.provider_code, ta.currency, ps.price, ps.change_percent, ps.as_of FROM stock_advisor.tracked_assets ta LEFT JOIN LATERAL (SELECT price, change_percent, as_of FROM stock_advisor.price_snapshots WHERE asset_id=ta.id ORDER BY as_of DESC LIMIT 1) ps ON true WHERE ta.workspace_key='owner' AND ta.is_active=true ORDER BY ta.id`)).rows;
    } catch (error) {
      if (!clientQuotes.size) throw error;
    }
    if (!allAssets.length && clientQuotes.size) allAssets = buildAssetsFromQuotes(body.quotes);
    const runKey = `manual-ai:${Date.now()}`;
    const startedAt = Date.now();
    const assets = requestedTicker ? allAssets.filter((asset) => String(asset.ticker).toUpperCase() === requestedTicker) : allAssets;
    if (requestedTicker && assets.length === 0) {
      const message = `${requestedTicker} chưa có trong Watchlist. Hãy thêm mã và đồng bộ trước khi phân tích.`;
      await pool.query(`INSERT INTO stock_advisor.ai_advice_runs (run_key, requested_ticker, additional_requirement, model, status, assets_requested, assets_analyzed, assets_skipped, error_message, started_at, finished_at) VALUES ($1,$2,$3,$4,'failed',0,0,0,$5,$6,$6)`, [runKey, requestedTicker, additionalRequirement, model, message, startedAt]).catch(() => undefined);
      return send(res, { ok: false, status: "failed", code: "TICKER_NOT_IN_WATCHLIST", message, model, analyzed: 0, skipped: 0, results: [], errors: [message] }, 200);
    }
    const results: Array<Record<string, unknown>> = [];
    const errors: string[] = [];
    for (const asset of assets) {
      try {
        let quote = quoteFromClient(asset, clientQuotes) ?? { price: asset.price == null ? Number.NaN : Number(asset.price), changePercent: asset.change_percent == null ? null : Number(asset.change_percent), asOf: asset.as_of };
        if (!Number.isFinite(quote.price) || quote.price <= 0) {
          const current = await fetchCurrentPrice(asset);
          quote = { price: current.price, changePercent: current.changePercent, asOf: current.asOf };
          await pool.query(`INSERT INTO stock_advisor.price_snapshots (asset_id, run_key, price, change_percent, as_of, source_name, source_url, freshness) VALUES ($1,$2,$3,$4,$5,$6,$7,'ai-preflight') ON CONFLICT (run_key, asset_id) DO NOTHING`, [asset.id, `ai-preflight:${runKey}`, current.price, current.changePercent, current.asOf, current.sourceName, current.sourceUrl]).catch(() => undefined);
        }
        const news = await fetchNews(`${String(asset.ticker ?? "")} ${String(asset.display_name ?? "")}`.trim());
        let result: PortfolioAnalysisResult;
        let modelUsed = model;
        try { result = await analyze(model, asset, quote, news, requestedTicker ? "" : additionalRequirement); } catch (primaryError) {
          if (model !== "gpt-5-mini") throw primaryError;
          modelUsed = "gpt-4o-mini";
          result = await analyze(modelUsed, asset, quote, news, requestedTicker ? "" : additionalRequirement);
        }
        if (asset.id != null) await pool.query(`INSERT INTO stock_advisor.asset_analyses (asset_id, run_key, signal, summary, reference_price, target_price, risk, confidence, as_of) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (run_key, asset_id) DO UPDATE SET signal=EXCLUDED.signal, summary=EXCLUDED.summary, reference_price=EXCLUDED.reference_price, target_price=EXCLUDED.target_price, risk=EXCLUDED.risk, confidence=EXCLUDED.confidence, as_of=EXCLUDED.as_of`).catch(() => undefined);
        results.push({ ticker: asset.ticker, name: asset.display_name, model: modelUsed, ...result });
      } catch (error) { errors.push(`${asset.ticker}: ${error instanceof Error ? error.message : String(error)}`); }
    }
    const status = errors.length && !results.length ? "failed" : errors.length ? "partial" : "success";
    const responsePayload = { ok: results.length > 0, status, model, analyzed: results.length, skipped: assets.length - results.length, results, errors };
    await pool.query(`INSERT INTO stock_advisor.ai_advice_runs (run_key, requested_ticker, additional_requirement, model, status, assets_requested, assets_analyzed, assets_skipped, error_message, response_json, started_at, finished_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12)`, [runKey, requestedTicker, additionalRequirement || null, model, status, assets.length, results.length, assets.length - results.length, errors.length ? errors.join("\n").slice(0, 4000) : null, JSON.stringify(responsePayload), startedAt, Date.now()]).catch(() => undefined);
    return send(res, responsePayload, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return send(res, { ok: false, status: "failed", code: /permission|denied/i.test(message) ? "SCHEMA_PERMISSION_DENIED" : "AI_ANALYSIS_FAILED", message }, 200);
  } finally { await pool?.end().catch(() => undefined); }
}
