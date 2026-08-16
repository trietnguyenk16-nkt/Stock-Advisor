# Public deployment without login

The repository does not contain middleware, SSO redirects, or a `deploymentProtection` setting. The inspected `vercel.json` only defines the Vite build, API rewrite exclusion, and cron schedule. The production URL currently returns a 302 redirect to `vercel.com/sso-api` before the application is reached, which identifies Vercel Deployment Protection as a project-level setting rather than application code.

A public `GET /api/health` endpoint has been added. It does not read Supabase or OpenAI secrets and returns `{ ok: true, service: "stock-advisor", status: "ready" }` plus non-sensitive deployment metadata. It is intended for public smoke checks after protection is disabled.

To allow the app to open without login, the owner must open Vercel Project Settings → Deployment Protection and set the deployment protection mode to **None/Off** for the production deployment, or use a public production domain with protection disabled. This cannot be changed safely through repository code or `vercel.json`. Application APIs still validate their own required configuration and do not gain authentication bypass from this change.
