import { json, errorResponse } from "../_lib/direct";
import { withWebRequest } from "../_lib/vercel";

export default withWebRequest(async () => {
  try {
    const { getEmailHistory, getSyncHistory } = await import("../../server/db");
    return json({ syncRuns: await getSyncHistory(30), emailDeliveries: await getEmailHistory(30) });
  } catch (error) {
    return errorResponse(error);
  }
})
