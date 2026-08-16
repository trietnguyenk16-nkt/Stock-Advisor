type AnyRequest = Record<string, unknown>;
type AnyResponse = { statusCode?: number; setHeader?: (name: string, value: string) => void; status?: (code: number) => AnyResponse; json?: (value: unknown) => AnyResponse; end?: (body?: string) => void };
function send(res: AnyResponse | undefined, body: unknown, status = 200) { if (!res) return Response.json(body, { status }); const text = JSON.stringify(body); res.setHeader?.("content-type", "application/json; charset=utf-8"); if (res.status && res.json) { res.status(status).json(body); return; } res.statusCode = status; res.end?.(text); }

export default async function handler(_req: AnyRequest, res?: AnyResponse) {
  const connectionString = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) return send(res, { syncRuns: [], emailDeliveries: [], ok: false, code: "DATABASE_URL_MISSING", message: "Chưa cấu hình Supabase database trên Vercel" }, 200);
  let pool: { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>; end: () => Promise<void> } | undefined;
  try {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 8000, idleTimeoutMillis: 10000 }) as typeof pool;
    await pool.query(`CREATE SCHEMA IF NOT EXISTS stock_advisor; CREATE TABLE IF NOT EXISTS stock_advisor.sync_runs (id BIGSERIAL PRIMARY KEY, run_key VARCHAR(96) NOT NULL UNIQUE, status VARCHAR(16) NOT NULL, started_at BIGINT NOT NULL, finished_at BIGINT, assets_processed INTEGER NOT NULL DEFAULT 0, assets_succeeded INTEGER NOT NULL DEFAULT 0, error_message TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()); CREATE TABLE IF NOT EXISTS stock_advisor.email_deliveries (id BIGSERIAL PRIMARY KEY, run_key VARCHAR(96) NOT NULL UNIQUE, recipient VARCHAR(320) NOT NULL, status VARCHAR(16) NOT NULL, provider_message_id VARCHAR(255), error_message TEXT, sent_at BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
    const [sync, email] = await Promise.all([
      pool.query(`SELECT run_key AS "runKey", status, started_at AS "startedAt", finished_at AS "finishedAt", assets_processed AS "assetsProcessed", assets_succeeded AS "assetsSucceeded", error_message AS "errorMessage", created_at AS "createdAt" FROM stock_advisor.sync_runs ORDER BY started_at DESC LIMIT 30`),
      pool.query(`SELECT run_key AS "runKey", recipient, status, provider_message_id AS "providerMessageId", error_message AS "errorMessage", sent_at AS "sentAt", created_at AS "createdAt" FROM stock_advisor.email_deliveries ORDER BY created_at DESC LIMIT 30`),
    ]);
    return send(res, { ok: true, syncRuns: sync.rows, emailDeliveries: email.rows }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return send(res, { ok: false, syncRuns: [], emailDeliveries: [], code: /permission|denied/i.test(message) ? "SCHEMA_PERMISSION_DENIED" : "HISTORY_READ_FAILED", message }, 200);
  } finally { await pool?.end().catch(() => undefined); }
}
