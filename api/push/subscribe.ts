import { json, readJson, errorResponse } from "../_lib/direct";

export default async function handler(request: Request) {
  const body = await readJson(request);
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) return json({ error: "Invalid push subscription" }, 400);
  try {
    const { upsertPushSubscription } = await import("../../server/db");
    await upsertPushSubscription({ endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth });
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
