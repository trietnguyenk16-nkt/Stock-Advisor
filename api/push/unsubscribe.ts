type AnyRequest = { body?: unknown; json?: () => Promise<unknown> };
type AnyResponse = { statusCode?: number; setHeader?: (name: string, value: string) => void; status?: (code: number) => AnyResponse; json?: (value: unknown) => AnyResponse; end?: (body?: string) => void };
function send(res: AnyResponse | undefined, body: unknown, status = 200) {
  if (!res) return Response.json(body, { status });
  const text = JSON.stringify(body);
  res.setHeader?.("content-type", "application/json; charset=utf-8");
  const setStatus = res.status;
  const sendJson = res.json;
  if (setStatus && sendJson) { sendJson.call(setStatus(status), body); return; }
  res.statusCode = status;
  res.end?.(text);
}
async function getBody(req: AnyRequest) { if (req.body !== undefined) return typeof req.body === "string" ? JSON.parse(req.body) : req.body; if (req.json) try { return await req.json(); } catch {} return undefined; }

export default async function handler(req: AnyRequest, res?: AnyResponse) {
  const body = await getBody(req);
  if (!body?.endpoint) return send(res, { error: "Endpoint is required" }, 400);
  try {
    const { deletePushSubscription } = await import("../../server/db");
    await deletePushSubscription(body.endpoint);
    return send(res, { ok: true });
  } catch (error) {
    return send(res, { error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
}
