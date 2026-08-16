export function getAssetStatusLabel(input: { isLoading: boolean; hasError: boolean; hasChange: boolean; hasPrice?: boolean }) {
  if (input.isLoading) return "Đang tải";
  if (input.hasError) return "Không có dữ liệu";
  return input.hasPrice || input.hasChange ? "Đã cập nhật" : "Chờ đồng bộ";
}
