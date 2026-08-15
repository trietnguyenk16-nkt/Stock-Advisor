import { useEffect, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

function encodeKey(value: ArrayBuffer | null) {
  return value ? btoa(String.fromCharCode(...Array.from(new Uint8Array(value)))) : "";
}

function decodeKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export default function PushNotificationCard() {
  const config = trpc.push.config.useQuery();
  const subscribe = trpc.push.subscribe.useMutation();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) setPermission("unsupported");
    else setPermission(Notification.permission);
  }, []);

  const enable = async () => {
    if (!config.data?.enabled || !config.data.publicKey) return;
    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    if (nextPermission !== "granted") return;
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(config.data.publicKey) });
    await subscribe.mutateAsync({ endpoint: subscription.endpoint, keys: { p256dh: encodeKey(subscription.getKey("p256dh")), auth: encodeKey(subscription.getKey("auth")) } });
    setEnabled(true);
  };

  return <Card className="dashboard-card"><CardHeader className="px-5 pb-3 pt-5"><CardTitle className="flex items-center gap-2 text-base"><Bell size={16} />Cảnh báo trên điện thoại</CardTitle></CardHeader><CardContent className="px-5 pb-5"><p className="text-xs leading-5 text-[#69776f]">Nhận thông báo khi giá và phân tích AI được đồng bộ.</p>{permission === "unsupported" ? <p className="mt-3 text-xs text-[#a15c52]">Trình duyệt này chưa hỗ trợ Push Notification.</p> : <Button onClick={enable} disabled={enabled || subscribe.isPending || !config.data?.enabled} className="mt-4 min-h-11 rounded-xl bg-[#173c2b] hover:bg-[#24543e]">{subscribe.isPending ? <Loader2 className="mr-2 animate-spin" size={15} /> : enabled ? <Check className="mr-2" size={15} /> : <Bell className="mr-2" size={15} />}{enabled ? "Đã bật thông báo" : config.data?.enabled ? "Bật thông báo" : "Chưa cấu hình VAPID"}</Button>}</CardContent></Card>;
}
