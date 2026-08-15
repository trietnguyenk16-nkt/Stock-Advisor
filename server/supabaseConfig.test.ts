import { Pool } from "pg";
import { describe, expect, it } from "vitest";

function getSupabaseDatabaseUrl() {
  return process.env.SUPABASE_DATABASE_URL ?? "";
}

describe("Supabase configuration", () => {
  it("requires a PostgreSQL Supabase URL before migration", () => {
    const url = getSupabaseDatabaseUrl();
    expect(url).not.toBe("");
    const parsed = new URL(url);
    expect(parsed.protocol).toBe("postgresql:");
    expect(parsed.searchParams.get("sslmode")).toBe("require");
  });

  it("can execute a lightweight connectivity query", async () => {
    const connectionString = getSupabaseDatabaseUrl().replace(/([?&])sslmode=[^&]*/i, "$1").replace(/[?&]$/, "");
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 10_000 });
    try {
      const result = await pool.query("select 1 as ok");
      expect(result.rows[0]?.ok).toBe(1);
    } finally {
      await pool.end();
    }
  });
});
