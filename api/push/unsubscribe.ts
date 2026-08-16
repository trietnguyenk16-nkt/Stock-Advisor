import { json, readJson, errorResponse } from "../_lib/direct";
import { withWebRequest } from "../_lib/vercel";

export default withWebRequest(async (request) => {
  const body = await readJson(request);
  if (!body?.endpoint) return json({ error: "Endpoint is required" }, 400);
  try {
    const { deletePushSubscription } = await import("../../server/db");
    await deletePushSubscription(body.endpoint);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
})
