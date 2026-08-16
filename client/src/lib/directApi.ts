export type AiConfig = { enabled: boolean; model: "gpt-4o-mini" | "gpt-5-mini"; models: readonly string[] };
export type Quote = { ticker: string; name: string; currency: string; price?: number; change?: number; asOf: string; source: string };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error ?? `API request failed: ${response.status}`);
  return body as T;
}

export const directApi = {
  aiConfig: () => requestJson<AiConfig>("/api/ai/config"),
  saveAiModel: (model: AiConfig["model"]) => requestJson<{ ok: boolean; model: AiConfig["model"]; persisted: boolean }>("/api/ai/model", { method: "POST", body: JSON.stringify({ model }) }),
  quote: (ticker: string) => requestJson<Quote>(`/api/market/quote?ticker=${encodeURIComponent(ticker)}`),
  sync: () => requestJson<{ status?: string; message?: string }>("/api/market/sync", { method: "POST" }),
  history: () => requestJson<{ syncRuns: any[]; emailDeliveries: any[] }>("/api/market/history"),
  pushConfig: () => requestJson<{ enabled: boolean; publicKey: string | null }>("/api/push/config"),
  pushSubscribe: (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) => requestJson<{ ok: boolean }>("/api/push/subscribe", { method: "POST", body: JSON.stringify(subscription) }),
  pushUnsubscribe: (endpoint: string) => requestJson<{ ok: boolean }>("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) }),
  addAsset: (asset: { ticker: string; displayName: string; assetType: "equity" | "fund" | "gold"; providerCode: string }) => requestJson<{ ok: boolean; asset: unknown }>("/api/market/assets", { method: "POST", body: JSON.stringify(asset) }),
  removeAsset: (ticker: string) => requestJson<{ ok: boolean }>(`/api/market/assets?ticker=${encodeURIComponent(ticker)}`, { method: "DELETE" }),
};
