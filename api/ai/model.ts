import { AI_MODELS } from "../../server/openai";
import { json, readJson, errorResponse } from "../_lib/direct";

export default async function handler(request: Request) {
  const body = await readJson(request);
  const model = body?.model;
  if (!AI_MODELS.includes(model)) return json({ error: "Model AI không được hỗ trợ" }, 400);
  try {
    const { setAiModel } = await import("../../server/db");
    const saved = await setAiModel(model);
    return json({ ok: Boolean(saved), model, persisted: Boolean(saved) });
  } catch (error) {
    return errorResponse(error);
  }
}
