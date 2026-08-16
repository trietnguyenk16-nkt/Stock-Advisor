import { send, type AnyRequest, type AnyResponse } from "../_lib/vercel";

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
