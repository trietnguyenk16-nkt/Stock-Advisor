type AnyRequest = Record<string, unknown>;
type AnyResponse = { statusCode?: number; setHeader?: (name: string, value: string) => void; status?: (code: number) => AnyResponse; json?: (value: unknown) => AnyResponse; end?: (body?: string) => void };
function send(res: AnyResponse | undefined, body: unknown, status = 200) { if (!res) return Response.json(body, { status }); const text = JSON.stringify(body); res.setHeader?.("content-type", "application/json; charset=utf-8"); if (res.status && res.json) { res.status(status).json(body); return; } res.statusCode = status; res.end?.(text); }

export default async function handler(_req: AnyRequest, res?: AnyResponse) {
  try {
    const { syncMarket } = await import("../../server/syncMarket");
    const syncPromise = syncMarket(`manual:${new Date().toISOString().slice(0, 16)}`);
    const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Manual sync timed out after 45 seconds")), 45_000));
    const result = await Promise.race([syncPromise, timeoutPromise]);
    return send(res, result);
  } catch (error) {
    return send(res, { error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
}
