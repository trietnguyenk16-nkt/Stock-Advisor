import { getConfiguredAiModel, AI_MODELS } from "../../server/openai";
import { getAiModel } from "../../server/db";
import { json } from "../_lib/direct";
import { withWebRequest } from "../_lib/vercel";

export default withWebRequest(async () => {
  let model = getConfiguredAiModel();
  try {
    model = getConfiguredAiModel(await getAiModel());
  } catch (error) {
    console.warn("[api/ai/config] database fallback", error);
  }
  return json({ enabled: Boolean(process.env.OPENAI_API_KEY), model, models: AI_MODELS });
})
