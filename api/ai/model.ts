import { getBody, send, type AnyRequest, type AnyResponse } from "../_lib/vercel";

const AI_MODELS = ["gpt-4o-mini", "gpt-5-mini"] as const;

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
