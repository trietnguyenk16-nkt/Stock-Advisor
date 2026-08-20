import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { getPostgresSslConfig, normalizePostgresConnectionString } from "./db";

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

  it("removes URL SSL overrides before applying the explicit pg TLS config", () => {
    const normalized = normalizePostgresConnectionString("postgresql://user:pass@db.example/postgres?SSLMODE=verify-full&sslrootcert=%2Ftmp%2Fwrong.crt&ssl=true&x=1");
    expect(normalized.toLowerCase()).not.toContain("sslmode");
    expect(normalized.toLowerCase()).not.toContain("sslrootcert");
    expect(normalized.toLowerCase()).not.toContain("ssl=true");
    expect(normalized).toContain("x=1");
    expect(getPostgresSslConfig()).toEqual({ rejectUnauthorized: false });
  });

  it("can execute a lightweight connectivity query", async () => {
    const connectionString = normalizePostgresConnectionString(getSupabaseDatabaseUrl());
    const pool = new Pool({ connectionString, ssl: getPostgresSslConfig(), max: 1, connectionTimeoutMillis: 10_000 });
    try {
      const result = await pool.query("select 1 as ok");
      expect(result.rows[0]?.ok).toBe(1);
    } finally {
      await pool.end();
    }
  });
});
