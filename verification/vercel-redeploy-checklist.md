# Vercel redeploy and production verification

## Redeploy

1. Open the Vercel project connected to `trietnguyenk16-nkt/Stock-Advisor` and confirm the production branch is `main`.
2. Trigger **Redeploy** for the deployment built from commit `f8e36b7` (or the newer checkpoint commit after the History/AI normalization change). Do not redeploy an older deployment from the previous project alias.
3. Confirm the Vercel Environment Variables are present for **Production**: `SUPABASE_DATABASE_URL`, `OPENAI_API_KEY`, `JWT_SECRET`, and, if email/cron/push are enabled, `CRON_SECRET`, `RESEND_API_KEY`, `ALERT_EMAIL`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY`.
4. Confirm Supabase contains the additive-only `stock_advisor` schema. The API also ensures required tables at runtime, but the database URL must use the Supabase PostgreSQL pooler and have permission to create/use this schema.

## Verification URLs and flows

After deployment, open the actual Vercel production hostname, not the stale alias. Check `/` renders the dashboard UI, `/history` renders the sync history page, and `/api/ai/config` returns JSON rather than HTML. The quote check is `/api/market/quote?ticker=SJC`; it should return `source: "PNJ SJC API"` and a VND price when the PNJ endpoint is available.

Add a new fund such as `DCDS` or `VCBF-BCF`, click **Đồng bộ ngay**, and verify that the asset changes from `Chờ đồng bộ` to `Đã cập nhật`. Open **Lịch sử sync** and confirm a new `manual:<timestamp>` row appears without a page reload; the dashboard emits `stock-advisor-sync-complete` and History refetches its API data. Finally, click **Bắt đầu phân tích AI** and confirm the status text shows a numeric analyzed count and a model name, never `undefined`. If the deployment still returns the old response shape, the client normalization falls back to the result count and selected model.

The current code was validated locally with 47 server Vitest tests, a dedicated client normalization test, TypeScript checking, and a production build. Live Supabase/Vercel verification requires the production redeploy and the correct Vercel project/domain.
