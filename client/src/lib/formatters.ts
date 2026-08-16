export function formatNumber(value: number | null | undefined, options?: Intl.NumberFormatOptions) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("vi-VN", options).format(value);
}

export function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Chưa đồng bộ";
  return `${value >= 0 ? "+" : ""}${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function formatConfidence(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}
