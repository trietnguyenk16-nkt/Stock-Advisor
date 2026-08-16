import { json, errorResponse } from "../_lib/direct";

export default async function handler() {
  try {
    const { syncMarket } = await import("../../server/syncMarket");
    const result = await syncMarket(`manual:${new Date().toISOString().slice(0, 16)}`);
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
