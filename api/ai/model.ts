type AnyRequest = { body?: unknown; json?: () => Promise<unknown>; on?: (event: string, listener: (...args: any[]) => void) => AnyRequest };
type AnyResponse = { statusCode?: number; setHeader?: (name: string, value: string) => void; status?: (code: number) => AnyResponse; json?: (value: unknown) => AnyResponse; end?: (body?: string) => void };
const AI_MODELS = ["gpt-4o-mini", "gpt-5-mini"] as const;
function send(res: AnyResponse | undefined, body: unknown, status = 200) { if (!res) return Response.json(body, { status }); const text = JSON.stringify(body); res.setHeader?.("content-type", "application/json; charset=utf-8"); if (res.status && res.json) { res.status(status).json(body); return; } res.statusCode = status; res.end?.(text); }
async function getBody(req: AnyRequest) { if (req.body !== undefined) return typeof req.body === "string" ? JSON.parse(req.body) : req.body; if (req.json) try { return await req.json(); } catch {} if (req.on) return await new Promise((resolve) => { let raw = ""; req.on?.("data", (chunk: Buffer | string) => { raw += chunk.toString(); }); req.on?.("end", () => { try { resolve(raw ? JSON.parse(raw) : undefined); } catch { resolve(undefined); } }); req.on?.("error", () => resolve(undefined)); }); return undefined; }

export default async function handler(req: AnyRequest, res?: AnyResponse) {
  const body = await getBody(req);
  const model = body?.model;
  if (!AI_MODELS.includes(model)) return send(res, { error: "Model AI không được hỗ trợ" }, 400);
  try {
    const { setAiModel } = await import("../../server/db");
    const saved = await setAiModel(model);
    if (!saved) return send(res, { error: "Database chưa sẵn sàng để lưu model", code: "DATABASE_UNAVAILABLE", model, persisted: false }, 503);
    return send(res, { ok: true, model, persisted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return send(res, { error: message, code: "MODEL_PERSIST_FAILED", model, persisted: false }, 503);
  }
}
