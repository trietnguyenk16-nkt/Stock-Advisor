import { AI_MODELS } from "../../server/openai";
import { sendJson, readJson, type ApiRequest, type ApiResponse } from "../_lib/node";
import { universal } from "../_lib/universal";

async function handler(req: ApiRequest, res: ApiResponse) {
  const body = await readJson(req);
  const model = body?.model;
  if (!AI_MODELS.includes(model)) return sendJson(res, { error: "Model AI không được hỗ trợ" }, 400);
  try {
    const { setAiModel } = await import("../../server/db");
    const saved = await setAiModel(model);
    return sendJson(res, { ok: Boolean(saved), model, persisted: Boolean(saved) });
  } catch (error) {
    return sendJson(res, { error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
}

export default universal(handler);
