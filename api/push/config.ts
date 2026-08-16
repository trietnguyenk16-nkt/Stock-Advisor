import { sendJson, type ApiRequest, type ApiResponse } from "../_lib/node";

export default async function handler(_req: ApiRequest, res: ApiResponse) {
  sendJson(res, { enabled: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT), publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
}
