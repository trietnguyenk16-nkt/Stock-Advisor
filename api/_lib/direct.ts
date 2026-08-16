export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function readJson(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function errorResponse(error: unknown, status = 500) {
  return json({ error: error instanceof Error ? error.message : "Internal server error" }, status);
}
