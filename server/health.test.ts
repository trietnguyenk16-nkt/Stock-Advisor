import { describe, expect, it } from "vitest";
import handler from "../api/health";

describe("public deployment health endpoint", () => {
  it("returns ready without database or OpenAI configuration", () => {
    const response = { statusCode: 0, body: null as any, headers: {} as Record<string, string>, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return body; }, setHeader(name: string, value: string) { this.headers[name] = value; }, end(body?: string) { this.body = body ? JSON.parse(body) : null; } };
    handler({ method: "GET" }, response);
    expect(response.statusCode).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.service).toBe("stock-advisor");
    expect(response.body.status).toBe("ready");
  });

  it("rejects non-GET requests", () => {
    const response = { statusCode: 0, body: null as any, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return body; } };
    handler({ method: "POST" }, response);
    expect(response.statusCode).toBe(405);
    expect(response.body.code).toBe("METHOD_NOT_ALLOWED");
  });
});
