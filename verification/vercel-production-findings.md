# Vercel production verification — 2026-08-16

The public domain `https://stock-advisor-nine-black.vercel.app` rendered the dashboard, but the deployed frontend still showed the old tRPC-based behavior. Direct browser-console requests returned:

- `/api/trpc/ai.config?...`: HTTP 500 `FUNCTION_INVOCATION_FAILED`.
- `/api/trpc/market.quote?...`: HTTP 500 `FUNCTION_INVOCATION_FAILED`.
- `/api/ai/config`: HTTP 404 `NOT_FOUND`.
- `/api/market/quote?ticker=VNM.VN`: HTTP 404 `NOT_FOUND`.
- `/api/market/history`: HTTP 404 `NOT_FOUND`.
- `/api/push/config`: HTTP 404 `NOT_FOUND`.

The code checkpoint containing independent direct API functions was `87a243b`, pushed to GitHub `main`. Therefore the domain inspected was not serving that checkpoint yet, or the Vercel project is connected to a different repository/root directory/deployment than the GitHub branch. No claim of production success is made until a deployment serving `87a243b` is verified.
