import { json } from "../_lib/direct";

export default async function handler() {
  return json({ enabled: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT), publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
}
