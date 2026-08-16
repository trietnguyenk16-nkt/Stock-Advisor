import type { IncomingMessage, ServerResponse } from "node:http";
import { errorResponse } from "./direct";

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join(", ") : value;
}

export function withWebRequest(handler: (request: Request) => Promise<Response> | Response) {
  return async (req: IncomingMessage & { body?: unknown } | Request, res?: ServerResponse) => {
    if (!res && req instanceof Request) return handler(req);
    if (!res) throw new Error("Vercel response object is missing");
    try {
      const protocol = headerValue(req.headers["x-forwarded-proto"]) ?? "https";
      const host = headerValue(req.headers.host) ?? "localhost";
      const url = new URL(req.url ?? "/", `${protocol}://${host}`);
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) headers.set(key, headerValue(value)!);
      }
      let body: string | undefined;
      if (req.method !== "GET" && req.method !== "HEAD") {
        if (typeof req.body === "string") body = req.body;
        else if (req.body !== undefined) body = JSON.stringify(req.body);
      }
      const request = new Request(url, { method: req.method ?? "GET", headers, body });
      const response = await handler(request);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      const response = errorResponse(error);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await response.arrayBuffer()));
    }
  };
}
