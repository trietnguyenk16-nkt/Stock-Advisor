import { send, type AnyRequest, type AnyResponse } from "../_lib/vercel";

export default async function handler(_req: AnyRequest, res?: AnyResponse) {
  try {
    const { getEmailHistory, getSyncHistory } = await import("../../server/db");
    return send(res, { syncRuns: await getSyncHistory(30), emailDeliveries: await getEmailHistory(30) });
  } catch (error) {
    return send(res, { error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
}
