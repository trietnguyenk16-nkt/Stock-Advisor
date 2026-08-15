import { describe, expect, it } from "vitest";
import { getSyncExitCode, getVpsRunKey } from "./syncCli";

describe("VPS sync CLI run key and exit code", () => {
  it("uses an explicit run key when configured", () => {
    expect(getVpsRunKey(0, "manual:2026-08-15", "task-1")).toBe("manual:2026-08-15");
  });

  it("includes task uid and uses the same key inside one two-hour bucket", () => {
    const base = 2 * 60 * 60 * 1000 * 123;
    expect(getVpsRunKey(base + 10, "", "task-abc")).toBe("vps:task-abc:123");
    expect(getVpsRunKey(base + 2 * 60 * 60 * 1000 - 1, "", "task-abc")).toBe("vps:task-abc:123");
    expect(getVpsRunKey(base + 2 * 60 * 60 * 1000, "", "task-abc")).toBe("vps:task-abc:124");
  });

  it("returns a non-zero exit code only for failed syncs", () => {
    expect(getSyncExitCode({ status: "success" })).toBe(0);
    expect(getSyncExitCode({ status: "partial" })).toBe(0);
    expect(getSyncExitCode({ status: "running" })).toBe(0);
    expect(getSyncExitCode({ status: "failed" })).toBe(1);
  });
});
