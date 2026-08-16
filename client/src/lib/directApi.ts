export type AiConfig = { enabled: boolean; model: "gpt-4o-mini" | "gpt-5-mini"; models: readonly string[] };
export type Quote = { ticker: string; name: string; currency: string; price?: number; change?: number; asOf: string; source: string };
export type PortfolioAnalysis = { ticker: string; name: string; signal: "BUY" | "SELL" | "HOLD"; summary: string; referencePrice: number; targetPrice: number; risk: string; confidence: number; news: Array<{ title: string; publisher: string; link: string; publishedAt: string | null }> };
export type AiAnalysisResponse = { ok?: boolean; status?: string; model?: AiConfig["model"]; analyzed?: number; skipped?: number; results?: PortfolioAnalysis[]; errors?: string[] };

export function normalizeAiAnalysisResponse(payload: AiAnalysisResponse, fallbackModel: AiConfig["model"], assetCount: number) {
  const results = Array.isArray(payload.results) ? payload.results : [];
  const analyzed = Number.isFinite(Number(payload.analyzed)) ? Number(payload.analyzed) : results.length;
  const skipped = Number.isFinite(Number(payload.skipped)) ? Number(payload.skipped) : Math.max(0, assetCount - analyzed);
  return { results, analyzed, skipped, model: payload.model || fallbackModel };
}

export const SYNC_COMPLETE_EVENT = "stock-advisor-sync-complete";

export function subscribeToSyncComplete(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(SYNC_COMPLETE_EVENT, callback);
  return () => window.removeEventListener(SYNC_COMPLETE_EVENT, callback);
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error ?? `API request failed: ${response.status}`);
  return body as T;
}

export const directApi = {
  aiConfig: () => requestJson<AiConfig>("/api/ai/config"),
  saveAiModel: (model: AiConfig["model"]) => requestJson<{ ok: boolean; model: AiConfig["model"]; persisted: boolean }>("/api/ai/model", { method: "POST", body: JSON.stringify({ model }) }),
  analyzeAi: (model?: AiConfig["model"]) => requestJson<AiAnalysisResponse>("/api/ai/analyze", { method: "POST", body: JSON.stringify(model ? { model } : {}) }),
  quote: (ticker: string) => requestJson<Quote>(`/api/market/quote?ticker=${encodeURIComponent(ticker)}`),
  sync: () => requestJson<{ status?: string; message?: string }>("/api/market/sync", { method: "POST" }),
  history: () => requestJson<{ syncRuns: any[]; emailDeliveries: any[] }>("/api/market/history"),
  pushConfig: () => requestJson<{ enabled: boolean; publicKey: string | null }>("/api/push/config"),
  pushSubscribe: (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) => requestJson<{ ok: boolean }>("/api/push/subscribe", { method: "POST", body: JSON.stringify(subscription) }),
  pushUnsubscribe: (endpoint: string) => requestJson<{ ok: boolean }>("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) }),
  addAsset: (asset: { ticker: string; displayName: string; assetType: "equity" | "fund" | "gold"; providerCode: string }) => requestJson<{ ok: boolean; asset: unknown }>("/api/market/assets", { method: "POST", body: JSON.stringify(asset) }),
  removeAsset: (ticker: string) => requestJson<{ ok: boolean }>(`/api/market/assets?ticker=${encodeURIComponent(ticker)}`, { method: "DELETE" }),
};
