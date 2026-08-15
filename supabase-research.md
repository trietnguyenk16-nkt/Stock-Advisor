# Supabase migration research notes

## Official sources

1. Supabase, Connect to your database: https://supabase.com/docs/guides/database/connecting-to-postgres
   - Direct connection is for migrations, pg_dump and long-lived backends.
   - Shared pooler session mode uses port 5432 and is suitable for persistent IPv4-only backend traffic.
   - Shared pooler transaction mode uses port 6543 and is intended for serverless/edge functions.
   - Transaction mode does not support prepared statements; disable them in the client library when applicable.
   - SSL is recommended.

2. Supabase, Database Migrations: https://supabase.com/docs/guides/deployment/database-migrations
   - Use migration files and `supabase db push` for remote deployment.
   - Avoid making direct remote schema changes in Dashboard once migrations are established.
   - `supabase db push --include-seed` can apply migrations and seed data.

3. Supabase, Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
   - RLS must be enabled on exposed public tables.
   - Without policies, publishable/anon API access cannot read or write rows.
   - Since this app keeps database access server-side through Vercel, service-role/server connection can be used without exposing database credentials in the browser; do not expose service_role key client-side.

4. Vercel, Connection Pooling with Functions: https://vercel.com/kb/guide/connection-pooling-with-functions
   - Use pooled database connections for Functions.
   - Supabase transaction pooler is appropriate for transient/serverless traffic.
   - Define pool globally and configure client/library appropriately.

## Application decision

The current app uses Drizzle MySQL (`mysql-core`) and must be migrated to Drizzle PostgreSQL (`pg-core`) rather than changing only `DATABASE_URL`. The existing Vercel Cron and backend can remain; Supabase provides PostgreSQL. No Supabase Auth is required for the single-owner app. The minimum Vercel secrets are DATABASE_URL using the Supabase pooler string, CRON_SECRET, RESEND_API_KEY, ALERT_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT and the chosen LLM/provider credentials.
