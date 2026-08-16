import { getConfiguredAiModel, AI_MODELS } from "../../server/openai";
import { getAiModel } from "../../server/db";
import { json } from "../_lib/direct";

export default async function handler() {
  let model = getConfiguredAiModel();
  try {
    model = getConfiguredAiModel(await getAiModel());
  } catch (error) {
    console.warn("[api/ai/config] database fallback", error);
  }
  return json({ enabled: Boolean(process.env.OPENAI_API_KEY), model, models: AI_MODELS });
}
