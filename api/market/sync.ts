type AnyRequest = Record<string, unknown>;
type AnyResponse = { statusCode?: number; setHeader?: (name: string, value: string) => void; status?: (code: number) => AnyResponse; json?: (value: unknown) => AnyResponse; end?: (body?: string) => void };
function send(res: AnyResponse | undefined, body: unknown, status = 200) { if (!res) return Response.json(body, { status }); const text = JSON.stringify(body); res.setHeader?.("content-type", "application/json; charset=utf-8"); if (res.status && res.json) { res.status(status).json(body); return; } res.statusCode = status; res.end?.(text); }

type Asset = { id: number; ticker: string; display_name: string; provider_code: string; currency: string };

async function runInlineSync(runKey: string) {
  const connectionString = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) return { ok: false, status: "failed", code: "DATABASE_UNAVAILABLE", message: "SUPABASE_DATABASE_URL chưa được cấu hình trên Vercel" };
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: connectionString.replace(/([?&])sslmode=[^&]*/i, "$1").replace(/[?&]$/, ""), ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 10_000 });
  try {
    const startedAt = Date.now();
    const claim = await pool.query(`INSERT INTO stock_advisor.sync_runs (run_key, status, started_at) VALUES ($1, 'running', $2) ON CONFLICT (run_key) DO NOTHING RETURNING run_key`, [runKey, startedAt]);
    if (claim.rowCount !== 1) return { ok: true, skipped: true, status: "deduplicated", runKey };
    const assets = (await pool.query<Asset>(`SELECT id, ticker, display_name, provider_code, currency FROM stock_advisor.tracked_assets WHERE workspace_key = 'owner' AND is_active = true ORDER BY id`)).rows;
    const errors: string[] = [];
    let succeeded = 0;
    for (const asset of assets) {
      try {
        const symbol = (asset.provider_code || asset.ticker).trim().toUpperCase();
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`, { headers: { accept: "application/json", "user-agent": "StockAdvisor/1.0" } });
        if (!response.ok) throw new Error(`Yahoo ${response.status}`);
        const payload = await response.json() as any;
        const result = payload?.chart?.result?.[0];
        const meta = result?.meta ?? {};
        const closes = result?.indicators?.quote?.[0]?.close ?? [];
        const price = Number(meta.regularMarketPrice ?? closes.filter((v: unknown) => typeof v === "number").at(-1));
        if (!Number.isFinite(price)) throw new Error("Không đọc được giá");
        const previous = Number(meta.previousClose ?? closes.filter((v: unknown) => typeof v === "number").at(-2));
        const change = Number.isFinite(previous) && previous !== 0 ? ((price - previous) / previous) * 100 : null;
        await pool.query(`INSERT INTO stock_advisor.price_snapshots (asset_id, run_key, price, change_percent, as_of, source_name, source_url, freshness) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (run_key, asset_id) DO NOTHING`, [asset.id, runKey, price, change, Date.now(), "Yahoo Finance", `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`, "fresh"]);
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
    const runKey = `manual:${new Date().toISOString().slice(0, 16)}`;
    const result = await Promise.race([runInlineSync(runKey), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Manual sync timed out after 45 seconds")), 45_000))]);
    return send(res, result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[api/market/sync] failed", message);
    return send(res, { ok: false, status: "failed", code: "SYNC_FAILED", message, error: message }, 200);
  }
}
