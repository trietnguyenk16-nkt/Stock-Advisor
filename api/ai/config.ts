type AnyRequest = { method?: string; url?: string; body?: unknown; json?: () => Promise<unknown> };
type AnyResponse = { statusCode?: number; setHeader?: (name: string, value: string) => void; status?: (code: number) => AnyResponse; json?: (value: unknown) => AnyResponse; end?: (body?: string) => void };
const AI_MODELS = ["gpt-4o-mini", "gpt-5-mini"] as const;
const DEFAULT_MODEL = "gpt-4o-mini";
function send(res: AnyResponse | undefined, body: unknown, status = 200) { if (!res) return Response.json(body, { status }); const text = JSON.stringify(body); res.setHeader?.("content-type", "application/json; charset=utf-8"); if (res.status && res.json) { res.status(status).json(body); return; } res.statusCode = status; res.end?.(text); }

export default async function handler(req: AnyRequest, res?: AnyResponse) {
  void req;
  let model: (typeof AI_MODELS)[number] = DEFAULT_MODEL;
  try {
    const { getAiModel } = await import("../../server/db");
    const configured = await getAiModel();
    if (AI_MODELS.includes(configured as (typeof AI_MODELS)[number])) model = configured as (typeof AI_MODELS)[number];
  } catch (error) {
    console.warn("[api/ai/config] database fallback", error instanceof Error ? error.message : error);
  }
  return send(res, { enabled: Boolean(process.env.OPENAI_API_KEY), model, models: AI_MODELS });
}
