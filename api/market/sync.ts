type AnyRequest = Record<string, unknown>;
type AnyResponse = { statusCode?: number; setHeader?: (name: string, value: string) => void; status?: (code: number) => AnyResponse; json?: (value: unknown) => AnyResponse; end?: (body?: string) => void };
function send(res: AnyResponse | undefined, body: unknown, status = 200) { if (!res) return Response.json(body, { status }); const text = JSON.stringify(body); res.setHeader?.("content-type", "application/json; charset=utf-8"); if (res.status && res.json) { res.status(status).json(body); return; } res.statusCode = status; res.end?.(text); }

type Asset = { id: number; ticker: string; display_name: string; asset_type: "equity" | "fund" | "gold"; provider_code: string; currency: string };

type Quote = { price: number; change: number | null; sourceName: string; sourceUrl: string; freshness: string };

function parseNumber(value: string) { const cleaned = value.replace(/[^0-9,.-]/g, "").trim(); if (!cleaned) return undefined; const normalized = cleaned.includes(",") && cleaned.includes(".") ? (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".") ? cleaned.replace(/\\./g, "").replace(",", ".") : cleaned.replace(/,/g, "")) : cleaned.includes(",") ? cleaned.replace(/,/g, ".") : /^\\d+\\.\\d{3}$/.test(cleaned) ? cleaned.replace(".", "") : cleaned; const result = Number(normalized); return Number.isFinite(result) ? result : undefined; }

async function fetchText(url: string) { const response = await fetch(url, { headers: { accept: "text/html,application/xhtml+xml", "user-agent": "LumenPersonalDesk/1.0" } }); if (!response.ok) throw new Error(`${response.status} ${response.statusText}`); return response.text(); }

async function fetchQuote(asset: Asset): Promise<Quote> {
  if (asset.asset_type === "fund") {
    const url = `https://cafef.vn/du-lieu/chung-chi-quy/${encodeURIComponent(asset.provider_code || asset.ticker)}.chn`;
    const html = await fetchText(url); const match = html.match(/Giá\s*NAV[^:]{0,120}:\s*([0-9][0-9.,]*)/i) ?? html.match(/NAV[^:]{0,120}:\s*([0-9][0-9.,]*)/i); const price = match ? parseNumber(match[1] ?? "") : undefined;
    if (price === undefined) throw new Error(`Không đọc được NAV quỹ từ CafeF: ${asset.ticker}`);
    return { price, change: null, sourceName: "CafeF fund data", sourceUrl: url, freshness: "eod" };
  }
  if (asset.asset_type === "gold") {
    const errors: string[] = [];
    try {
      const url = "https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price?zone=00";
      const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "LumenPersonalDesk/1.0" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const payload = await response.json() as any;
      const sjc = (payload?.data ?? []).find((row: any) => String(row?.masp ?? "").toUpperCase() === "SJC");
      const bid = Number(sjc?.giamua); const ask = Number(sjc?.giaban);
      if (Number.isFinite(bid) && Number.isFinite(ask)) return { price: ask * 1000, change: null, sourceName: "PNJ SJC API", sourceUrl: url, freshness: "fresh" };
      throw new Error("PNJ không trả về dòng SJC hợp lệ");
    } catch (error) { errors.push(`PNJ API: ${error instanceof Error ? error.message : String(error)}`); }
    const sources = [{ name: "SJC", url: "https://sjc.com.vn/" }, { name: "PNJ", url: "https://www.pnj.com.vn/site/gia-vang" }, { name: "DOJI", url: "https://doji.vn/" }];
    for (const source of sources) { try { const html = await fetchText(source.url); const index = html.toLowerCase().indexOf((source.name === "SJC" ? "sjc" : "mua vào").toLowerCase()); const block = index >= 0 ? html.slice(index, index + 4000) : html; const prices = Array.from(block.matchAll(/(?:mua vào|bán ra|mua|bán|buy|sell)[^0-9]{0,100}([0-9][0-9.,]*)/gi)).map((m) => parseNumber(m[1] ?? "")).filter((v): v is number => v !== undefined); if (prices.length >= 2) return { price: prices[1] * 1000, change: null, sourceName: source.name, sourceUrl: source.url, freshness: "unknown" }; errors.push(`${source.name}: không parse được bảng giá`); } catch (error) { errors.push(`${source.name}: ${error instanceof Error ? error.message : String(error)}`); }
    }
    throw new Error(`Không lấy được giá vàng SJC: ${errors.join(" | ")}`);
  }
  const symbol = (asset.provider_code || asset.ticker).trim().toUpperCase(); const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`; const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "StockAdvisor/1.0" } }); if (!response.ok) throw new Error(`Yahoo ${response.status}`); const payload = await response.json() as any; const result = payload?.chart?.result?.[0]; const meta = result?.meta ?? {}; const closes = result?.indicators?.quote?.[0]?.close ?? []; const price = Number(meta.regularMarketPrice ?? closes.filter((v: unknown) => typeof v === "number").at(-1)); if (!Number.isFinite(price)) throw new Error("Không đọc được giá cổ phiếu"); const previous = Number(meta.previousClose ?? closes.filter((v: unknown) => typeof v === "number").at(-2)); return { price, change: Number.isFinite(previous) && previous !== 0 ? ((price - previous) / previous) * 100 : null, sourceName: "Yahoo Finance", sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`, freshness: "fresh" };
}

async function runInlineSync(runKey: string) {
  const connectionString = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) return { ok: false, status: "failed", code: "DATABASE_UNAVAILABLE", message: "SUPABASE_DATABASE_URL chưa được cấu hình trên Vercel" };
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: connectionString.replace(/([?&])sslmode=[^&]*/i, "$1").replace(/[?&]$/, ""), ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 10_000 });
  try {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS stock_advisor; CREATE TABLE IF NOT EXISTS stock_advisor.tracked_assets (id BIGSERIAL PRIMARY KEY, workspace_key VARCHAR(96) NOT NULL DEFAULT 'owner', ticker VARCHAR(32) NOT NULL, display_name VARCHAR(255) NOT NULL, asset_type VARCHAR(16) NOT NULL, provider_code VARCHAR(64) NOT NULL, currency VARCHAR(8) NOT NULL DEFAULT 'VND', unit VARCHAR(32) NOT NULL DEFAULT 'share', is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(workspace_key, ticker)); CREATE TABLE IF NOT EXISTS stock_advisor.sync_runs (id BIGSERIAL PRIMARY KEY, run_key VARCHAR(96) NOT NULL UNIQUE, status VARCHAR(16) NOT NULL, started_at BIGINT NOT NULL, finished_at BIGINT, assets_processed INTEGER NOT NULL DEFAULT 0, assets_succeeded INTEGER NOT NULL DEFAULT 0, error_message TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()); CREATE TABLE IF NOT EXISTS stock_advisor.price_snapshots (id BIGSERIAL PRIMARY KEY, asset_id BIGINT NOT NULL, run_key VARCHAR(96) NOT NULL, price NUMERIC(20,6) NOT NULL, change_percent NUMERIC(10,4), as_of BIGINT NOT NULL, source_name VARCHAR(128) NOT NULL, source_url VARCHAR(1024) NOT NULL, freshness VARCHAR(32) NOT NULL DEFAULT 'unknown', warning TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(run_key, asset_id));`);
    const startedAt = Date.now();
    const claim = await pool.query(`INSERT INTO stock_advisor.sync_runs (run_key, status, started_at) VALUES ($1, 'running', $2) ON CONFLICT (run_key) DO NOTHING RETURNING run_key`, [runKey, startedAt]);
    if (claim.rowCount !== 1) return { ok: true, skipped: true, status: "deduplicated", runKey };
    const assets = (await pool.query<Asset>(`SELECT id, ticker, display_name, asset_type, provider_code, currency FROM stock_advisor.tracked_assets WHERE workspace_key = 'owner' AND is_active = true ORDER BY id`)).rows;
    const errors: string[] = [];
    let succeeded = 0;
    for (const asset of assets) {
      try {
        const quote = await fetchQuote(asset);
        await pool.query(`INSERT INTO stock_advisor.price_snapshots (asset_id, run_key, price, change_percent, as_of, source_name, source_url, freshness) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (run_key, asset_id) DO NOTHING`, [asset.id, runKey, quote.price, quote.change, Date.now(), quote.sourceName, quote.sourceUrl, quote.freshness]);
        succeeded += 1;
      } catch (error) { errors.push(`${asset.ticker}: ${error instanceof Error ? error.message : String(error)}`); }
    }
    const status = errors.length === 0 ? "success" : succeeded > 0 ? "partial" : "failed";
    await pool.query(`UPDATE stock_advisor.sync_runs SET status=$2, finished_at=$3, assets_processed=$4, assets_succeeded=$5, error_message=$6 WHERE run_key=$1`, [runKey, status, Date.now(), assets.length, succeeded, errors.length ? errors.join("\n").slice(0, 4000) : null]);
    return { ok: status !== "failed", runKey, status, assetsProcessed: assets.length, assetsSucceeded: succeeded, errors };
  } finally { await pool.end().catch(() => undefined); }
}

export default async function handler(_req: AnyRequest, res?: AnyResponse) {
  try {
    const runKey = `manual:${Date.now()}`;
    const result = await Promise.race([runInlineSync(runKey), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Manual sync timed out after 45 seconds")), 45_000))]);
    return send(res, result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[api/market/sync] failed", message);
    return send(res, { ok: false, status: "failed", code: "SYNC_FAILED", message, error: message }, 200);
  }
}
