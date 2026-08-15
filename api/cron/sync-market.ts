import { syncMarket } from "../../server/syncMarket";

function dailyRunKey(now = new Date()) {
  return `vercel:daily:${now.toISOString().slice(0, 10)}`;
}

export default async function handler(request: Request) {
  if (request.method !== "GET" && request.method !== "POST") {
    return Response.json({ error: "method-not-allowed" }, { status: 405 });
  }

  const configuredSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!configuredSecret) {
    return Response.json({ error: "cron-secret-not-configured" }, { status: 503 });
  }
  if (authorization !== `Bearer ${configuredSecret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncMarket(dailyRunKey());
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
