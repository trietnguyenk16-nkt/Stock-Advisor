type AnyRequest = Record<string, unknown>;
type AnyResponse = { statusCode?: number; setHeader?: (name: string, value: string) => void; status?: (code: number) => AnyResponse; json?: (value: unknown) => AnyResponse; end?: (body?: string) => void };
function send(res: AnyResponse | undefined, body: unknown, status = 200) { if (!res) return Response.json(body, { status }); const text = JSON.stringify(body); res.setHeader?.("content-type", "application/json; charset=utf-8"); if (res.status && res.json) { res.status(status).json(body); return; } res.statusCode = status; res.end?.(text); }

export default function handler(_req: AnyRequest, res?: AnyResponse) {
  return send(res, { enabled: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT), publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
}
