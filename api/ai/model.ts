type AnyRequest = { body?: unknown; json?: () => Promise<unknown> };
type AnyResponse = { statusCode?: number; setHeader?: (name: string, value: string) => void; status?: (code: number) => AnyResponse; json?: (value: unknown) => AnyResponse; end?: (body?: string) => void };
const AI_MODELS = ["gpt-4o-mini", "gpt-5-mini"] as const;
function send(res: AnyResponse | undefined, body: unknown, status = 200) { if (!res) return Response.json(body, { status }); const text = JSON.stringify(body); res.setHeader?.("content-type", "application/json; charset=utf-8"); if (res.status && res.json) { res.status(status).json(body); return; } res.statusCode = status; res.end?.(text); }
async function getBody(req: AnyRequest) { if (req.body !== undefined) return typeof req.body === "string" ? JSON.parse(req.body) : req.body; if (req.json) try { return await req.json(); } catch {} return undefined; }

export default async function handler(req: AnyRequest, res?: AnyResponse) {
  const body = await getBody(req);
  const model = body?.model;
  if (!AI_MODELS.includes(model)) return send(res, { error: "Model AI không được hỗ trợ" }, 400);
  try {
    const { setAiModel } = await import("../../server/db");
    const saved = await setAiModel(model);
    return send(res, { ok: Boolean(saved), model, persisted: Boolean(saved) });
  } catch (error) {
    return send(res, { error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
}
