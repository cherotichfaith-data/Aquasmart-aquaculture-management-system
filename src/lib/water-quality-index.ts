import type { WaterQualityThresholdRow } from "@/features/water-quality/types"

export type WaterQualityStatusLabel = {
  label: string
  color: string
}

export const WQI_GOOD_MIN = 70
export const WQI_MODERATE_MIN = 50

export function getWqiLabel(value: number | null): WaterQualityStatusLabel {
  if (value == null) return { label: "No data", color: "var(--muted-foreground)" }
  if (value >= WQI_GOOD_MIN) return { label: "Good", color: "#10B981" }
  if (value >= WQI_MODERATE_MIN) return { label: "Moderate", color: "#F59E0B" }
  return { label: "Poor", color: "#EF4444" }
}

function scoreDissolvedOxygen(value: number | null, lowDoThreshold: number) {
  if (value == null) return null
  if (value >= lowDoThreshold + 2) return 90
  if (value >= lowDoThreshold) return 60
  if (value >= lowDoThreshold - 1) return 30
  return 0
}

function scoreTemperature(value: number | null, tempMean: number | null, tempStd: number | null) {
  if (value == null || tempMean == null || tempStd == null) return null
  const delta = Math.abs(value - tempMean)
  if (tempStd === 0) return delta === 0 ? 90 : 0
  if (delta <= tempStd) return 90
  if (delta <= tempStd * 2) return 60
  if (delta <= tempStd * 3) return 30
  return 0
}

export function calculateWqi(
  doValue: number | null,
  tempValue: number | null,
  lowDoThreshold: number,
  tempMean: number | null,
  tempStd: number | null,
) {
  const doScore = scoreDissolvedOxygen(doValue, lowDoThreshold)
  const tempScore = scoreTemperature(tempValue, tempMean, tempStd)
  if (doScore == null || tempScore == null) return null
  return (doScore + tempScore) / 2
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
