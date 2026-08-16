import { send, type AnyRequest, type AnyResponse } from "../_lib/vercel";

export default function handler(_req: AnyRequest, res?: AnyResponse) {
  return send(res, { enabled: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT), publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
}
