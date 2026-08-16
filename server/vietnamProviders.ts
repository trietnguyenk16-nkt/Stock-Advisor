import crypto from "node:crypto";
import type { TrackedAsset } from "../drizzle/schema";

export type VietnamQuote = {
  price?: number;
  bid?: number;
  ask?: number;
  changePercent?: number;
  asOf: number;
  sourceName: string;
  sourceUrl: string;
  freshness: "live" | "delayed" | "eod" | "unknown";
  warning?: string;
};

export type VietnamNews = { fingerprint: string; title: string; sourceName: string; sourceUrl: string; snippet?: string; publishedAt?: number };

const USER_AGENT = "LumenPersonalDesk/1.0 (+Vietnam personal research tool)";
const GOLD_SOURCES = [
  { name: "SJC", url: "https://sjc.com.vn/", label: "Vàng SJC 1L" },
  { name: "PNJ", url: "https://www.pnj.com.vn/site/gia-vang", label: "Vàng miếng SJC" },
  { name: "DOJI", url: "https://doji.vn/", label: "SJC" },
] as const;

export function parseVietnamNumber(value: string): number | undefined {
  const cleaned = value.replace(/[^0-9,.-]/g, "").trim();
  if (!cleaned) return undefined;
  const sign = cleaned.startsWith("-") ? "-" : "";
  const unsigned = cleaned.replace(/^-/, "");
  let normalized: string;
  if (unsigned.includes(",") && unsigned.includes(".")) {
    normalized = unsigned.lastIndexOf(",") > unsigned.lastIndexOf(".")
      ? unsigned.replace(/\./g, "").replace(",", ".")
      : unsigned.replace(/,/g, "");
  } else if (unsigned.includes(",")) {
    normalized = unsigned.replace(/,/g, ".");
  } else if (/^\d+\.\d{3}$/.test(unsigned)) {
    normalized = unsigned.replace(".", "");
  } else {
    normalized = unsigned;
  }
  const parsed = Number(`${sign}${normalized}`);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function fetchText(url: string) {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${url}`);
  return response.text();
}

function extractAround(html: string, label: string) {
  const index = html.toLowerCase().indexOf(label.toLowerCase());
  return index >= 0 ? html.slice(index, index + 1200) : "";
}

async function fetchGoldQuote(asset: TrackedAsset): Promise<VietnamQuote> {
  const errors: string[] = [];
  try {
    const url = "https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price?zone=00";
    const response = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "application/json" } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const payload = await response.json() as any;
    const sjc = (payload?.data ?? []).find((row: any) => String(row?.masp ?? "").toUpperCase() === "SJC");
    const bid = Number(sjc?.giamua); const ask = Number(sjc?.giaban);
    if (!Number.isFinite(bid) || !Number.isFinite(ask)) throw new Error("PNJ không trả về dòng SJC hợp lệ");
    return { bid: bid * 1000, ask: ask * 1000, price: ask * 1000, asOf: Date.now(), sourceName: "PNJ SJC API", sourceUrl: url, freshness: "live", warning: "Giá SJC lấy từ endpoint công khai của PNJ, zone 00." };
  } catch (error) { errors.push(`PNJ API: ${error instanceof Error ? error.message : String(error)}`); }
  for (const source of GOLD_SOURCES) {
    try {
      const html = await fetchText(source.url);
      const block = extractAround(html, asset.providerCode || source.label);
      const prices = Array.from(block.matchAll(/(?:buy|sell|mua vào|bán ra|mua|bán)[^0-9]{0,100}([0-9][0-9.,]*)/gi)).map((match) => parseVietnamNumber(match[1] ?? "")).filter((value): value is number => value !== undefined);
      if (prices.length < 2) throw new Error(`Không parse được bid/ask từ ${source.name}`);
      const now = Date.now();
      return { bid: prices[0] * 1000, ask: prices[1] * 1000, price: prices[1] * 1000, asOf: now, sourceName: source.name, sourceUrl: source.url, freshness: "unknown", warning: `Giá đọc từ bảng công khai ${source.name}; cần kiểm tra timestamp trên nguồn.` };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`Không lấy được giá vàng từ SJC/PNJ/DOJI: ${errors.join(" | ")}`);
}

async function fetchFundNav(asset: TrackedAsset): Promise<VietnamQuote> {
  const url = `https://cafef.vn/du-lieu/chung-chi-quy/${encodeURIComponent(asset.providerCode)}.chn`;
  const html = await fetchText(url);
  const match = html.match(/Giá\s*NAV[^:]{0,120}:\s*([0-9][0-9.,]*)/i) ?? html.match(/NAV[^:]{0,120}:\s*([0-9][0-9.,]*)/i);
  const nav = match ? parseVietnamNumber(match[1] ?? "") : undefined;
  if (nav === undefined) throw new Error(`Không parse được NAV cho ${asset.ticker}`);
  return { price: nav, asOf: Date.now(), sourceName: "CafeF fund data", sourceUrl: url, freshness: "eod", warning: "NAV quỹ được định giá theo lịch của quỹ, không phải giá realtime." };
}

async function fetchEquityQuote(asset: TrackedAsset): Promise<VietnamQuote> {
  const url = asset.exchange === "HNX" || asset.exchange === "UPCOM" ? "https://hnx.vn/co-phieu.html" : "https://www.hsx.vn/";
  const html = await fetchText(url);
  const tickerIndex = html.toUpperCase().indexOf(asset.ticker.toUpperCase());
  if (tickerIndex < 0) throw new Error(`Nguồn ${asset.exchange ?? "VN"} không trả về mã ${asset.ticker}`);
  const block = html.slice(tickerIndex, tickerIndex + 900);
  const numbers = Array.from(block.matchAll(/([0-9][0-9.,]*)/g)).map((match) => parseVietnamNumber(match[1] ?? "")).filter((value): value is number => value !== undefined);
  if (!numbers.length) throw new Error(`Không parse được giá cho ${asset.ticker}`);
  return { price: numbers[0], changePercent: numbers[1], asOf: Date.now(), sourceName: asset.exchange === "HNX" || asset.exchange === "UPCOM" ? "HNX" : "HOSE", sourceUrl: url, freshness: "delayed", warning: "Nguồn công khai có thể có độ trễ và cấu trúc HTML có thể thay đổi." };
}

export async function fetchVietnamQuote(asset: TrackedAsset): Promise<VietnamQuote> {
  if (asset.assetType === "gold") return fetchGoldQuote(asset);
  if (asset.assetType === "fund") return fetchFundNav(asset);
  return fetchEquityQuote(asset);
}

export async function fetchVietnamNews(asset: TrackedAsset): Promise<VietnamNews[]> {
  const query = encodeURIComponent(`${asset.ticker} ${asset.displayName}`);
  const url = `https://cafef.vn/tim-kiem.chn?keywords=${query}`;
  try {
    const html = await fetchText(url);
    const matches = Array.from(html.matchAll(/href=["']([^"']+)["'][^>]*>([^<]{20,220})</gi)).slice(0, 5);
    return matches.map((match) => {
      const sourceUrl = new URL(match[1] ?? "", "https://cafef.vn").toString();
      const title = (match[2] ?? "").replace(/\s+/g, " ").trim();
      return { fingerprint: crypto.createHash("sha256").update(sourceUrl).digest("hex"), title, sourceName: "CafeF", sourceUrl, publishedAt: undefined };
    });
  } catch {
    return [];
  }
}
