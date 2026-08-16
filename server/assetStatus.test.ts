import { describe, expect, it } from "vitest";
import { getAssetStatusLabel } from "../client/src/lib/assetStatus";

describe("asset status label", () => {
  it("moves from waiting to updated after a successful quote refresh", () => {
    expect(getAssetStatusLabel({ isLoading: false, hasError: false, hasChange: false })).toBe("Chờ đồng bộ");
    expect(getAssetStatusLabel({ isLoading: false, hasError: false, hasChange: true })).toBe("Đã cập nhật");
  });

  it("prioritizes loading and provider errors", () => {
    expect(getAssetStatusLabel({ isLoading: true, hasError: false, hasChange: true })).toBe("Đang tải");
    expect(getAssetStatusLabel({ isLoading: false, hasError: true, hasChange: false })).toBe("Không có dữ liệu");
  });
});
