import { scaleFractionToPercent } from "@/lib/analytics-format"
import type { Database } from "@/lib/types/database"
import type { KpiCoverageRow } from "@/lib/types/insights"
import type { DashboardPageInitialData, KPIOverviewMetric, RecommendedAction } from "./types"

type DashboardConsolidatedRow = Database["public"]["Functions"]["api_dashboard_consolidated"]["Returns"][number]
type DashboardSystemRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number]

const TRUST_FALLBACKS: Record<string, { source: string; basis: string }> = {
  efcr: { source: "Dashboard consolidated", basis: "In-window conversion" },
  mortality: { source: "Dashboard consolidated", basis: "In-window mortality rate" },
  abw: { source: "Dashboard consolidated", basis: "As-of-end body weight" },
  biomass: { source: "Dashboard consolidated", basis: "Average in-window biomass" },
  biomass_density: { source: "Dashboard consolidated", basis: "Average in-window density" },
  feeding: { source: "Dashboard consolidated", basis: "% body weight/day" },
  water_quality: { source: "Dashboard consolidated", basis: "Average in-window rating" },
}

const PRIORITY_ORDER: Record<RecommendedAction["priority"], number> = {
  High: 0,
  Medium: 1,
  Info: 2,
}

const WATER_QUALITY_BADGES: Record<string, { tone: KPIOverviewMetric["tone"]; badge: string }> = {
  optimal: { tone: "good", badge: "Optimal" },
  acceptable: { tone: "warn", badge: "Acceptable" },
  critical: { tone: "bad", badge: "Critical" },
  lethal: { tone: "bad", badge: "Lethal" },
}

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

const toUniqueSystemIds = (rows: Array<{ system_id: number | null | undefined }>, predicate: (row: { system_id: number | null | undefined }) => boolean) =>
  new Set(
    rows
      .filter((row) => predicate(row))
      .map((row) => row.system_id)
      .filter((systemId): systemId is number => typeof systemId === "number" && Number.isFinite(systemId)),
  ).size

const average = (values: Array<number | null | undefined>) => {
  const numeric = values.filter(isFiniteNumber)
  if (!numeric.length) return null
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length
}

const weightedAverage = (
  entries: Array<{ value: number | null | undefined; weight: number | null | undefined }>,
) => {
  let weightedSum = 0
  let totalWeight = 0

  entries.forEach(({ value, weight }) => {
    if (!isFiniteNumber(value)) return
    if (!isFiniteNumber(weight) || weight <= 0) return
    weightedSum += value * weight
    totalWeight += weight
  })

  if (totalWeight > 0) return weightedSum / totalWeight
  return average(entries.map((entry) => entry.value))
}

const buildCoverageLabel = (covered: number, total: number) => `${covered}/${total} ${total === 1 ? "system" : "systems"}`

const getRoundedWaterQualityLabel = (value: number | null) => {
  if (!isFiniteNumber(value)) return null
  const rounded = Math.round(value)
  if (rounded <= 0) return "lethal"
  if (rounded === 1) return "critical"
  if (rounded === 2) return "acceptable"
  return "optimal"
}

type RecommendedActionInputRow = {
  title: string
  description: string
  priority: string | null | undefined
  due: string | null | undefined
}

const normalizeActionPriority = (priority: string | null | undefined): RecommendedAction["priority"] => {
  if (!priority) return "Info"

  const normalized = priority.trim().toLowerCase()
  if (normalized === "high") return "High"
  if (normalized === "medium") return "Medium"
  return "Info"
}

export function mergeRecommendedActionRows(rows: RecommendedActionInputRow[]): RecommendedAction[] {
  const deduped = new Map<string, RecommendedAction>()

  rows.forEach((row) => {
    const action: RecommendedAction = {
      title: row.title,
      description: row.description,
      priority: normalizeActionPriority(row.priority),
      due: row.due ?? "",
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
  systemRows: DashboardSystemRow[]
  coverageRows?: KpiCoverageRow[]
  dateFrom: string
  dateTo: string
}): DashboardPageInitialData["kpiOverview"] {
  if (!params.scopedSystemIds.length) {
    return { metrics: [], dateBounds: { start: params.dateFrom, end: params.dateTo } }
  }

  const scopedSet = new Set(params.scopedSystemIds)
  const consolidatedRows = params.consolidatedRows.filter((row) => scopedSet.has(row.system_id))
  const systemRows = params.systemRows.filter((row) => scopedSet.has(row.system_id))

  if (!consolidatedRows.length) {
    return { metrics: [], dateBounds: { start: params.dateFrom, end: params.dateTo } }
  }

  const systemRowsById = new Map(systemRows.map((row) => [row.system_id, row]))
  const coverageByKey = new Map((params.coverageRows ?? []).map((row) => [row.kpi_key, row]))
  const totalSystems = params.scopedSystemIds.length

  const buildTrust = (
    key: keyof typeof TRUST_FALLBACKS,
    predicate: (row: DashboardConsolidatedRow) => boolean,
  ): NonNullable<KPIOverviewMetric["trust"]> => {
    const fallback = TRUST_FALLBACKS[key]
    const coverage = coverageByKey.get(key)
    const covered = toUniqueSystemIds(consolidatedRows, (row) => predicate(row as DashboardConsolidatedRow))

    return {
      source: coverage?.data_source ?? fallback.source,
      basis: coverage?.basis ?? fallback.basis,
      coverage: buildCoverageLabel(covered, totalSystems),
    }
  }

  const mortalityWeight = (systemId: number) => systemRowsById.get(systemId)?.fish_end ?? null
  const abwWeight = (systemId: number) => systemRowsById.get(systemId)?.fish_end ?? null

  const efcr = average(consolidatedRows.map((row) => row.efcr_period_consolidated))
  const mortality = weightedAverage(
    consolidatedRows.map((row) => ({
      value: scaleFractionToPercent(row.mortality_rate),
      weight: mortalityWeight(row.system_id),
    })),
  )
  const abw = weightedAverage(
    consolidatedRows.map((row) => ({
      value: row.abw_asof_end,
      weight: abwWeight(row.system_id),
    })),
  )
  const biomass = average(consolidatedRows.map((row) => row.average_biomass))
  const biomassDensity = average(consolidatedRows.map((row) => row.biomass_density))
  const feeding = weightedAverage(
    consolidatedRows.map((row) => ({
      value: scaleFractionToPercent(row.feeding_rate),
      weight: row.average_biomass,
    })),
  )
  const waterQuality = average(consolidatedRows.map((row) => row.water_quality_rating_numeric_average))

  const waterQualityLabel = getRoundedWaterQualityLabel(waterQuality)
  const waterQualityDisplay = waterQualityLabel ? WATER_QUALITY_BADGES[waterQualityLabel] : null

  const metrics: KPIOverviewMetric[] = [
    {
      key: "efcr",
      label: "eFCR",
      value: efcr,
      decimals: 2,
      trend: average(consolidatedRows.map((row) => row.efcr_period_consolidated_delta)),
      trendFormat: "delta",
      trendDecimals: 2,
      invertTrend: true,
      trust: buildTrust("efcr", (row) => isFiniteNumber(row.efcr_period_consolidated)),
    },
    {
      key: "mortality",
      label: "Mortality Rate",
      value: mortality,
      unit: "%/day",
      decimals: 2,
      trend: weightedAverage(
        consolidatedRows.map((row) => ({
          value: scaleFractionToPercent(row.mortality_rate_delta),
          weight: mortalityWeight(row.system_id),
        })),
      ),
      trendFormat: "delta",
      trendDecimals: 2,
      trendUnit: "%/day",
      invertTrend: true,
      trust: buildTrust("mortality", (row) => isFiniteNumber(row.mortality_rate)),
    },
    {
      key: "abw",
      label: "Avg Body Weight",
      value: abw,
      unit: "g",
      decimals: 1,
      trend: weightedAverage(
        consolidatedRows.map((row) => ({
          value: row.abw_asof_end_delta,
          weight: abwWeight(row.system_id),
        })),
      ),
      trendFormat: "delta",
      trendDecimals: 1,
      trendUnit: "g",
      invertTrend: false,
      trust: buildTrust("abw", (row) => isFiniteNumber(row.abw_asof_end)),
    },
    {
      key: "biomass",
      label: "Avg Biomass",
      value: biomass,
      unit: "kg",
      decimals: 1,
      trend: average(consolidatedRows.map((row) => row.average_biomass_delta)),
      trendFormat: "delta",
      trendDecimals: 1,
      trendUnit: "kg",
      invertTrend: false,
      trust: buildTrust("biomass", (row) => isFiniteNumber(row.average_biomass)),
    },
    {
      key: "biomass_density",
      label: "Biomass Density",
      value: biomassDensity,
      unit: "kg/m3",
      decimals: 2,
      trend: average(consolidatedRows.map((row) => row.biomass_density_delta)),
      trendFormat: "delta",
      trendDecimals: 2,
      trendUnit: "kg/m3",
      invertTrend: false,
      trust: buildTrust("biomass_density", (row) => isFiniteNumber(row.biomass_density)),
    },
    {
      key: "feeding",
      label: "Feeding Rate",
      value: feeding,
      unit: "% BW/day",
      decimals: 2,
      trend: weightedAverage(
        consolidatedRows.map((row) => ({
          value: scaleFractionToPercent(row.feeding_rate_delta),
          weight: row.average_biomass,
        })),
      ),
      trendFormat: "delta",
      trendDecimals: 2,
      trendUnit: "% BW/day",
      invertTrend: false,
      trust: buildTrust("feeding", (row) => isFiniteNumber(row.feeding_rate)),
    },
    {
      key: "water_quality",
      label: "Water Quality",
      value: waterQuality,
      decimals: 1,
      trend: null,
      invertTrend: false,
      tone: waterQualityDisplay?.tone ?? "neutral",
      badge: waterQualityDisplay?.badge ?? "Monitoring",
      trust: buildTrust("water_quality", (row) => isFiniteNumber(row.water_quality_rating_numeric_average)),
    },
  ]

  return {
    metrics,
    dateBounds: { start: params.dateFrom, end: params.dateTo },
  }
}
