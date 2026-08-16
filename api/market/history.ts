import { json, errorResponse } from "../_lib/direct";

export default async function handler() {
  try {
    const { getEmailHistory, getSyncHistory } = await import("../../server/db");
    return json({ syncRuns: await getSyncHistory(30), emailDeliveries: await getEmailHistory(30) });
  } catch (error) {
    return errorResponse(error);
  }
}
