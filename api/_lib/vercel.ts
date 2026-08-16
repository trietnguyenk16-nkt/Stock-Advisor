type AnyRequest = {
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  json?: () => Promise<unknown>;
};

type AnyResponse = {
  statusCode?: number;
  setHeader?: (name: string, value: string) => void;
  status?: (code: number) => AnyResponse;
  json?: (value: unknown) => AnyResponse;
  end?: (body?: string) => void;
};

export function getUrl(req: AnyRequest): URL {
  if (typeof req.url === "string") return new URL(req.url, "http://localhost");
  const url = new URL("http://localhost");
  for (const [key, value] of Object.entries(req.query ?? {})) {
    if (Array.isArray(value)) value.forEach((item) => item !== undefined && url.searchParams.append(key, item));
    else if (value !== undefined) url.searchParams.set(key, value);
  }
  return url;
}

export async function getBody(req: AnyRequest): Promise<any> {
  if (req.body !== undefined) {
    if (typeof req.body === "string") {
      try { return JSON.parse(req.body); } catch { return undefined; }
    }
    return req.body;
  }
  if (typeof req.json === "function") {
    try { return await req.json(); } catch { return undefined; }
  }
  return undefined;
}

export function send(res: AnyResponse | undefined, body: unknown, status = 200): Response | void {
  if (!res) return Response.json(body, { status, headers: { "cache-control": "no-store" } });
  const payload = JSON.stringify(body);
  try { res.setHeader?.("content-type", "application/json; charset=utf-8"); } catch {}
  if (typeof res.status === "function" && typeof res.json === "function") {
    res.status(status).json(body);
    return;
  }
  res.statusCode = status;
  res.end?.(payload);
}

export type { AnyRequest, AnyResponse };
