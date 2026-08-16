type AnyRequest = { method?: string; url?: string; query?: Record<string, string | string[] | undefined> };
type AnyResponse = { statusCode?: number; setHeader?: (name: string, value: string) => void; status?: (code: number) => AnyResponse; json?: (value: unknown) => AnyResponse; end?: (body?: string) => void };

function getUrl(req: AnyRequest) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (!req.url) for (const [key, value] of Object.entries(req.query ?? {})) {
    if (Array.isArray(value)) value.forEach((item) => item !== undefined && url.searchParams.append(key, item));
    else if (value !== undefined) url.searchParams.set(key, value);
  }
  return url;
}

function send(res: AnyResponse | undefined, body: unknown, status = 200) {
  if (!res) return Response.json(body, { status, headers: { "cache-control": "no-store" } });
  const setStatus = res.status;
  const sendJson = res.json;
  if (setStatus && sendJson) { sendJson.call(setStatus(status), body); return; }
  res.statusCode = status;
  res.setHeader?.("content-type", "application/json; charset=utf-8");
  res.end?.(JSON.stringify(body));
}

function vietnamDayRange(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const [year, month, day] = date.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day) - 7 * 60 * 60 * 1000;
  return { start, end: start + 24 * 60 * 60 * 1000 - 1 };
}

async function yahooHistoricalPrice(symbol: string, start: number, end: number) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${Math.floor(start / 1000)}&period2=${Math.floor((end + 1) / 1000)}&interval=1d`;
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "StockAdvisor/1.0" } });
  if (!response.ok) return undefined;
  const payload = await response.json() as any;
  const result = payload?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp ?? [];
  const closes: Array<number | null> = result?.indicators?.quote?.[0]?.close ?? [];
  for (let index = closes.length - 1; index >= 0; index -= 1) {
    const close = closes[index];
    const timestamp = timestamps[index] ? timestamps[index] * 1000 : 0;
    if (typeof close === "number" && Number.isFinite(close) && timestamp >= start && timestamp <= end) return { price: close, asOf: timestamp, sourceName: "Yahoo Finance historical chart", sourceUrl: url };
  }
  return undefined;
}

export default async function handler(req: AnyRequest, res?: AnyResponse) {
  if (req.method && req.method !== "GET") return send(res, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  const connectionString = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) return send(res, { syncRuns: [], syncAssets: [], emailDeliveries: [], aiAdviceRuns: [], comparisons: [], ok: false, code: "DATABASE_URL_MISSING", message: "Chưa cấu hình Supabase database trên Vercel" }, 200);
  const selectedDate = getUrl(req).searchParams.get("date") ?? "";
  const dateRange = selectedDate ? vietnamDayRange(selectedDate) : undefined;
  if (selectedDate && !dateRange) return send(res, { ok: false, code: "INVALID_DATE", message: "Ngày phải có định dạng YYYY-MM-DD" }, 400);
  let pool: { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>; end: () => Promise<void> } | undefined;
  try {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 8000, idleTimeoutMillis: 10000 }) as typeof pool;
    await pool.query(`CREATE SCHEMA IF NOT EXISTS stock_advisor; CREATE TABLE IF NOT EXISTS stock_advisor.sync_runs (id BIGSERIAL PRIMARY KEY, run_key VARCHAR(96) NOT NULL UNIQUE, status VARCHAR(16) NOT NULL, started_at BIGINT NOT NULL, finished_at BIGINT, assets_processed INTEGER NOT NULL DEFAULT 0, assets_succeeded INTEGER NOT NULL DEFAULT 0, error_message TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()); CREATE TABLE IF NOT EXISTS stock_advisor.email_deliveries (id BIGSERIAL PRIMARY KEY, run_key VARCHAR(96) NOT NULL UNIQUE, recipient VARCHAR(320) NOT NULL, status VARCHAR(16) NOT NULL, provider_message_id VARCHAR(255), error_message TEXT, sent_at BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()); CREATE TABLE IF NOT EXISTS stock_advisor.sync_run_assets (id BIGSERIAL PRIMARY KEY, run_key VARCHAR(96) NOT NULL, asset_id BIGINT NOT NULL, ticker VARCHAR(32) NOT NULL, display_name VARCHAR(255) NOT NULL, status VARCHAR(16) NOT NULL, previous_price NUMERIC(20,6), price NUMERIC(20,6), bid NUMERIC(20,6), ask NUMERIC(20,6), change_percent NUMERIC(12,6), source_name VARCHAR(128), source_url VARCHAR(1024), as_of BIGINT, message TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(run_key, asset_id)); CREATE TABLE IF NOT EXISTS stock_advisor.ai_advice_runs (id BIGSERIAL PRIMARY KEY, run_key VARCHAR(96) NOT NULL UNIQUE, workspace_key VARCHAR(96) NOT NULL DEFAULT 'owner', requested_ticker VARCHAR(32), additional_requirement TEXT, model VARCHAR(64) NOT NULL, status VARCHAR(16) NOT NULL, assets_requested INTEGER NOT NULL DEFAULT 0, assets_analyzed INTEGER NOT NULL DEFAULT 0, assets_skipped INTEGER NOT NULL DEFAULT 0, error_message TEXT, response_json JSONB, started_at BIGINT NOT NULL, finished_at BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
    const [sync, syncAssets, email, advice] = await Promise.all([
      pool.query(`SELECT run_key AS "runKey", status, started_at AS "startedAt", finished_at AS "finishedAt", assets_processed AS "assetsProcessed", assets_succeeded AS "assetsSucceeded", error_message AS "errorMessage", created_at AS "createdAt" FROM stock_advisor.sync_runs ORDER BY started_at DESC LIMIT 30`),
      pool.query(`SELECT run_key AS "runKey", ticker, display_name AS "displayName", status, previous_price AS "previousPrice", price, bid, ask, change_percent AS "changePercent", source_name AS "sourceName", source_url AS "sourceUrl", as_of AS "asOf", message, created_at AS "createdAt" FROM stock_advisor.sync_run_assets ORDER BY created_at DESC LIMIT 300`),
      pool.query(`SELECT run_key AS "runKey", recipient, status, provider_message_id AS "providerMessageId", error_message AS "errorMessage", sent_at AS "sentAt", created_at AS "createdAt" FROM stock_advisor.email_deliveries ORDER BY created_at DESC LIMIT 30`),
      pool.query(`SELECT run_key AS "runKey", requested_ticker AS "requestedTicker", additional_requirement AS "additionalRequirement", model, status, assets_requested AS "assetsRequested", assets_analyzed AS "assetsAnalyzed", assets_skipped AS "assetsSkipped", error_message AS "errorMessage", response_json AS "responseJson", started_at AS "startedAt", finished_at AS "finishedAt", created_at AS "createdAt" FROM stock_advisor.ai_advice_runs WHERE workspace_key='owner' ORDER BY started_at DESC LIMIT 30`),
    ]);
    const comparisons: any[] = [];
    if (dateRange) {
      const assets = (await pool.query(`SELECT id, ticker, provider_code AS "providerCode", asset_type AS "assetType" FROM stock_advisor.tracked_assets WHERE workspace_key='owner' AND is_active=true ORDER BY id`)).rows;
      for (const asset of assets) {
        const stored = await pool.query(`SELECT price, as_of AS "asOf", source_name AS "sourceName", source_url AS "sourceUrl" FROM stock_advisor.price_snapshots WHERE asset_id=$1 AND as_of BETWEEN $2 AND $3 ORDER BY as_of DESC LIMIT 1`, [asset.id, dateRange.start, dateRange.end]);
        let value = stored.rows[0];
        if (!value && (asset.assetType === "equity" || String(asset.providerCode).endsWith(".VN"))) {
          const historical = await yahooHistoricalPrice(String(asset.providerCode || asset.ticker), dateRange.start, dateRange.end);
          if (historical) {
            value = historical;
            await pool.query(`INSERT INTO stock_advisor.price_snapshots (asset_id, run_key, price, as_of, source_name, source_url, freshness) VALUES ($1,$2,$3,$4,$5,$6,'historical') ON CONFLICT (run_key, asset_id) DO NOTHING`, [asset.id, `historical:${selectedDate}`, historical.price, historical.asOf, historical.sourceName, historical.sourceUrl]).catch(() => undefined);
          }
        }
        comparisons.push({ ticker: asset.ticker, date: selectedDate, price: value?.price == null ? null : Number(value.price), asOf: value?.asOf ?? null, sourceName: value?.sourceName ?? null, sourceUrl: value?.sourceUrl ?? null });
      }
    }
    return send(res, { ok: true, syncRuns: sync.rows, syncAssets: syncAssets.rows, emailDeliveries: email.rows, aiAdviceRuns: advice.rows, comparisons }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return send(res, { ok: false, syncRuns: [], syncAssets: [], emailDeliveries: [], aiAdviceRuns: [], comparisons: [], code: /permission|denied/i.test(message) ? "SCHEMA_PERMISSION_DENIED" : "HISTORY_READ_FAILED", message }, 200);
  } finally { await pool?.end().catch(() => undefined); }
}
