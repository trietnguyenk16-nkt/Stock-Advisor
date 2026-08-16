import { sendJson, readJson, type ApiRequest, type ApiResponse } from "../_lib/node";
import { universal } from "../_lib/universal";

async function handler(req: ApiRequest, res: ApiResponse) {
  const body = await readJson(req);
  if (!body?.endpoint) return sendJson(res, { error: "Endpoint is required" }, 400);
  try {
    const { deletePushSubscription } = await import("../../server/db");
    await deletePushSubscription(body.endpoint);
    return sendJson(res, { ok: true });
  } catch (error) {
    return sendJson(res, { error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
}

export default universal(handler);
