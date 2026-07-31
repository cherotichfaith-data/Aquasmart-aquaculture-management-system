import type { WaterQualityThresholdRow } from "@/features/water-quality/types"
import { getSemanticColor } from "@/lib/theme/semantic-colors"

export type WaterQualityStatusLabel = {
  label: string
  color: string
}

export const WQI_GOOD_MIN = 70
export const WQI_MODERATE_MIN = 50

export function getWqiLabel(value: number | null): WaterQualityStatusLabel {
  if (value == null) return { label: "No data", color: getSemanticColor("neutral") }
  if (value >= WQI_GOOD_MIN) return { label: "Good", color: getSemanticColor("good") }
  if (value >= WQI_MODERATE_MIN) return { label: "Moderate", color: getSemanticColor("warn") }
  return { label: "Poor", color: getSemanticColor("bad") }
}

export function selectThresholdRow(rows: WaterQualityThresholdRow[], systemId?: number | null) {
  if (systemId != null) {
    const systemThreshold = rows.find((row) => row.system_id === systemId)
    if (systemThreshold) return systemThreshold
  }

  return (
    rows.find((row) => row.scope === "farm" && row.system_id == null) ??
    rows.find((row) => row.scope === "default") ??
    rows[0] ??
    null
  )
}
