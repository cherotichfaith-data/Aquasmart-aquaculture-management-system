import type {
  WaterQualityLatestStatusRow,
  WaterQualityMeasurementViewRow,
  WaterQualitySystemOption,
} from "@/features/water-quality/types"
import {
  type MeasurementEvent,
  type WqParameter,
} from "./water-quality-utils"
import { getWqiLabel, selectThresholdRow, type WaterQualityStatusLabel } from "@/lib/water-quality-index"

export type DepthProfileRow = {
  depth: number
  dissolvedOxygen: number | null
  temperature: number | null
  pH: number | null
}

export type WaterQualitySystemListItem = {
  id: number
  label: string
}

export type SystemWqiRow = WaterQualitySystemListItem & {
  wqi: number | null
  wqiLabel: WaterQualityStatusLabel
}

export type SystemRiskRow = {
  systemId: number
  systemName: string
  rating: string | null
  ratingDate: string | null
  ratingNumeric: number | null
  worstParameter: string | null
  worstValue: number | null
  worstUnit: string | null
  thresholdBreached: boolean
  latestMeasurement: string | null
  trend: number
  trendLabel: string
  action: string
  severity: number
}

export type ParameterTrendRow = {
  date: string
  mean: number | null
  count: number
  rolling: number | null
}

export type DepthProfiles = {
  dates: string[]
  dataByDate: Map<string, DepthProfileRow[]>
}

export { getWqiLabel, selectThresholdRow }
export type { WaterQualityStatusLabel }

export function buildSystemLabelById(rows: WaterQualitySystemOption[]) {
  const map = new Map<number, string>()
  rows.forEach((system) => {
    if (system.id != null) {
      map.set(system.id, system.label ?? `System ${system.id}`)
    }
  })
  return map
}

export function buildSystemOptions(rows: WaterQualitySystemOption[]): WaterQualitySystemListItem[] {
  return rows
    .filter((system): system is WaterQualitySystemOption & { id: number } => system.id != null)
    .map((system) => ({
      id: system.id,
      label: system.label ?? `System ${system.id}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function buildMeasurementEvents(
  rows: WaterQualityMeasurementViewRow[],
  systemLabelById: Map<number, string>,
  operatorByRecordId: Map<string, string>,
): MeasurementEvent[] {
  const grouped = new Map<string, MeasurementEvent>()

  rows.forEach((row) => {
    if (row.system_id == null) return
    const date = row.date ?? ""
    const time = row.time ?? "00:00"
    const key = `${row.system_id}-${date}-${time}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        systemId: row.system_id,
        systemLabel: systemLabelById.get(row.system_id) ?? `System ${row.system_id}`,
        date,
        time,
        timestamp: `${date}T${time}`,
        waterDepth: row.water_depth ?? 0,
        dissolved_oxygen: null,
        pH: null,
        temperature: null,
        ammonia: null,
        operator: operatorByRecordId.get(String(row.id)) ?? "Untracked",
        source: "measurement",
      })
    }

    const target = grouped.get(key)
    if (!target) return
    if (row.parameter_name === "dissolved_oxygen") target.dissolved_oxygen = row.parameter_value
    if (row.parameter_name === "pH") target.pH = row.parameter_value
    if (row.parameter_name === "temperature") target.temperature = row.parameter_value
    if (row.parameter_name === "ammonia") target.ammonia = row.parameter_value
    target.waterDepth = row.water_depth ?? target.waterDepth
    target.operator = operatorByRecordId.get(String(row.id)) ?? target.operator
  })

  return Array.from(grouped.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export function buildLastMeasurementBySystemId(events: MeasurementEvent[]) {
  const map = new Map<number, string>()
  events.forEach((event) => {
    if (!map.has(event.systemId)) {
      map.set(event.systemId, event.timestamp)
    }
  })
  return map
}

export function getAverageWqi(allSystemsWqi: SystemWqiRow[]) {
  const values = allSystemsWqi.map((system) => system.wqi).filter((value): value is number => typeof value === "number")
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function severityRank(rating: string | null) {
  const key = String(rating ?? "").toLowerCase()
  if (key === "lethal") return 4
  if (key === "critical") return 3
  if (key === "acceptable") return 2
  if (key === "optimal") return 1
  return 0
}

function getActionState(row: WaterQualityLatestStatusRow) {
  const rating = String(row.rating ?? "").toLowerCase()
  let state = "Stable"
  if (rating === "acceptable") state = "Watch"
  if (rating === "critical") state = "Investigate"
  if (rating === "lethal") state = "Escalate"
  if ((row.do_exceeded || row.ammonia_exceeded) && state === "Stable") state = "Watch"
  if ((row.do_exceeded || row.ammonia_exceeded) && state === "Watch") state = "Investigate"
  return state
}

export function buildSystemRiskRows(
  latestStatusRows: WaterQualityLatestStatusRow[],
  ratingTrendBySystemId: Map<number, number>,
  systemLabelById: Map<number, string>,
  lastMeasurementBySystemId: Map<number, string>,
): SystemRiskRow[] {
  return latestStatusRows
    .map((row) => {
      const trend = ratingTrendBySystemId.get(row.system_id) ?? 0
      return {
        systemId: row.system_id,
        systemName: row.system_name ?? systemLabelById.get(row.system_id) ?? `System ${row.system_id}`,
        rating: row.rating,
        ratingDate: row.rating_date,
        ratingNumeric: row.rating_numeric,
        worstParameter: row.worst_parameter,
        worstValue: row.worst_parameter_value,
        worstUnit: row.worst_parameter_unit,
        thresholdBreached: row.do_exceeded || row.ammonia_exceeded,
        latestMeasurement: lastMeasurementBySystemId.get(row.system_id) ?? null,
        trend,
        trendLabel: trend > 0.02 ? "Improving" : trend < -0.02 ? "Worsening" : "Stable",
        action: getActionState(row),
        severity: severityRank(row.rating),
      }
    })
    .sort((a, b) => {
      if (b.severity !== a.severity) return b.severity - a.severity
      return String(b.ratingDate ?? "").localeCompare(String(a.ratingDate ?? ""))
    })
}

export function buildParameterTrendData(
  rows: WaterQualityMeasurementViewRow[],
  selectedParameter: WqParameter,
): ParameterTrendRow[] {
  const byDate = new Map<string, { sum: number; count: number }>()

  rows
    .filter((row) => row.parameter_name === selectedParameter)
    .forEach((row) => {
      if (!row.date || row.parameter_value == null) return
      const current = byDate.get(row.date) ?? { sum: 0, count: 0 }
      current.sum += row.parameter_value
      current.count += 1
      byDate.set(row.date, current)
    })

  const aggregated = Array.from(byDate.entries())
    .map(([date, agg]) => ({
      date,
      mean: agg.count > 0 ? agg.sum / agg.count : null,
      count: agg.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return aggregated.map((row, index) => {
    const window = aggregated
      .slice(Math.max(0, index - 6), index + 1)
      .map((entry) => entry.mean)
      .filter((value): value is number => typeof value === "number")
    return {
      ...row,
      rolling: window.length ? window.reduce((sum, value) => sum + value, 0) / window.length : null,
    }
  })
}

export function buildDepthProfiles(rows: WaterQualityMeasurementViewRow[], systemIds: number[]): DepthProfiles {
  if (!systemIds.length) {
    return { dates: [], dataByDate: new Map<string, DepthProfileRow[]>() }
  }

  const byDate = new Map<
    string,
    Map<number, { doSum: number; doCount: number; tempSum: number; tempCount: number; phSum: number; phCount: number }>
  >()

  rows
    .filter(
      (row) =>
        systemIds.includes(row.system_id as number) &&
        row.water_depth != null &&
        (row.parameter_name === "dissolved_oxygen" || row.parameter_name === "temperature" || row.parameter_name === "pH"),
    )
    .forEach((row) => {
      if (!row.date || row.parameter_value == null || row.water_depth == null) return
      const depth = Number(row.water_depth)
      if (!Number.isFinite(depth)) return
      const dateMap = byDate.get(row.date) ?? new Map()
      const current = dateMap.get(depth) ?? {
        doSum: 0,
        doCount: 0,
        tempSum: 0,
        tempCount: 0,
        phSum: 0,
        phCount: 0,
      }
      if (row.parameter_name === "dissolved_oxygen") {
        current.doSum += row.parameter_value
        current.doCount += 1
      }
      if (row.parameter_name === "temperature") {
        current.tempSum += row.parameter_value
        current.tempCount += 1
      }
      if (row.parameter_name === "pH") {
        current.phSum += row.parameter_value
        current.phCount += 1
      }
      dateMap.set(depth, current)
      byDate.set(row.date, dateMap)
    })

  const dates = Array.from(byDate.keys()).sort()
  const dataByDate = new Map<string, DepthProfileRow[]>()
  dates.forEach((date) => {
    const depthMap = byDate.get(date)
    if (!depthMap) return
    const profileRows = Array.from(depthMap.entries())
      .map(([depth, row]) => ({
        depth,
        dissolvedOxygen: row.doCount > 0 ? row.doSum / row.doCount : null,
        temperature: row.tempCount > 0 ? row.tempSum / row.tempCount : null,
        pH: row.phCount > 0 ? row.phSum / row.phCount : null,
      }))
      .filter((row) => row.dissolvedOxygen != null || row.temperature != null || row.pH != null)
      .sort((a, b) => a.depth - b.depth)
    dataByDate.set(date, profileRows)
  })

  return { dates, dataByDate }
}

export function resolveDepthProfileDate(depthProfiles: DepthProfiles, requestedDate: string | null) {
  if (!depthProfiles.dates.length) return null
  if (requestedDate && depthProfiles.dataByDate.has(requestedDate)) return requestedDate
  return depthProfiles.dates[depthProfiles.dates.length - 1] ?? null
}

export function getDepthProfileData(depthProfiles: DepthProfiles, selectedDate: string | null) {
  if (!selectedDate) return []
  return depthProfiles.dataByDate.get(selectedDate) ?? []
}

export function buildCurrentAlerts(rows: WaterQualityLatestStatusRow[]) {
  const alerts: string[] = []
  rows.forEach((row) => {
    if (row.do_exceeded) {
      alerts.push(`${row.system_name ?? `System ${row.system_id}`}: DO below threshold.`)
    }
    if (row.ammonia_exceeded) {
      alerts.push(`${row.system_name ?? `System ${row.system_id}`}: Ammonia above threshold.`)
    }
  })
  return alerts
}
