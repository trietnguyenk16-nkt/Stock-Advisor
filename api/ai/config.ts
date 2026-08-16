import { send, type AnyRequest, type AnyResponse } from "../_lib/vercel";

const AI_MODELS = ["gpt-4o-mini", "gpt-5-mini"] as const;
const DEFAULT_MODEL = "gpt-4o-mini";

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
