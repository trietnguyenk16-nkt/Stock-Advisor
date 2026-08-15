import { describe, expect, it } from "vitest";

describe("OpenAI configuration", () => {
  it("accepts the configured key and can list models", async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    expect(apiKey, "OPENAI_API_KEY must be configured").toBeTruthy();

    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    const body = await response.text();
    expect(response.ok, body).toBe(true);

    const payload = JSON.parse(body) as { data?: Array<{ id?: string }> };
    expect(Array.isArray(payload.data)).toBe(true);
    const ids = payload.data?.map((model) => model.id).filter(Boolean) ?? [];
    expect(ids.length).toBeGreaterThan(0);
  }, 20_000);
});
