type AnyRequest = { method?: string; url?: string; body?: unknown; json?: () => Promise<unknown> };
type AnyResponse = { statusCode?: number; setHeader?: (name: string, value: string) => void; status?: (code: number) => AnyResponse; json?: (value: unknown) => AnyResponse; end?: (body?: string) => void };
const AI_MODELS = ["gpt-4o-mini", "gpt-5-mini"] as const;
const DEFAULT_MODEL = "gpt-4o-mini";
function send(res: AnyResponse | undefined, body: unknown, status = 200) { if (!res) return Response.json(body, { status }); const text = JSON.stringify(body); res.setHeader?.("content-type", "application/json; charset=utf-8"); if (res.status && res.json) { res.status(status).json(body); return; } res.statusCode = status; res.end?.(text); }

export default async function handler(req: AnyRequest, res?: AnyResponse) {
  void req;
  let model: (typeof AI_MODELS)[number] = DEFAULT_MODEL;
  try {
    const connectionString = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
    if (connectionString) {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: connectionString.replace(/([?&])sslmode=[^&]*/i, "$1").replace(/[?&]$/, ""), ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 10_000 });
      try {
        const result = await pool.query(`SELECT model FROM stock_advisor.ai_settings WHERE workspace_key = 'owner' LIMIT 1`);
        if (AI_MODELS.includes(result.rows[0]?.model)) model = result.rows[0].model;
      } finally { await pool.end().catch(() => undefined); }
    }
    return send(res, { enabled: Boolean(process.env.OPENAI_API_KEY), model, models: AI_MODELS });
  } catch (error) {
    console.warn("[api/ai/config] database fallback", error instanceof Error ? error.message : error);
    return send(res, { enabled: Boolean(process.env.OPENAI_API_KEY), model, models: AI_MODELS });
  }
}
