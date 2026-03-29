import type { Database } from "@/lib/types/database"
import { sortByDateAsc } from "@/lib/utils"

type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]
type MeasurementRow = Database["public"]["Views"]["api_water_quality_measurements"]["Row"]
type ThresholdRow = Database["public"]["Views"]["api_alert_thresholds"]["Row"]

export type GrowthChartRow = {
  date: string
  average_body_weight: number | null
  biomass_increase_period: number
  total_biomass: number
  total_feed_amount_period: number
}

export type GrowthAbwChartRow = {
  date: string
  average_body_weight: number | null
}

export type EnrichedMeasurementRow = MeasurementRow & {
  threshold_value: number | null
  excursion: boolean
  timestamp_ms: number | null
}

export type ExcursionLogRow = {
  id: string
  date: string
  cage: string
  parameter: string
  value: number | null
  threshold: number | null
  durationHours: number | null
  actionTaken: string
}

export function buildGrowthChartRows(productionRows: ProductionSummaryRow[]): GrowthChartRow[] {
  const byDate = new Map<
    string,
    {
      totalBiomass: number
      totalFeed: number
      totalBiomassIncrease: number
      weightedAbw: number
      abwWeight: number
      fallbackAbw: number
      fallbackAbwCount: number
    }
  >()

  productionRows.forEach((row) => {
    if (!row.date) return
    const current = byDate.get(row.date) ?? {
      totalBiomass: 0,
      totalFeed: 0,
      totalBiomassIncrease: 0,
      weightedAbw: 0,
      abwWeight: 0,
      fallbackAbw: 0,
      fallbackAbwCount: 0,
    }
    current.totalBiomass += row.total_biomass ?? 0
    current.totalFeed += row.total_feed_amount_period ?? 0
    current.totalBiomassIncrease += row.biomass_increase_period ?? 0
    if (typeof row.average_body_weight === "number") {
      const weight = row.number_of_fish_inventory ?? 0
      if (weight > 0) {
        current.weightedAbw += row.average_body_weight * weight
        current.abwWeight += weight
      } else {
        current.fallbackAbw += row.average_body_weight
        current.fallbackAbwCount += 1
      }
    }
    byDate.set(row.date, current)
  })

  return sortByDateAsc(
    Array.from(byDate.entries()).map(([date, current]) => ({
      date,
      average_body_weight:
        current.abwWeight > 0
          ? current.weightedAbw / current.abwWeight
          : current.fallbackAbwCount > 0
            ? current.fallbackAbw / current.fallbackAbwCount
            : null,
      biomass_increase_period: current.totalBiomassIncrease,
      total_biomass: current.totalBiomass,
      total_feed_amount_period: current.totalFeed,
    })),
    (row) => row.date,
  )
}

export function buildGrowthAbwChartRows(productionRows: ProductionSummaryRow[]): GrowthAbwChartRow[] {
  const byDate = new Map<
    string,
    {
      weightedAbw: number
      abwWeight: number
      fallbackAbw: number
      fallbackAbwCount: number
    }
  >()

  productionRows.forEach((row) => {
    if (!row.date || row.activity !== "sampling") return

    const current = byDate.get(row.date) ?? {
      weightedAbw: 0,
      abwWeight: 0,
      fallbackAbw: 0,
      fallbackAbwCount: 0,
    }

    if (typeof row.average_body_weight === "number") {
      const weight = row.number_of_fish_inventory ?? 0
      if (weight > 0) {
        current.weightedAbw += row.average_body_weight * weight
        current.abwWeight += weight
      } else {
        current.fallbackAbw += row.average_body_weight
        current.fallbackAbwCount += 1
      }
    }

    byDate.set(row.date, current)
  })

  return sortByDateAsc(
    Array.from(byDate.entries()).map(([date, current]) => ({
      date,
      average_body_weight:
        current.abwWeight > 0
          ? current.weightedAbw / current.abwWeight
          : current.fallbackAbwCount > 0
            ? current.fallbackAbw / current.fallbackAbwCount
            : null,
    })),
    (row) => row.date,
  )
}

export function projectDaysToHarvest(abwG: number, adgGDay: number, sgrPctDay: number, targetHarvestWeightG: number | null) {
  if (targetHarvestWeightG == null || !Number.isFinite(targetHarvestWeightG) || targetHarvestWeightG <= abwG) return 0
  if (Number.isFinite(adgGDay) && adgGDay > 0) {
    return (targetHarvestWeightG - abwG) / adgGDay
  }
  if (Number.isFinite(sgrPctDay) && sgrPctDay > 0 && abwG > 0) {
    return Math.log(targetHarvestWeightG / abwG) / (sgrPctDay / 100)
  }
  return null
}

const resolveThreshold = (thresholds: ThresholdRow[], systemId?: number | null) => {
  if (!thresholds.length) return null
  if (systemId != null) {
    const systemThreshold = thresholds.find((row) => row.system_id === systemId)
    if (systemThreshold) return systemThreshold
  }
  return (
    thresholds.find((row) => row.scope === "farm" && row.system_id == null) ??
    thresholds.find((row) => row.scope === "default") ??
    thresholds[0] ??
    null
  )
}

const getThresholdValue = (row: MeasurementRow, threshold: ThresholdRow | null) => {
  if (row.parameter_name === "dissolved_oxygen") return threshold?.low_do_threshold ?? null
  if (row.parameter_name === "ammonia") return threshold?.high_ammonia_threshold ?? null
  return null
}

const isExcursionRow = (row: MeasurementRow, thresholdValue: number | null) => {
  if (typeof row.parameter_value !== "number" || typeof thresholdValue !== "number") return false
  if (row.parameter_name === "dissolved_oxygen") return row.parameter_value < thresholdValue
  if (row.parameter_name === "ammonia") return row.parameter_value > thresholdValue
  return false
}

const toTimestampMs = (date: string | null, time: string | null) => {
  if (!date) return null
  const parsed = new Date(`${date}T${time ?? "00:00:00"}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
}

export function buildComplianceRows(rows: MeasurementRow[], thresholds: ThresholdRow[]): EnrichedMeasurementRow[] {
  return rows.map((row) => {
    const threshold = resolveThreshold(thresholds, row.system_id)
    const thresholdValue = getThresholdValue(row, threshold)
    return {
      ...row,
      threshold_value: thresholdValue,
      excursion: isExcursionRow(row, thresholdValue),
      timestamp_ms: toTimestampMs(row.date, row.time),
    }
  })
}

export function buildExcursionLogRows(rows: EnrichedMeasurementRow[]): ExcursionLogRow[] {
  const grouped = new Map<string, EnrichedMeasurementRow[]>()

  rows
    .filter((row) => row.parameter_name === "dissolved_oxygen" || row.parameter_name === "ammonia")
    .forEach((row) => {
      const key = `${row.system_id ?? "unknown"}|${row.parameter_name ?? "unknown"}`
      const list = grouped.get(key) ?? []
      list.push(row)
      grouped.set(key, list)
    })

  const logRows: ExcursionLogRow[] = []

  grouped.forEach((list, key) => {
    const ordered = [...list].sort((left, right) => (left.timestamp_ms ?? 0) - (right.timestamp_ms ?? 0))
    let active:
      | {
          startRow: EnrichedMeasurementRow
          lastTimestampMs: number | null
          worstValue: number | null
        }
      | null = null

    const closeEpisode = (endTimestampMs: number | null) => {
      if (!active) return

      const durationHours =
        active.startRow.timestamp_ms != null && endTimestampMs != null
          ? Math.max(0, (endTimestampMs - active.startRow.timestamp_ms) / 3_600_000)
          : null

      logRows.push({
        id: `${key}-${active.startRow.id ?? active.startRow.date}-${active.startRow.time ?? "00:00"}`,
        date: active.startRow.date ?? "-",
        cage: active.startRow.system_name ?? `Cage ${active.startRow.system_id ?? "-"}`,
        parameter: String(active.startRow.parameter_name ?? "-"),
        value: active.worstValue,
        threshold: active.startRow.threshold_value,
        durationHours,
        actionTaken: "Not recorded",
      })

      active = null
    }

    ordered.forEach((row) => {
      if (!row.excursion) {
        closeEpisode(row.timestamp_ms ?? active?.lastTimestampMs ?? null)
        return
      }

      if (!active) {
        active = {
          startRow: row,
          lastTimestampMs: row.timestamp_ms,
          worstValue: row.parameter_value,
        }
        return
      }

      active.lastTimestampMs = row.timestamp_ms ?? active.lastTimestampMs

      if (typeof row.parameter_value === "number") {
        if (row.parameter_name === "dissolved_oxygen") {
          active.worstValue =
            typeof active.worstValue === "number" ? Math.min(active.worstValue, row.parameter_value) : row.parameter_value
        } else {
          active.worstValue =
            typeof active.worstValue === "number" ? Math.max(active.worstValue, row.parameter_value) : row.parameter_value
        }
      }
    })

    const openEpisodeEnd = ordered.length > 0 ? ordered[ordered.length - 1]?.timestamp_ms ?? null : null
    closeEpisode(openEpisodeEnd)
  })

  return logRows.sort((left, right) => `${right.date} ${right.id}`.localeCompare(`${left.date} ${left.id}`))
}
