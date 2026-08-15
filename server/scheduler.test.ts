import { describe, expect, it, vi } from "vitest";
import { getHeartbeatRunKey, getTwoHourBucket } from "./scheduler";
import { sendDigest } from "./syncMarket";

describe("scheduler contracts", () => {
  it("keeps a stable UTC two-hour bucket", () => {
    const base = 2 * 60 * 60 * 1000 * 10;
    expect(getTwoHourBucket(base + 1)).toBe(10);
    expect(getTwoHourBucket(base + 2 * 60 * 60 * 1000 - 1)).toBe(10);
    expect(getTwoHourBucket(base + 2 * 60 * 60 * 1000)).toBe(11);
    expect(getHeartbeatRunKey("task-xyz", base + 1)).toBe("heartbeat:task-xyz:10");
  });

  it("skips email safely when delivery secrets are absent", async () => {
    vi.stubEnv("ALERT_EMAIL", "");
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(sendDigest(`test-email-fallback-${Date.now()}`, ["<p>test</p>"])).resolves.toMatchObject({ status: "skipped" });
    vi.unstubAllEnvs();
  });
});
