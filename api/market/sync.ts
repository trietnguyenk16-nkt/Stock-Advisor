import { json, errorResponse } from "../_lib/direct";
import { withWebRequest } from "../_lib/vercel";

export default withWebRequest(async () => {
  try {
    const { syncMarket } = await import("../../server/syncMarket");
    const result = await syncMarket(`manual:${new Date().toISOString().slice(0, 16)}`);
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
})
