# Vercel runtime fix verification

## 2026-08-16

- User screenshot showed Vercel build error: `Function Runtimes must have a valid version, for example 'now-php@1.0.0'.`
- Root cause identified in repository `vercel.json`: `functions.api/**/*.ts.runtime` was set to `nodejs20.x`, which Vercel rejected in this configuration.
- Removed the entire `functions` override from `vercel.json`; Vercel now uses its default valid Node runtime.
- Local verification passed: JSON parse, `pnpm check`, 31 Vitest tests, and `pnpm build`.
- Fix pushed to GitHub commit `b914163f380817373d9d29128ab9f62644991f0d` and checkpoint `manus-webdev://b914163f`.
- After the push, the originally inspected alias `https://stock-advisor-nine-black.vercel.app` still returned HTTP 500 `FUNCTION_INVOCATION_FAILED` for `/api/ai/config`, `/api/market/quote?ticker=VNM.VN`, `/api/market/history`, and `/api/push/config`.
- The user's screenshot shows deployment domains beginning with `stock-advisor-git-main...` and `stock-advisor-9ncg4h3r...`, which do not match `stock-advisor-nine-black.vercel.app`. This suggests the redeploy was performed in a different Vercel project/domain or the old alias is not pointing to the new deployment.

## Required next action

Redeploy commit `b914163f` in the Vercel project that owns the actual production domain, then open the exact Production domain listed in that deployment. Verify that the deployment status is Ready before testing the API endpoints. If the production domain is intended to remain `stock-advisor-nine-black.vercel.app`, assign that domain to the successful deployment/project or redeploy from that project.
