type AnyRequest = { method?: string; url?: string; body?: unknown; json?: () => Promise<unknown>; on?: (event: string, listener: (...args: any[]) => void) => AnyRequest };
type AnyResponse = { statusCode?: number; setHeader?: (name: string, value: string) => void; status?: (code: number) => AnyResponse; json?: (value: unknown) => AnyResponse; end?: (body?: string) => void };
function send(res: AnyResponse | undefined, body: unknown, status = 200) { if (!res) return Response.json(body, { status }); const text = JSON.stringify(body); res.setHeader?.("content-type", "application/json; charset=utf-8"); if (res.status && res.json) { res.status(status).json(body); return; } res.statusCode = status; res.end?.(text); }
async function getBody(req: AnyRequest) { if (req.body !== undefined) return typeof req.body === "string" ? JSON.parse(req.body) : req.body; if (req.json) try { return await req.json(); } catch {} if (req.on) return await new Promise((resolve) => { let raw = ""; req.on?.("data", (chunk: Buffer | string) => { raw += chunk.toString(); }); req.on?.("end", () => { try { resolve(raw ? JSON.parse(raw) : undefined); } catch { resolve(undefined); } }); req.on?.("error", () => resolve(undefined)); }); return undefined; }
function getUrl(req: AnyRequest) { return new URL(req.url ?? "/", "http://localhost"); }

export default async function handler(req: AnyRequest, res?: AnyResponse) {
  const connectionString = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) return send(res, { error: "Thiếu SUPABASE_DATABASE_URL trên Vercel", code: "DATABASE_URL_MISSING" }, 503);
  let pool: { query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }>; end: () => Promise<unknown> } | undefined;
  try {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: connectionString.replace(/([?&])sslmode=[^&]*/i, "$1").replace(/[?&]$/, ""), ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 10_000 });
    await pool.query(`CREATE SCHEMA IF NOT EXISTS stock_advisor; CREATE TABLE IF NOT EXISTS stock_advisor.tracked_assets (id BIGSERIAL PRIMARY KEY, workspace_key VARCHAR(96) NOT NULL DEFAULT 'owner', ticker VARCHAR(32) NOT NULL, display_name VARCHAR(255) NOT NULL, asset_type VARCHAR(16) NOT NULL, provider_code VARCHAR(64) NOT NULL, currency VARCHAR(8) NOT NULL DEFAULT 'VND', unit VARCHAR(32) NOT NULL DEFAULT 'share', is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(workspace_key, ticker));`);
    if ((req.method ?? "GET").toUpperCase() === "POST") {
      const body = await getBody(req);
      const ticker = String(body?.ticker ?? "").trim().toUpperCase();
      const displayName = String(body?.displayName ?? ticker).trim();
      const assetType = String(body?.assetType ?? "equity").trim();
      const providerCode = String(body?.providerCode ?? ticker).trim().toUpperCase();
      if (!ticker || !displayName || !["equity", "fund", "gold"].includes(assetType)) return send(res, { error: "Thông tin tài sản không hợp lệ" }, 400);
      const result = await pool.query(`INSERT INTO stock_advisor.tracked_assets (workspace_key, ticker, display_name, asset_type, provider_code, currency, unit, is_active) VALUES ('owner',$1,$2,$3,$4,$5,$6,true) ON CONFLICT (workspace_key, ticker) DO UPDATE SET display_name=EXCLUDED.display_name, asset_type=EXCLUDED.asset_type, provider_code=EXCLUDED.provider_code, currency=EXCLUDED.currency, is_active=true, updated_at=now() RETURNING id,ticker,display_name,asset_type`, [ticker, displayName, assetType, providerCode, assetType === "gold" ? "USD" : "VND", assetType === "gold" ? "ounce" : "share"]);
      return send(res, { ok: true, asset: result.rows[0] });
    }
    if ((req.method ?? "GET").toUpperCase() === "DELETE") {
      const ticker = getUrl(req).searchParams.get("ticker")?.trim().toUpperCase();
      if (!ticker) return send(res, { error: "Ticker is required" }, 400);
      await pool.query(`UPDATE stock_advisor.tracked_assets SET is_active=false, updated_at=now() WHERE workspace_key='owner' AND ticker=$1`, [ticker]);
      return send(res, { ok: true, ticker });
    }
    const result = await pool.query(`SELECT id,ticker,display_name,asset_type,provider_code,currency FROM stock_advisor.tracked_assets WHERE workspace_key='owner' AND is_active=true ORDER BY id`);
    return send(res, { assets: result.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database request failed";
    return send(res, { error: message, code: "DATABASE_ASSET_FAILED" }, 503);
  } finally { await pool?.end().catch(() => undefined); }
}
