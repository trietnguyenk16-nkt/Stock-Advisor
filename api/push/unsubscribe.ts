import { json, readJson, errorResponse } from "../_lib/direct";

export default async function handler(request: Request) {
  const body = await readJson(request);
  if (!body?.endpoint) return json({ error: "Endpoint is required" }, 400);
  try {
    const { deletePushSubscription } = await import("../../server/db");
    await deletePushSubscription(body.endpoint);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
