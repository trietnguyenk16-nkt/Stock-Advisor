type AnyRequest = { method?: string; body?: unknown };
type AnyResponse = { status?: (code: number) => AnyResponse; json?: (body: unknown) => unknown; setHeader?: (name: string, value: string) => void; end?: (body?: string) => void };

type AnalysisResult = { signal: "BUY" | "SELL" | "HOLD"; summary: string; referencePrice: number; targetPrice: number; risk: string; confidence: number };

function send(res: AnyResponse | undefined, body: unknown, status = 200) {
  if (res?.status && res.json) return res.status(status).json(body);
  res?.setHeader?.("content-type", "application/json; charset=utf-8");
  res?.end?.(JSON.stringify(body));
  return body;
}

async function readBody(req: AnyRequest) {
  if (req.body && typeof req.body === "object") return req.body as Record<string, unknown>;
  return {};
}

function modelFrom(value: unknown) {
  return value === "gpt-5-mini" ? "gpt-5-mini" : "gpt-4o-mini";
}

async function analyze(model: string, asset: Record<string, unknown>, quote: Record<string, unknown>): Promise<AnalysisResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      ...(model === "gpt-5-mini" ? { reasoning_effort: "low" } : {}),
      messages: [
        { role: "system", content: "Bạn là trợ lý phân tích tài sản Việt Nam. Chỉ dùng dữ liệu được cung cấp, thận trọng, không khẳng định chắc chắn. Trả JSON đúng schema." },
        { role: "user", content: JSON.stringify({ asset, quote, instruction: "Chọn BUY, SELL hoặc HOLD. Nêu referencePrice, targetPrice, summary, risk và confidence từ 0 đến 1. Nếu thiếu cơ sở, chọn HOLD và nói rõ rủi ro." }) },
      ],
      response_format: { type: "json_schema", json_schema: { name: "manual_asset_analysis", strict: true, schema: { type: "object", properties: { signal: { type: "string", enum: ["BUY", "SELL", "HOLD"] }, summary: { type: "string" }, referencePrice: { type: "number" }, targetPrice: { type: "number" }, risk: { type: "string" }, confidence: { type: "number" } }, required: ["signal", "summary", "referencePrice", "targetPrice", "risk", "confidence"], additionalProperties: false } } },
    }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${text.slice(0, 300)}`);
  const payload = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI không trả nội dung phân tích");
  return JSON.parse(content) as AnalysisResult;
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
    const requestedModel = body.model;
    const settings = await pool.query("SELECT model FROM stock_advisor.ai_settings WHERE workspace_key='owner' LIMIT 1").catch(() => ({ rows: [] }));
    const model = modelFrom(requestedModel ?? settings.rows[0]?.model);
    const assets = (await pool.query(`SELECT ta.id, ta.ticker, ta.display_name, ta.asset_type, ta.currency, ps.price, ps.change_percent, ps.as_of FROM stock_advisor.tracked_assets ta LEFT JOIN LATERAL (SELECT price, change_percent, as_of FROM stock_advisor.price_snapshots WHERE asset_id=ta.id ORDER BY as_of DESC LIMIT 1) ps ON true WHERE ta.workspace_key='owner' AND ta.is_active=true ORDER BY ta.id`)).rows;
    const runKey = `manual-ai:${new Date().toISOString().slice(0, 16)}`;
    const results: Array<Record<string, unknown>> = [];
    const errors: string[] = [];
    for (const asset of assets) {
      if (asset.price === null || asset.price === undefined) { errors.push(`${asset.ticker}: chưa có giá có timestamp`); continue; }
      try {
        const result = await analyze(model, asset, { price: Number(asset.price), changePercent: asset.change_percent === null ? null : Number(asset.change_percent), asOf: asset.as_of });
        await pool.query(`INSERT INTO stock_advisor.asset_analyses (asset_id, run_key, signal, summary, reference_price, target_price, risk, confidence, as_of) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (run_key, asset_id) DO UPDATE SET signal=EXCLUDED.signal, summary=EXCLUDED.summary, reference_price=EXCLUDED.reference_price, target_price=EXCLUDED.target_price, risk=EXCLUDED.risk, confidence=EXCLUDED.confidence, as_of=EXCLUDED.as_of`, [asset.id, runKey, result.signal, result.summary, result.referencePrice, result.targetPrice, result.risk, result.confidence, Date.now()]);
        results.push({ ticker: asset.ticker, ...result });
      } catch (error) { errors.push(`${asset.ticker}: ${error instanceof Error ? error.message : String(error)}`); }
    }
    return send(res, { ok: results.length > 0, status: errors.length && !results.length ? "failed" : errors.length ? "partial" : "success", model, analyzed: results.length, skipped: assets.length - results.length, results, errors }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return send(res, { ok: false, status: "failed", code: /permission|denied/i.test(message) ? "SCHEMA_PERMISSION_DENIED" : "AI_ANALYSIS_FAILED", message }, 200);
  } finally { await pool?.end().catch(() => undefined); }
}
