"use client"

import { normalizeFeedingResponse } from "@/app/feed/_lib/feed-analytics"
import type { FeedingRecordWithType } from "@/lib/api/reports"
import type { Database, Tables } from "@/lib/types/database"
import { isMortalityCause, type MortalityCause } from "@/lib/mortality"

type SystemOption = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]
type AlertLogRow = Tables<"alert_log">
type MortalityEventRow = Tables<"fish_mortality">
type SurvivalTrendRow = Database["public"]["Functions"]["get_survival_trend"]["Returns"][number]
type WaterQualityMeasurementRow = Tables<"api_water_quality_measurements">
type SamplingRow = Tables<"fish_sampling_weight">
export type InvestigationStatus = "open" | "monitoring" | "resolved" | "escalated"

export type MortalityRiskRow = {
  systemId: number
  systemName: string
  deathsToday: number
  deaths7d: number
  survivalPct: number | null
  latestDo: number | null
  latestTemperature: number | null
  lastSampleAgeDays: number | null
  trendDirection: "worsening" | "improving" | "stable" | "no_data"
  trendSlope: number | null
  alertStatus: "critical" | "warning" | "open" | "clear"
  unresolvedAlerts: number
  investigationStatus: InvestigationStatus
  repeatLoss: boolean
  worseningSurvival: boolean
  repeatedLowDo: boolean
  poorAppetite: boolean
  unexplainedLosses: number
  atRiskScore: number
}

export type MortalityKpis = {
  deathsToday: number
  deaths7d: number
  openAlerts: number
  worstSurvival: number | null
  systemsAtRisk: number
  unexplainedLosses: number
}

export type MortalityDriverTrendRow = {
  date: string
  deaths: number
  avgDo: number | null
  avgTemperature: number | null
  poorResponses: number
  feedKg: number
}

export type DriverItem = {
  id: string
  systemId: number
  title: string
  detail: string
  severity: "high" | "medium"
}

type LatestReading = {
  doValue: number | null
  doTimestamp: string | null
  temperatureValue: number | null
  temperatureTimestamp: string | null
}

type PoorAppetiteState = {
  poorResponses7d: number
  consecutivePoor: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000
const LOW_DO_THRESHOLD = 4
const UNEXPLAINED_CAUSES = new Set<MortalityCause>(["unknown", "other"])

function parseDay(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatIsoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function addDays(value: string, offset: number) {
  const parsed = parseDay(value)
  if (!parsed) return value
  return formatIsoDate(new Date(parsed.getTime() + offset * DAY_MS))
}

function dayDiff(later: string, earlier: string) {
  const laterDate = parseDay(later)
  const earlierDate = parseDay(earlier)
  if (!laterDate || !earlierDate) return null
  return Math.max(0, Math.round((laterDate.getTime() - earlierDate.getTime()) / DAY_MS))
}

function slope(values: number[]) {
  if (values.length < 2) return 0
  const n = values.length
  const xMean = (n - 1) / 2
  const yMean = values.reduce((sum, value) => sum + value, 0) / n
  let numerator = 0
  let denominator = 0
  for (let index = 0; index < n; index += 1) {
    const x = index - xMean
    const y = values[index] - yMean
    numerator += x * y
    denominator += x * x
  }
  return denominator === 0 ? 0 : numerator / denominator
}

export function buildSystemNameById(rows: SystemOption[]) {
  const map = new Map<number, string>()
  rows.forEach((row) => {
    if (typeof row.id === "number") {
      map.set(row.id, row.label ?? `System ${row.id}`)
    }
  })
  return map
}

export function buildLatestReadingsBySystem(rows: WaterQualityMeasurementRow[]) {
  const map = new Map<number, LatestReading>()
  rows.forEach((row) => {
    if (row.system_id == null || row.parameter_value == null || !row.date) return
    if (row.parameter_name !== "dissolved_oxygen" && row.parameter_name !== "temperature") return
    const timestamp = `${row.date}T${row.time ?? "00:00"}`
    const current = map.get(row.system_id) ?? {
      doValue: null,
      doTimestamp: null,
      temperatureValue: null,
      temperatureTimestamp: null,
    }
    if (row.parameter_name === "dissolved_oxygen" && (!current.doTimestamp || timestamp > current.doTimestamp)) {
      current.doValue = row.parameter_value
      current.doTimestamp = timestamp
    }
    if (
      row.parameter_name === "temperature" &&
      (!current.temperatureTimestamp || timestamp > current.temperatureTimestamp)
    ) {
      current.temperatureValue = row.parameter_value
      current.temperatureTimestamp = timestamp
    }
    map.set(row.system_id, current)
  })
  return map
}

function buildLastSampleBySystem(rows: SamplingRow[]) {
  const map = new Map<number, SamplingRow>()
  rows.forEach((row) => {
    const current = map.get(row.system_id)
    if (!current || row.date > current.date) {
      map.set(row.system_id, row)
    }
  })
  return map
}

function buildSurvivalBySystem(rows: Array<SurvivalTrendRow & { system_id: number }>) {
  const map = new Map<number, SurvivalTrendRow[]>()
  rows.forEach((row) => {
    const list = map.get(row.system_id) ?? []
    list.push(row)
    map.set(row.system_id, list)
  })
  map.forEach((list, systemId) => {
    list.sort((a, b) => a.event_date.localeCompare(b.event_date))
    map.set(systemId, list)
  })
  return map
}

function buildPoorAppetiteBySystem(rows: FeedingRecordWithType[], todayDate: string) {
  const windowStart = addDays(todayDate, -6)
  const map = new Map<number, PoorAppetiteState>()
  const bySystem = new Map<number, FeedingRecordWithType[]>()
  rows.forEach((row) => {
    if (row.system_id == null || !row.date || row.date < windowStart || row.date > todayDate) return
    const list = bySystem.get(row.system_id) ?? []
    list.push(row)
    bySystem.set(row.system_id, list)
  })

  bySystem.forEach((records, systemId) => {
    const sorted = records
      .slice()
      .sort((a, b) => String(a.created_at ?? a.date).localeCompare(String(b.created_at ?? b.date)))
    let poorResponses7d = 0
    let consecutivePoor = false
    for (let index = 0; index < sorted.length; index += 1) {
      const current = normalizeFeedingResponse(sorted[index]?.feeding_response)
      if (current === "Poor") {
        poorResponses7d += 1
      }
      if (index > 0) {
        const previous = normalizeFeedingResponse(sorted[index - 1]?.feeding_response)
        if (previous === "Poor" && current === "Poor") {
          consecutivePoor = true
        }
      }
    }
    map.set(systemId, { poorResponses7d, consecutivePoor })
  })
  return map
}

function buildAlertStateBySystem(rows: AlertLogRow[]) {
  const map = new Map<
    number,
    {
      unresolved: number
      highestSeverity: "critical" | "warning" | "open" | "clear"
    }
  >()

  rows.forEach((row) => {
    if (row.system_id == null) return
    const current = map.get(row.system_id) ?? { unresolved: 0, highestSeverity: "clear" as const }
    if (!row.acknowledged_at) {
      current.unresolved += 1
      if (row.severity === "critical") {
        current.highestSeverity = "critical"
      } else if (row.severity === "warning" && current.highestSeverity !== "critical") {
        current.highestSeverity = "warning"
      } else if (current.highestSeverity === "clear") {
        current.highestSeverity = "open"
      }
    }
    map.set(row.system_id, current)
  })

  return map
}

function buildDeathsBySystemAndDate(rows: MortalityEventRow[]) {
  const map = new Map<string, number>()
  rows.forEach((row) => {
    map.set(
      `${row.system_id}:${row.date}`,
      (map.get(`${row.system_id}:${row.date}`) ?? 0) + row.number_of_fish_mortality,
    )
  })
  return map
}

function buildRepeatedLowDoBySystem(rows: MortalityEventRow[], measurements: WaterQualityMeasurementRow[]) {
  const doBySystemDate = new Map<string, number[]>()
  measurements.forEach((row) => {
    if (row.system_id == null || row.parameter_name !== "dissolved_oxygen" || row.parameter_value == null || !row.date) return
    const key = `${row.system_id}:${row.date}`
    const list = doBySystemDate.get(key) ?? []
    list.push(row.parameter_value)
    doBySystemDate.set(key, list)
  })

  const systems = new Map<number, number>()
  rows.forEach((row) => {
    const sameDay = doBySystemDate.get(`${row.system_id}:${row.date}`) ?? []
    const previousDay = doBySystemDate.get(`${row.system_id}:${addDays(row.date, -1)}`) ?? []
    const combined = [...sameDay, ...previousDay]
    if (!combined.length) return
    const avg = combined.reduce((sum, value) => sum + value, 0) / combined.length
    if (avg < LOW_DO_THRESHOLD) {
      systems.set(row.system_id, (systems.get(row.system_id) ?? 0) + 1)
    }
  })

  const result = new Map<number, boolean>()
  systems.forEach((count, systemId) => {
    result.set(systemId, count >= 2)
  })
  return result
}

export function buildMortalityRiskRows(params: {
  systems: SystemOption[]
  events: MortalityEventRow[]
  alerts: AlertLogRow[]
  survivalRows: Array<SurvivalTrendRow & { system_id: number }>
  measurements: WaterQualityMeasurementRow[]
  samplingRows: SamplingRow[]
  feedingRows: FeedingRecordWithType[]
  todayDate: string
  investigationBySystemId: Record<string, InvestigationStatus>
}) {
  const systemNameById = buildSystemNameById(params.systems)
  const latestReadingsBySystem = buildLatestReadingsBySystem(params.measurements)
  const lastSampleBySystem = buildLastSampleBySystem(params.samplingRows)
  const survivalBySystem = buildSurvivalBySystem(params.survivalRows)
  const poorAppetiteBySystem = buildPoorAppetiteBySystem(params.feedingRows, params.todayDate)
  const alertStateBySystem = buildAlertStateBySystem(params.alerts)
  const deathsBySystemDate = buildDeathsBySystemAndDate(params.events)
  const repeatedLowDoBySystem = buildRepeatedLowDoBySystem(params.events, params.measurements)
  const sevenDayStart = addDays(params.todayDate, -6)

  const systemIds = params.systems
    .map((row) => row.id)
    .filter((id): id is number => typeof id === "number")

  const rows: MortalityRiskRow[] = systemIds.map((systemId) => {
    const systemEvents = params.events.filter((row) => row.system_id === systemId)
    const recentEvents = systemEvents.filter((row) => row.date >= sevenDayStart && row.date <= params.todayDate)
    const deathsToday = recentEvents
      .filter((row) => row.date === params.todayDate)
      .reduce((sum, row) => sum + row.number_of_fish_mortality, 0)
    const deaths7d = recentEvents.reduce((sum, row) => sum + row.number_of_fish_mortality, 0)
    const mortalityDays7d = new Set(recentEvents.map((row) => row.date)).size
    const unexplainedLosses = recentEvents
      .filter((row) => isMortalityCause(row.cause) && UNEXPLAINED_CAUSES.has(row.cause))
      .reduce((sum, row) => sum + row.number_of_fish_mortality, 0)

    const survivalSeries = survivalBySystem.get(systemId) ?? []
    const survivalWindow = survivalSeries.filter(
      (row) => row.event_date >= sevenDayStart && row.event_date <= params.todayDate,
    )
    const latestSurvival = survivalWindow[survivalWindow.length - 1] ?? survivalSeries[survivalSeries.length - 1] ?? null
    const survivalPct = latestSurvival?.survival_pct ?? null
    const survivalSlope =
      survivalWindow.length >= 2
        ? slope(survivalWindow.map((row) => row.survival_pct).filter((value) => Number.isFinite(value)))
        : null
    const worseningSurvival = survivalSlope != null && survivalSlope < -0.03
    const trendDirection =
      survivalSlope == null
        ? ("no_data" as const)
        : survivalSlope < -0.03
          ? ("worsening" as const)
          : survivalSlope > 0.03
            ? ("improving" as const)
            : ("stable" as const)

    const reading = latestReadingsBySystem.get(systemId)
    const latestDo = reading?.doValue ?? null
    const latestTemperature = reading?.temperatureValue ?? null
    const lastSample = lastSampleBySystem.get(systemId) ?? null
    const lastSampleAgeDays =
      lastSample?.date != null ? dayDiff(params.todayDate, lastSample.date) : null
    const poorAppetite = poorAppetiteBySystem.get(systemId)?.consecutivePoor ?? false
    const alertState = alertStateBySystem.get(systemId) ?? { unresolved: 0, highestSeverity: "clear" as const }
    const repeatLoss = mortalityDays7d >= 2
    const repeatedLowDo = repeatedLowDoBySystem.get(systemId) ?? false
    const deathsYesterday = deathsBySystemDate.get(`${systemId}:${addDays(params.todayDate, -1)}`) ?? 0

    let atRiskScore = 0
    if (deathsToday > 0) atRiskScore += 4
    if (deaths7d > 0) atRiskScore += 2
    if (deathsYesterday > 0 && deathsToday > deathsYesterday) atRiskScore += 2
    if (repeatLoss) atRiskScore += 2
    if (worseningSurvival) atRiskScore += 2
    if (repeatedLowDo) atRiskScore += 2
    if (poorAppetite) atRiskScore += 1
    if (alertState.highestSeverity === "critical") atRiskScore += 3
    if (alertState.highestSeverity === "warning") atRiskScore += 2
    if (unexplainedLosses > 0) atRiskScore += 1
    if (latestDo != null && latestDo < LOW_DO_THRESHOLD) atRiskScore += 2

    return {
      systemId,
      systemName: systemNameById.get(systemId) ?? `System ${systemId}`,
      deathsToday,
      deaths7d,
      survivalPct,
      latestDo,
      latestTemperature,
      lastSampleAgeDays,
      trendDirection,
      trendSlope: survivalSlope,
      alertStatus: alertState.highestSeverity,
      unresolvedAlerts: alertState.unresolved,
      investigationStatus: params.investigationBySystemId[String(systemId)] ?? "open",
      repeatLoss,
      worseningSurvival,
      repeatedLowDo,
      poorAppetite,
      unexplainedLosses,
      atRiskScore,
    }
  })

  return rows.sort((a, b) => {
    if (b.atRiskScore !== a.atRiskScore) return b.atRiskScore - a.atRiskScore
    if (b.deathsToday !== a.deathsToday) return b.deathsToday - a.deathsToday
    return b.deaths7d - a.deaths7d
  })
}

export function buildMortalityKpis(rows: MortalityRiskRow[], alerts: AlertLogRow[]): MortalityKpis {
  const unresolvedAlerts = alerts.filter((row) => !row.acknowledged_at).length
  const survivals = rows.map((row) => row.survivalPct).filter((value): value is number => typeof value === "number")
  return {
    deathsToday: rows.reduce((sum, row) => sum + row.deathsToday, 0),
    deaths7d: rows.reduce((sum, row) => sum + row.deaths7d, 0),
    openAlerts: unresolvedAlerts,
    worstSurvival: survivals.length ? Math.min(...survivals) : null,
    systemsAtRisk: rows.filter((row) => row.atRiskScore >= 4).length,
    unexplainedLosses: rows.reduce((sum, row) => sum + row.unexplainedLosses, 0),
  }
}

export function buildDeathsTrend(events: MortalityEventRow[]) {
  const byDate = new Map<string, number>()
  events.forEach((row) => {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.number_of_fish_mortality)
  })
  return Array.from(byDate.entries())
    .map(([date, deaths]) => ({ date, deaths }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function buildSurvivalTrend(rows: Array<SurvivalTrendRow & { system_id: number }>) {
  const byDate = new Map<string, { dailyDeaths: number; liveCount: number; stocked: number }>()
  rows.forEach((row) => {
    const current = byDate.get(row.event_date) ?? { dailyDeaths: 0, liveCount: 0, stocked: 0 }
    current.dailyDeaths += row.daily_deaths ?? 0
    current.liveCount += row.live_count ?? 0
    current.stocked += row.stocked ?? 0
    byDate.set(row.event_date, current)
  })
  return Array.from(byDate.entries())
    .map(([date, row]) => ({
      date,
      dailyDeaths: row.dailyDeaths,
      liveCount: row.liveCount,
      survivalPct: row.stocked > 0 ? (row.liveCount / row.stocked) * 100 : null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function buildDriverTrend(params: {
  events: MortalityEventRow[]
  measurements: WaterQualityMeasurementRow[]
  feedingRows: FeedingRecordWithType[]
}) {
  const byDate = new Map<string, MortalityDriverTrendRow>()
  params.events.forEach((row) => {
    const current = byDate.get(row.date) ?? {
      date: row.date,
      deaths: 0,
      avgDo: null,
      avgTemperature: null,
      poorResponses: 0,
      feedKg: 0,
    }
    current.deaths += row.number_of_fish_mortality
    byDate.set(row.date, current)
  })

  const doAgg = new Map<string, { sum: number; count: number }>()
  const tempAgg = new Map<string, { sum: number; count: number }>()

  params.measurements.forEach((row) => {
    if (!row.date || row.parameter_value == null) return
    if (row.parameter_name === "dissolved_oxygen") {
      const current = doAgg.get(row.date) ?? { sum: 0, count: 0 }
      current.sum += row.parameter_value
      current.count += 1
      doAgg.set(row.date, current)
    }
    if (row.parameter_name === "temperature") {
      const current = tempAgg.get(row.date) ?? { sum: 0, count: 0 }
      current.sum += row.parameter_value
      current.count += 1
      tempAgg.set(row.date, current)
    }
  })

  params.feedingRows.forEach((row) => {
    if (!row.date) return
    const current = byDate.get(row.date) ?? {
      date: row.date,
      deaths: 0,
      avgDo: null,
      avgTemperature: null,
      poorResponses: 0,
      feedKg: 0,
    }
    current.feedKg += row.feeding_amount ?? 0
    if (normalizeFeedingResponse(row.feeding_response) === "Poor") {
      current.poorResponses += 1
    }
    byDate.set(row.date, current)
  })

  return Array.from(byDate.values())
    .map((row) => {
      const doStats = doAgg.get(row.date)
      const tempStats = tempAgg.get(row.date)
      return {
        ...row,
        avgDo: doStats && doStats.count > 0 ? doStats.sum / doStats.count : null,
        avgTemperature: tempStats && tempStats.count > 0 ? tempStats.sum / tempStats.count : null,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function buildDriverItems(rows: MortalityRiskRow[]) {
  const items: DriverItem[] = []
  rows.forEach((row) => {
    if (row.repeatedLowDo) {
      items.push({
        id: `do-${row.systemId}`,
        systemId: row.systemId,
        title: `${row.systemName}: repeated low DO before mortality`,
        detail: row.latestDo != null ? `Latest DO ${row.latestDo.toFixed(1)} mg/L.` : "Low oxygen preceded multiple loss days.",
        severity: "high",
      })
    }
    if (row.worseningSurvival) {
      items.push({
        id: `survival-${row.systemId}`,
        systemId: row.systemId,
        title: `${row.systemName}: survival slope is deteriorating`,
        detail: row.survivalPct != null ? `Current survival ${row.survivalPct.toFixed(1)}%.` : "Recent survival series is worsening.",
        severity: "high",
      })
    }
    if (row.poorAppetite) {
      items.push({
        id: `appetite-${row.systemId}`,
        systemId: row.systemId,
        title: `${row.systemName}: appetite issue around mortality`,
        detail: "Consecutive poor feeding responses were recorded in the last 7 days.",
        severity: "medium",
      })
    }
    if (row.repeatLoss) {
      items.push({
        id: `repeat-${row.systemId}`,
        systemId: row.systemId,
        title: `${row.systemName}: repeat-loss pattern`,
        detail: `${row.deaths7d.toLocaleString()} deaths across multiple days in the last 7 days.`,
        severity: "medium",
      })
    }
    if (row.unresolvedAlerts >= 2) {
      items.push({
        id: `alerts-${row.systemId}`,
        systemId: row.systemId,
        title: `${row.systemName}: multiple unresolved alerts`,
        detail: `${row.unresolvedAlerts} mortality alerts remain open.`,
        severity: "high",
      })
    }
    if (row.unexplainedLosses > 0) {
      items.push({
        id: `unknown-${row.systemId}`,
        systemId: row.systemId,
        title: `${row.systemName}: unexplained losses`,
        detail: `${row.unexplainedLosses.toLocaleString()} fish recorded as unknown or other cause.`,
        severity: "medium",
      })
    }
  })

  return items
    .sort((a, b) => (a.severity === b.severity ? a.title.localeCompare(b.title) : a.severity === "high" ? -1 : 1))
    .slice(0, 8)
}
