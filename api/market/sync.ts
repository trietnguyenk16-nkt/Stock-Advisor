import { sendJson, type ApiRequest, type ApiResponse } from "../_lib/node";
import { universal } from "../_lib/universal";

async function handler(_req: ApiRequest, res: ApiResponse) {
  try {
    const { syncMarket } = await import("../../server/syncMarket");
    const syncPromise = syncMarket(`manual:${new Date().toISOString().slice(0, 16)}`);
    const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Manual sync timed out after 45 seconds")), 45_000));
    const result = await Promise.race([syncPromise, timeoutPromise]);
    return sendJson(res, result);
  } catch (error) {
    return sendJson(res, { error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
}

export default universal(handler);
