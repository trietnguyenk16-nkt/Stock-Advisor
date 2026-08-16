import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson, type ApiRequest, type ApiResponse } from "./node";

function isWebRequest(value: unknown): value is Request {
  const candidate = value as { url?: unknown; method?: unknown; headers?: unknown; json?: unknown } | null;
  return Boolean(candidate && typeof candidate.url === "string" && typeof candidate.method === "string" && candidate.headers && typeof candidate.json === "function");
}

export function universal(handler: (req: ApiRequest, res: ApiResponse) => Promise<void> | void) {
  return async (request: IncomingMessage | Request, response?: ServerResponse) => {
    if (response) return handler(request as ApiRequest, response);

    if (!isWebRequest(request)) {
      throw new Error("Vercel response object is missing");
    }

    const webRequest = request;
    let body: unknown;
    if (webRequest.method !== "GET" && webRequest.method !== "HEAD") {
      try { body = await webRequest.clone().json(); } catch { body = undefined; }
    }
    const req = {
      method: webRequest.method,
      url: webRequest.url,
      headers: Object.fromEntries(webRequest.headers.entries()),
      body,
    } as unknown as ApiRequest;

    let statusCode = 200;
    const headers = new Map<string, string>();
    let output = "";
    const res = {
      get statusCode() { return statusCode; },
      set statusCode(value: number) { statusCode = value; },
      setHeader(key: string, value: string) { headers.set(key, value); },
      end(value?: string | Uint8Array) { output = typeof value === "string" ? value : value ? new TextDecoder().decode(value) : ""; },
    } as unknown as ApiResponse;

    await handler(req, res);
    const responseHeaders = new Headers(headers);
    if (!responseHeaders.has("content-type")) responseHeaders.set("content-type", "application/json; charset=utf-8");
    return new Response(output, { status: statusCode, headers: responseHeaders });
  };
}
