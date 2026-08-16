# Watchlist production verification — 2026-08-16

The public domain `https://stock-advisor-nine-black.vercel.app` renders the dashboard, but `GET /api/market/assets` returns Vercel `404 NOT_FOUND`. This endpoint exists in the local HEAD/checkpoint `8b745ded`. Therefore the inspected Vercel domain is not serving the watchlist checkpoint (or is connected to another Vercel project), so the user's 503 `/api/ai/model` and unsynced new asset cannot be used to judge the current code until the exact checkpoint is redeployed to the correct project/domain.
