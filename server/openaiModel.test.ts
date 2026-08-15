import { describe, expect, it } from "vitest";
import { AI_MODELS, DEFAULT_AI_MODEL, getConfiguredAiModel, isAiModel } from "./openai";

describe("OpenAI model configuration", () => {
  it("allows only the two dashboard models", () => {
    expect(AI_MODELS).toEqual(["gpt-4o-mini", "gpt-5-mini"]);
    expect(isAiModel("gpt-4o-mini")).toBe(true);
    expect(isAiModel("gpt-5-mini")).toBe(true);
    expect(isAiModel("gpt-4o")).toBe(false);
  });

  it("falls back to gpt-4o-mini for missing or invalid values", () => {
    expect(DEFAULT_AI_MODEL).toBe("gpt-4o-mini");
    expect(getConfiguredAiModel()).toBe("gpt-4o-mini");
    expect(getConfiguredAiModel("unsupported")).toBe("gpt-4o-mini");
    expect(getConfiguredAiModel("gpt-5-mini")).toBe("gpt-5-mini");
  });
});
