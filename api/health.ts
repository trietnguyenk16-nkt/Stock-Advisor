type AnyRequest = { method?: string };
type AnyResponse = { status?: (code: number) => AnyResponse; json?: (body: unknown) => unknown; setHeader?: (name: string, value: string) => void; end?: (body?: string) => void };

function send(res: AnyResponse | undefined, body: unknown, status = 200) {
  if (res?.status && res.json) return res.status(status).json(body);
  res?.setHeader?.("content-type", "application/json; charset=utf-8");
  res?.setHeader?.("cache-control", "no-store");
  res?.end?.(JSON.stringify(body));
  return body;
}

export default function handler(req: AnyRequest, res?: AnyResponse) {
  if (req.method && req.method !== "GET") return send(res, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  return send(res, {
    ok: true,
    service: "stock-advisor",
    status: "ready",
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    timestamp: new Date().toISOString(),
  });
}
