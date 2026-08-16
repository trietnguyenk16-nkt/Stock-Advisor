import { sendJson, type ApiRequest, type ApiResponse } from "../_lib/node";

export default async function handler(_req: ApiRequest, res: ApiResponse) {
  try {
    const { syncMarket } = await import("../../server/syncMarket");
    const result = await syncMarket(`manual:${new Date().toISOString().slice(0, 16)}`);
    return sendJson(res, result);
  } catch (error) {
    return sendJson(res, { error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
}
