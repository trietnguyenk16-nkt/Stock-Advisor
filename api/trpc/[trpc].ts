import { getAiModel, setAiModel } from "../../server/db";
import { getConfiguredAiModel, AI_MODELS } from "../../server/openai";

export const config = { api: { bodyParser: false } };

type ProcedureInput = { json?: unknown };

function parseInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return undefined;
  return (raw as ProcedureInput).json;
}

function readBatchInput(request: Request): Record<string, ProcedureInput> {
  const url = new URL(request.url);
  try {
    return JSON.parse(url.searchParams.get("input") ?? "{}") as Record<string, ProcedureInput>;
  } catch {
    return {};
  }
}

async function readBodyInput(request: Request): Promise<Record<string, ProcedureInput>> {
  try {
    const body = await request.json() as Record<string, ProcedureInput>;
    return body;
  } catch {
    return {};
  }
}

function ok(value: unknown) {
  return { result: { data: { json: value } } };
}

function fail(error: unknown) {
  return { error: { json: { message: error instanceof Error ? error.message : String(error), code: "INTERNAL_SERVER_ERROR" } } };
}

async function quote(ticker: string) {
  const normalized = ticker.trim().toUpperCase();
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalized)}?range=5d&interval=1d`, {
    headers: { accept: "application/json", "user-agent": "LumenPersonalDesk/1.0" },
  });
  if (!response.ok) throw new Error(`Market data request failed: ${response.status}`);
  const payload = await response.json() as any;
  const result = payload.chart?.result?.[0];
  if (!result) throw new Error(`Không tìm thấy dữ liệu cho ${normalized}`);
  const meta = result.meta ?? {};
  const closes = (result.indicators?.quote?.[0]?.close ?? []).filter((value: unknown): value is number => typeof value === "number");
  const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : closes.at(-1);
  const previous = typeof meta.previousClose === "number" ? meta.previousClose : closes.at(-2);
  const change = price !== undefined && previous ? ((price - previous) / previous) * 100 : undefined;
  return { ticker: normalized, name: meta.longName ?? meta.shortName ?? normalized, currency: meta.currency ?? "", price, change, asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(), source: "Yahoo Finance public chart endpoint" };
}

async function dispatch(path: string, input: unknown) {
  if (path === "ai.config") {
    return { enabled: Boolean(process.env.OPENAI_API_KEY), model: getConfiguredAiModel(await getAiModel()), models: AI_MODELS };
  }
  if (path === "ai.setModel") {
    const model = (input as { model?: string } | undefined)?.model ?? "";
    if (!AI_MODELS.includes(model as (typeof AI_MODELS)[number])) throw new Error("Model AI không được hỗ trợ");
    const saved = await setAiModel(model);
    return { ok: Boolean(saved), model };
  }
  if (path === "market.quote") {
    return quote(String((input as { ticker?: string } | undefined)?.ticker ?? ""));
  }
  if (path === "market.syncNow") {
    const { syncMarket } = await import("../../server/syncMarket");
    return syncMarket(`manual:${new Date().toISOString().slice(0, 16)}`);
  }
  if (path === "market.history") {
    const { getEmailHistory, getSyncHistory } = await import("../../server/db");
    return { syncRuns: await getSyncHistory(30), emailDeliveries: await getEmailHistory(30) };
  }
  if (path === "push.config") {
    return { enabled: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT), publicKey: process.env.VAPID_PUBLIC_KEY ?? null };
  }
  if (path === "push.subscribe") {
    const { upsertPushSubscription } = await import("../../server/db");
    const value = input as { endpoint: string; keys: { p256dh: string; auth: string } };
    await upsertPushSubscription({ endpoint: value.endpoint, p256dh: value.keys.p256dh, auth: value.keys.auth });
    return { ok: true };
  }
  if (path === "push.unsubscribe") {
    const { deletePushSubscription } = await import("../../server/db");
    await deletePushSubscription(String((input as { endpoint?: string } | undefined)?.endpoint ?? ""));
    return { ok: true };
  }
  throw new Error(`Procedure không được hỗ trợ trên Vercel: ${path}`);
}

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const paths = url.pathname.split("/").filter(Boolean).pop()?.split(",") ?? [];
  const batch = url.searchParams.get("batch") === "1";
  const inputs = request.method === "GET" ? readBatchInput(request) : await readBodyInput(request);
  const results = await Promise.all(paths.map(async (path, index) => {
    try {
      return ok(await dispatch(path, parseInput(inputs[String(index)])));
    } catch (error) {
      return fail(error);
    }
  }));
  return Response.json(batch || paths.length > 1 ? results : results[0]);
}
