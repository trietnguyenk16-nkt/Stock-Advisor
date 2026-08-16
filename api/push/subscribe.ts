import { sendJson, readJson, type ApiRequest, type ApiResponse } from "../_lib/node";
import { universal } from "../_lib/universal";

async function handler(req: ApiRequest, res: ApiResponse) {
  const body = await readJson(req);
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) return sendJson(res, { error: "Invalid push subscription" }, 400);
  try {
    const { upsertPushSubscription } = await import("../../server/db");
    await upsertPushSubscription({ endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth });
    return sendJson(res, { ok: true });
  } catch (error) {
    return sendJson(res, { error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
}

export default universal(handler);
