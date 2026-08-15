import { useEffect, useState } from "react";
import { Download, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  if (offline) {
    return <div className="pwa-status pwa-status-offline" role="status"><WifiOff size={15} /> <span>Đang ngoại tuyến · dữ liệu có thể đã cũ</span></div>;
  }
  if (!installEvent || dismissed) return null;
  return <div className="pwa-status pwa-status-install" role="status"><Download size={15} /><span>Cài Lumen vào điện thoại để mở nhanh hơn.</span><Button size="sm" onClick={install}>Cài app</Button><button className="pwa-dismiss" aria-label="Đóng thông báo cài app" onClick={() => setDismissed(true)}><X size={15} /></button></div>;
}
