export function getAssetStatusLabel(input: { isLoading: boolean; hasError: boolean; hasChange: boolean }) {
  if (input.isLoading) return "Đang tải";
  if (input.hasError) return "Không có dữ liệu";
  return input.hasChange ? "Đã cập nhật" : "Chờ đồng bộ";
}
