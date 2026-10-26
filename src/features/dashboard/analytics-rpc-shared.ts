import { Constants, type Database, type Enums } from "@/lib/types/database"
import type { KPIOverviewMetric, KpiOverviewData, RecommendedAction } from "./types"

type DashboardConsolidatedRow = Database["public"]["Functions"]["api_dashboard_consolidated"]["Returns"][number]

const PRIORITY_ORDER: Record<RecommendedAction["priority"], number> = {
  High: 0,
  Medium: 1,
  Info: 2,
}

const WATER_QUALITY_BADGES: Record<Enums<"water_quality_rating">, { tone: KPIOverviewMetric["tone"]; badge: string }> = {
  optimal: { tone: "good", badge: "Optimal" },
  acceptable: { tone: "warn", badge: "Acceptable" },
  critical: { tone: "bad", badge: "Critical" },
  lethal: { tone: "bad", badge: "Lethal" },
}
const WATER_QUALITY_RATINGS = new Set<string>(Constants.public.Enums.water_quality_rating)

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

const normalizeWaterQualityLabel = (value: string | null | undefined): Enums<"water_quality_rating"> | null => {
  const normalized = value?.trim().toLowerCase()
  return normalized && WATER_QUALITY_RATINGS.has(normalized) ? (normalized as Enums<"water_quality_rating">) : null
}

type RecommendedActionInputRow = {
  system_name?: string | null
  metric_name?: string | null
  severity?: string | null
  current_value?: number | null
  threshold_low?: number | null
  threshold_high?: number | null
  unit?: string | null
}

const normalizeActionPriority = (priority: string | null | undefined): RecommendedAction["priority"] => {
  if (!priority) return "Info"

  const normalized = priority.trim().toLowerCase()
  if (normalized === "high" || normalized === "critical") return "High"
  if (normalized === "medium") return "Medium"
  return "Info"
}

export function mergeRecommendedActionRows(rows: RecommendedActionInputRow[]): RecommendedAction[] {
  const deduped = new Map<string, RecommendedAction>()

  rows.forEach((row) => {
    const metric = row.metric_name?.trim() || "Farm signal"
    const system = row.system_name?.trim() || "Farm"
    const value = isFiniteNumber(row.current_value) ? row.current_value : null
    const unit = row.unit?.trim() ? ` ${row.unit.trim()}` : ""
    const thresholds = [
      isFiniteNumber(row.threshold_low) ? `low ${row.threshold_low}${unit}` : null,
      isFiniteNumber(row.threshold_high) ? `high ${row.threshold_high}${unit}` : null,
    ].filter(Boolean).join(", ")
    const action: RecommendedAction = {
      title: `${system}: ${metric}`,
      description:
        value == null
          ? `${metric} requires attention.`
          : thresholds
            ? `Current value is ${value}${unit}; thresholds: ${thresholds}.`
            : `Current value is ${value}${unit}.`,
      priority: normalizeActionPriority(row.severity),
      due: "Now",
    }
    const key = `${action.priority}::${action.title}::${action.description}::${action.due}`
    if (!deduped.has(key)) {
      deduped.set(key, action)
    }
  })

  return Array.from(deduped.values()).sort((left, right) => {
    const priorityDelta = PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority]
    if (priorityDelta !== 0) return priorityDelta
    const dueDelta = left.due.localeCompare(right.due)
    if (dueDelta !== 0) return dueDelta
    return left.title.localeCompare(right.title)
  })
}

export function buildKpiOverviewFromRpc(params: {
  scopedSystemIds: number[]
  consolidatedRows: DashboardConsolidatedRow[]
  dateFrom: string
  dateTo: string
}): KpiOverviewData {
  const scopedSet = params.scopedSystemIds.length > 0 ? new Set(params.scopedSystemIds) : null
  const consolidatedRows =
    scopedSet
      ? params.consolidatedRows.filter((row) => row.system_id == null || scopedSet.has(row.system_id))
      : params.consolidatedRows

  if (!consolidatedRows.length) {
    return { metrics: [], dateBounds: { start: params.dateFrom, end: params.dateTo } }
  }

  const consolidated = consolidatedRows.find((row) => row.system_id == null) ?? consolidatedRows[0]
  const periodicEfcr = consolidated.efcr_period_consolidated ?? null
  const waterQuality = consolidated.water_quality_rating_numeric_average ?? null

  const waterQualityLabel = normalizeWaterQualityLabel(consolidated.water_quality_rating_average)
  const waterQualityDisplay = waterQualityLabel ? WATER_QUALITY_BADGES[waterQualityLabel] : null

  const metrics: KPIOverviewMetric[] = [
    {
      key: "efcr",
      label: "eFCR",
      value: periodicEfcr,
      decimals: 2,
      trend: consolidated.efcr_period_consolidated != null ? (consolidated.efcr_period_consolidated_delta ?? null) : null,
      trendFormat: "delta",
      trendDecimals: 2,
      invertTrend: true,
    },
    {
      key: "mortality",
      label: "Mortality Rate",
      value: consolidated.mortality_rate ?? null,
      unit: "%/day",
      decimals: 2,
      trend: consolidated.mortality_rate_delta ?? null,
      trendFormat: "delta",
      trendDecimals: 2,
      trendUnit: "%/day",
      invertTrend: true,
    },
    {
      key: "abw",
      label: "Avg Body Weight",
      value: consolidated.abw_asof_end ?? null,
      unit: "g",
      decimals: 1,
      trend: consolidated.abw_asof_end_delta ?? null,
      trendFormat: "delta",
      trendDecimals: 1,
      trendUnit: "g",
      invertTrend: false,
    },
    {
      key: "sgr",
      label: "SGR",
      value: consolidated.sgr ?? null,
      unit: "%/day",
      decimals: 2,
      trend: consolidated.sgr_delta ?? null,
      trendFormat: "delta",
      trendDecimals: 2,
      trendUnit: "%/day",
      invertTrend: false,
    },
    {
      key: "agr",
      label: "AGR",
      value: consolidated.agr ?? null,
      unit: "g/day",
      decimals: 2,
      trend: consolidated.agr_delta ?? null,
      trendFormat: "delta",
      trendDecimals: 2,
      trendUnit: "g/day",
      invertTrend: false,
    },
    {
      key: "biomass",
      label: "Total Biomass",
      value: consolidated.total_biomass ?? null,
      unit: "kg",
      decimals: 1,
      trend: consolidated.total_biomass_delta ?? null,
      trendFormat: "delta",
      trendDecimals: 1,
      trendUnit: "kg",
      invertTrend: false,
    },
    {
      key: "biomass_density",
      label: "Biomass Density",
      value: consolidated.biomass_density ?? null,
      unit: "kg/m3",
      decimals: 2,
      trend: consolidated.biomass_density_delta ?? null,
      trendFormat: "delta",
      trendDecimals: 2,
      trendUnit: "kg/m3",
      invertTrend: false,
    },
    {
      key: "feeding",
      label: "Feeding Rate",
      value: consolidated.feeding_rate ?? null,
      unit: "% BW/day",
      decimals: 2,
      trend: consolidated.feeding_rate_delta ?? null,
      trendFormat: "delta",
      trendDecimals: 2,
      trendUnit: "% BW/day",
      invertTrend: false,
    },
    {
      key: "water_quality",
      label: "Water Quality",
      value: waterQuality,
      decimals: 1,
      trend: consolidated.water_quality_rating_numeric_delta ?? null,
      trendFormat: "delta",
      trendDecimals: 1,
      invertTrend: false,
      tone: waterQualityDisplay?.tone ?? "neutral",
      badge: waterQualityDisplay?.badge ?? "Monitoring",
    },
  ]

  return {
    metrics,
    dateBounds: { start: params.dateFrom, end: params.dateTo },
  }
}
