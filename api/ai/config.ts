import { getConfiguredAiModel, AI_MODELS } from "../../server/openai";
import { sendJson, type ApiRequest, type ApiResponse } from "../_lib/node";
import { universal } from "../_lib/universal";

async function handler(_req: ApiRequest, res: ApiResponse) {
  let model = getConfiguredAiModel();
  try {
    const { getAiModel } = await import("../../server/db");
    model = getConfiguredAiModel(await getAiModel());
  } catch (error) {
    console.warn("[api/ai/config] database fallback", error);
  }
  sendJson(res, { enabled: Boolean(process.env.OPENAI_API_KEY), model, models: AI_MODELS });
}

export default universal(handler);
