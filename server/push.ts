import { deletePushSubscription, getPushSubscriptions } from "./db";

export function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

function configure(webpush: { setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void }) {
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  return true;
}

export function getPushConfig() {
  return { enabled: isPushConfigured(), publicKey: process.env.VAPID_PUBLIC_KEY ?? null };
}

export async function sendPushNotification(title: string, body: string, url = "/") {
  if (!isPushConfigured()) return { status: "skipped" as const, sent: 0 };
  let webpush: { setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void; sendNotification: (subscription: unknown, payload: string) => Promise<unknown> };
  try {
    const module = await import("web-push");
    webpush = ((module as unknown as { default?: unknown }).default ?? module) as typeof webpush;
    if (!configure(webpush)) return { status: "skipped" as const, sent: 0 };
  } catch (error) {
    console.warn("[Push] web-push unavailable", error instanceof Error ? error.message : error);
    return { status: "skipped" as const, sent: 0 };
  }
  const subscriptions = await getPushSubscriptions();
  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title, body, url }));
      sent += 1;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) await deletePushSubscription(subscription.endpoint);
    }
  }
  return { status: "sent" as const, sent };
}
