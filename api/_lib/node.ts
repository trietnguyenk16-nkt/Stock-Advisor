import type { IncomingMessage, ServerResponse } from "node:http";

export type ApiRequest = IncomingMessage & { body?: unknown; query?: Record<string, string | string[] | undefined> };
export type ApiResponse = ServerResponse;

export function sendJson(res: ApiResponse, data: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(data));
}

export async function readJson(req: ApiRequest): Promise<any> {
  if (req.body !== undefined) return req.body;
  if (req.method === "GET" || req.method === "HEAD") return {};
  return new Promise((resolve) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

export function requestUrl(req: ApiRequest) {
  const protocol = Array.isArray(req.headers["x-forwarded-proto"]) ? req.headers["x-forwarded-proto"][0] : req.headers["x-forwarded-proto"] ?? "https";
  const host = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host ?? "localhost";
  return new URL(req.url ?? "/", `${protocol}://${host}`);
}
