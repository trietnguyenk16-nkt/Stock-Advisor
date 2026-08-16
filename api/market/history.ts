import { sendJson, type ApiRequest, type ApiResponse } from "../_lib/node";
import { universal } from "../_lib/universal";

async function handler(_req: ApiRequest, res: ApiResponse) {
  try {
    const { getEmailHistory, getSyncHistory } = await import("../../server/db");
    return sendJson(res, { syncRuns: await getSyncHistory(30), emailDeliveries: await getEmailHistory(30) });
  } catch (error) {
    return sendJson(res, { error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
}

export default universal(handler);
