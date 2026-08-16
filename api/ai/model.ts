type AnyRequest = { body?: unknown; json?: () => Promise<unknown>; on?: (event: string, listener: (...args: any[]) => void) => AnyRequest };
type AnyResponse = { statusCode?: number; setHeader?: (name: string, value: string) => void; status?: (code: number) => AnyResponse; json?: (value: unknown) => AnyResponse; end?: (body?: string) => void };
const AI_MODELS = ["gpt-4o-mini", "gpt-5-mini"] as const;
export function classifyPersistenceError(error: unknown) { const message = error instanceof Error ? error.message : String(error); const lower = message.toLowerCase(); if (lower.includes("permission denied") || lower.includes("42501") || lower.includes("not owner")) return { code: "SCHEMA_PERMISSION_DENIED", message }; if (lower.includes("does not exist") || lower.includes("undefined table") || lower.includes("relation") && lower.includes("missing")) return { code: "AI_SETTINGS_TABLE_MISSING", message }; return { code: "AI_SETTINGS_PERSIST_FAILED", message }; }
function send(res: AnyResponse | undefined, body: unknown, status = 200) { if (!res) return Response.json(body, { status }); const text = JSON.stringify(body); res.setHeader?.("content-type", "application/json; charset=utf-8"); if (res.status && res.json) { res.status(status).json(body); return; } res.statusCode = status; res.end?.(text); }
async function getBody(req: AnyRequest) { if (req.body !== undefined) return typeof req.body === "string" ? JSON.parse(req.body) : req.body; if (req.json) try { return await req.json(); } catch {} if (req.on) return await new Promise((resolve) => { let raw = ""; req.on?.("data", (chunk: Buffer | string) => { raw += chunk.toString(); }); req.on?.("end", () => { try { resolve(raw ? JSON.parse(raw) : undefined); } catch { resolve(undefined); } }); req.on?.("error", () => resolve(undefined)); }); return undefined; }

export default async function handler(req: AnyRequest, res?: AnyResponse) {
  const body = await getBody(req);
  const model = body?.model;
  if (!AI_MODELS.includes(model)) return send(res, { error: "Model AI không được hỗ trợ" }, 400);
  const connectionString = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) return send(res, { error: "Thiếu SUPABASE_DATABASE_URL trên Vercel", code: "DATABASE_URL_MISSING", model, persisted: false }, 503);
  let pool: { query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }>; end: () => Promise<unknown> } | undefined;
  try {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: connectionString.replace(/([?&])sslmode=[^&]*/i, "$1").replace(/[?&]$/, ""), ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 10_000 });
    await pool.query(`CREATE SCHEMA IF NOT EXISTS stock_advisor`);
    await pool.query(`CREATE TABLE IF NOT EXISTS stock_advisor.ai_settings (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, workspace_key varchar(96) NOT NULL DEFAULT 'owner', model varchar(64) NOT NULL DEFAULT 'gpt-4o-mini', updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT ai_settings_workspace_key_unique UNIQUE (workspace_key))`);
    const result = await pool.query(`INSERT INTO stock_advisor.ai_settings (workspace_key, model, updated_at) VALUES ('owner', $1, now()) ON CONFLICT (workspace_key) DO UPDATE SET model = EXCLUDED.model, updated_at = now() RETURNING model`, [model]);
    return send(res, { ok: true, model: result.rows[0]?.model ?? model, persisted: true });
  } catch (error) {
    const classified = classifyPersistenceError(error);
    console.error("[api/ai/model] database persistence failed", classified.code, classified.message);
    return send(res, { error: classified.message, code: classified.code, model, persisted: false }, 503);
  } finally { await pool?.end().catch(() => undefined); }
}
