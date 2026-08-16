import { getConfiguredAiModel, AI_MODELS } from "../../server/openai";
import { getAiModel } from "../../server/db";
import { sendJson, type ApiRequest, type ApiResponse } from "../_lib/node";

export default async function handler(_req: ApiRequest, res: ApiResponse) {
  let model = getConfiguredAiModel();
  try {
    model = getConfiguredAiModel(await getAiModel());
  } catch (error) {
    console.warn("[api/ai/config] database fallback", error);
  }
  sendJson(res, { enabled: Boolean(process.env.OPENAI_API_KEY), model, models: AI_MODELS });
}
