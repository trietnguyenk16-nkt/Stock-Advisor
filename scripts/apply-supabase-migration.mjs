import fs from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL is required");

const baseSql = await fs.readFile(new URL("../supabase/migrations/20260815_stock_advisor_additive.sql", import.meta.url), "utf8");
const usersSql = `
create table if not exists stock_advisor.users (
  id bigint generated always as identity primary key,
  open_id varchar(64) not null unique,
  name text,
  email varchar(320),
  login_method varchar(64),
  role varchar(16) not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_signed_in timestamptz not null default now()
);
`;

const pool = new Pool({
  connectionString: connectionString.replace(/([?&])sslmode=[^&]*/i, "$1").replace(/[?&]$/, ""),
  ssl: { rejectUnauthorized: false },
  max: 1,
});
try {
  await pool.query("begin");
  await pool.query(baseSql);
  await pool.query(usersSql);
  await pool.query("commit");
  const verification = await pool.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'stock_advisor'
    order by table_name
  `);
  console.log(JSON.stringify({ ok: true, tables: verification.rows.map((row) => row.table_name) }, null, 2));
} catch (error) {
  await pool.query("rollback").catch(() => undefined);
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
