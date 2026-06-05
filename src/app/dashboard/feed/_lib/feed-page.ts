"use client"

export const formatFeedTypeLabel = (feedType: {
  id?: number | null
  feed_line?: string | null
  feed_pellet_size?: string | null
  crude_protein_percentage?: number | null
  label?: string | null
}) => {
  const parts = [
    feedType.feed_line,
    feedType.feed_pellet_size,
    feedType.crude_protein_percentage != null ? `CP ${feedType.crude_protein_percentage}%` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(" | ") : feedType.label ?? `Feed ${feedType.id ?? "N/A"}`
}

export const formatMetricNumber = (value: number | null | undefined, decimals = 1) =>
  value == null || Number.isNaN(value)
    ? "N/A"
    : value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
