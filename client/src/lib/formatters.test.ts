import { describe, expect, it } from "vitest";
import { formatConfidence, formatNumber, formatPercent } from "./formatters";

describe("null-safe market formatters", () => {
  it("does not call numeric methods on null or undefined", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
    expect(formatPercent(null)).toBe("Chưa đồng bộ");
    expect(formatPercent(undefined)).toBe("Chưa đồng bộ");
    expect(formatConfidence(null)).toBe("—");
    expect(formatConfidence(undefined)).toBe("—");
  });

  it("formats valid values with bounded confidence", () => {
    expect(formatNumber(14400000)).toContain("14.400.000");
    expect(formatPercent(-1.234)).toBe("-1,23%");
    expect(formatConfidence(1.5)).toBe("100%");
    expect(formatConfidence(-0.2)).toBe("0%");
  });
});
