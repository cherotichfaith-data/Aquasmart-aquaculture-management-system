import type {
  WaterQualityActivityRow,
  WaterQualityLatestStatusRow,
  WaterQualityMeasurementViewRow,
  WaterQualityOverlayRow,
  WaterQualityRatingRow,
  WaterQualitySystemOption,
  WaterQualityThresholdRow,
} from "@/features/water-quality/types"
import {
  operatorColumns,
  parameterLabels,
  parseJsonish,
  slope,
  type MeasurementEvent,
  type WqParameter,
} from "./water-quality-utils"
import { calculateWqi, getWqiLabel, selectThresholdRow, type WaterQualityStatusLabel } from "@/lib/water-quality-index"

export type EnvParameter =
  | "dissolved_oxygen"
  | "temperature"
  | "pH"
  | "ammonia"
  | "nitrite"
  | "nitrate"
  | "salinity"
  | "secchi_disk_depth"

export type CurrentReadings = Partial<Record<EnvParameter, number>>

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

export type LatestReadingState = {
  readings: CurrentReadings
  timestamps: Partial<Record<EnvParameter, string>>
}

export type SensorStatus = {
  status: "online" | "warning" | "offline"
  lastSeen: string | null
  minutesSince: number | null
}

export type NutrientLoad = {
  value: number
  level: string
  color: string
}

export type AlgalActivity = {
  value: number
  level: string
  color: string
  source: number | null
}

export type SystemWqiRow = WaterQualitySystemListItem & {
  wqi: number | null
  wqiLabel: WaterQualityStatusLabel
}

export type DiurnalDoPatternRow = {
  time: string
  sortKey: number
  [seriesKey: string]: string | number | null
}

export type DiurnalDoPattern = {
  rows: DiurnalDoPatternRow[]
  dateSeries: string[]
  insufficientSamples: boolean
  dominantTimeLabel: string | null
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

export type AlertItem = {
  id: string
  message: string
  priority: "high" | "medium"
  systemId?: number
}

export type OverlayByDate = Map<string, { feeding: number; mortality: number }>

export type DailyRiskTrendRow = {
  date: string
  rating: number | null
  worstParameter: string | null
  feeding: number | null
  mortality: number | null
}

export type ParameterTrendRow = {
  date: string
  mean: number | null
  count: number
  feeding: number | null
  mortality: number | null
  rolling: number | null
}

export type DepthProfiles = {
  dates: string[]
  dataByDate: Map<string, DepthProfileRow[]>
}

const ENV_PARAMETERS = new Set<EnvParameter>([
  "dissolved_oxygen",
  "temperature",
  "pH",
  "ammonia",
  "nitrite",
  "nitrate",
  "salinity",
  "secchi_disk_depth",
])

export { calculateWqi, getWqiLabel, selectThresholdRow }
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

export function buildRatingTrendBySystemId(rows: WaterQualityRatingRow[]) {
  const map = new Map<number, number>()
  const grouped = new Map<number, Array<{ date: string; rating: number }>>()

  rows.forEach((row) => {
    if (row.system_id == null || row.rating_date == null || typeof row.rating_numeric !== "number") return
    const list = grouped.get(row.system_id) ?? []
    list.push({ date: row.rating_date, rating: row.rating_numeric })
    grouped.set(row.system_id, list)
  })

  grouped.forEach((list, systemId) => {
    list.sort((a, b) => a.date.localeCompare(b.date))
    map.set(systemId, slope(list.slice(-7).map((item) => item.rating)))
  })

  return map
}

export function buildOperatorByRecordId(rows: WaterQualityActivityRow[]) {
  const map = new Map<string, string>()
  rows.forEach((row) => {
    if (!row.record_id || !row.column_name || !operatorColumns.has(row.column_name)) return
    const parsed = parseJsonish(row.new_value)
    if (!parsed) return
    map.set(String(row.record_id), parsed)
  })
  return map
}

export function buildLatestReadingsBySystem(rows: WaterQualityMeasurementViewRow[]) {
  const map = new Map<number, LatestReadingState>()

  rows.forEach((row) => {
    if (!row.system_id || row.parameter_value == null || !row.date) return
    const parameter = row.parameter_name as EnvParameter
    if (!ENV_PARAMETERS.has(parameter)) return
    const timestamp = `${row.date}T${row.time ?? "00:00"}`
    const entry = map.get(row.system_id) ?? { readings: {}, timestamps: {} }
    const previous = entry.timestamps[parameter]
    if (!previous || timestamp > previous) {
      entry.timestamps[parameter] = timestamp
      entry.readings[parameter] = row.parameter_value
    }
    map.set(row.system_id, entry)
  })

  return map
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

export function formatSensorLag(timestamp: string | null) {
  if (!timestamp) return "No data"
  const last = new Date(timestamp)
  if (Number.isNaN(last.getTime())) return "No data"
  const diffMs = Date.now() - last.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (diffHours > 24) return `${Math.floor(diffHours / 24)}d ${diffHours % 24}h ago`
  if (diffHours > 0) return `${diffHours}h ${diffMins}m ago`
  return `${diffMins}m ago`
}

export function buildSensorStatusBySystem(
  systemOptions: WaterQualitySystemListItem[],
  lastMeasurementBySystemId: Map<number, string>,
  now = Date.now(),
) {
  const map = new Map<number, SensorStatus>()

  systemOptions.forEach((system) => {
    const lastTimestamp = lastMeasurementBySystemId.get(system.id) ?? null
    if (!lastTimestamp) {
      map.set(system.id, { status: "offline", lastSeen: null, minutesSince: null })
      return
    }

    const parsed = new Date(lastTimestamp)
    if (Number.isNaN(parsed.getTime())) {
      map.set(system.id, { status: "offline", lastSeen: lastTimestamp, minutesSince: null })
      return
    }

    const diffMinutes = Math.floor((now - parsed.getTime()) / (1000 * 60))
    const status = diffMinutes <= 360 ? "online" : diffMinutes <= 1440 ? "warning" : "offline"
    map.set(system.id, { status, lastSeen: lastTimestamp, minutesSince: diffMinutes })
  })

  return map
}

export function buildSensorCounts(sensorStatusBySystem: Map<number, SensorStatus>) {
  const counts = { online: 0, warning: 0, offline: 0 }
  sensorStatusBySystem.forEach((value) => {
    counts[value.status] += 1
  })
  return counts
}

export function buildAggregatedReadings(latestReadingsBySystem: Map<number, LatestReadingState>) {
  const totals = new Map<EnvParameter, { sum: number; count: number }>()

  latestReadingsBySystem.forEach((entry) => {
    Object.entries(entry.readings).forEach(([key, value]) => {
      if (value == null || !Number.isFinite(value)) return
      const param = key as EnvParameter
      const current = totals.get(param) ?? { sum: 0, count: 0 }
      current.sum += value
      current.count += 1
      totals.set(param, current)
    })
  })

  const aggregate: CurrentReadings = {}
  totals.forEach((value, key) => {
    aggregate[key] = value.count > 0 ? value.sum / value.count : undefined
  })

  return aggregate
}

export function getSelectedReadings(
  selectedSystemId: number | undefined,
  latestReadingsBySystem: Map<number, LatestReadingState>,
  aggregatedReadings: CurrentReadings,
) {
  return selectedSystemId != null ? latestReadingsBySystem.get(selectedSystemId)?.readings ?? {} : aggregatedReadings
}

export function getTemperatureStats(rows: WaterQualityMeasurementViewRow[]) {
  const values = rows
    .filter((row) => row.parameter_name === "temperature")
    .map((row) => row.parameter_value)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))

  if (!values.length) return { mean: null, std: null }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.length > 1 ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length : 0
  return { mean, std: Math.sqrt(variance) }
}

export function buildNutrientLoad(readings: CurrentReadings): NutrientLoad {
  const nitrate = readings.nitrate
  const nitrite = readings.nitrite
  const ammonia = readings.ammonia
  const hasData = nitrate != null || nitrite != null || ammonia != null
  const value = hasData ? (nitrate ?? 0) + (nitrite ?? 0) + (ammonia ?? 0) : 0

  if (!hasData) return { value: 0, level: "No data", color: "var(--muted-foreground)" }
  if (value >= 2) return { value, level: "High", color: "#EF4444" }
  if (value >= 1) return { value, level: "Moderate", color: "#F59E0B" }
  return { value, level: "Low", color: "#10B981" }
}

export function buildAlgalActivity(readings: CurrentReadings): AlgalActivity {
  const secchi = readings.secchi_disk_depth
  if (secchi == null || !Number.isFinite(secchi)) {
    return { value: 0, level: "No data", color: "var(--muted-foreground)", source: null }
  }
  const value = Math.max(0, Math.min(50, 50 - secchi * 10))
  if (value >= 30) return { value, level: "High", color: "#EF4444", source: secchi }
  if (value >= 10) return { value, level: "Moderate", color: "#10B981", source: secchi }
  return { value, level: "Low", color: "#3B82F6", source: secchi }
}

export function buildAllSystemsWqi(
  systemOptions: WaterQualitySystemListItem[],
  latestReadingsBySystem: Map<number, LatestReadingState>,
  thresholdRows: WaterQualityThresholdRow[],
  temperatureStats: { mean: number | null; std: number | null },
) {
  return systemOptions.map((system) => {
    const readings = latestReadingsBySystem.get(system.id)?.readings ?? {}
    const thresholdRow = selectThresholdRow(thresholdRows, system.id)
    const wqi = calculateWqi(
      readings.dissolved_oxygen ?? null,
      readings.temperature ?? null,
      thresholdRow?.low_do_threshold ?? 5,
      temperatureStats.mean,
      temperatureStats.std,
    )
    return {
      ...system,
      wqi,
      wqiLabel: getWqiLabel(wqi),
    }
  })
}

export function getAverageWqi(allSystemsWqi: SystemWqiRow[]) {
  const values = allSystemsWqi.map((system) => system.wqi).filter((value): value is number => typeof value === "number")
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function normalizeTimeLabel(value: string | null) {
  if (!value) return null
  const match = String(value).match(/^(\d{2}:\d{2})/)
  return match ? match[1] : String(value).slice(0, 5)
}

function timeLabelToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.MAX_SAFE_INTEGER
  return hours * 60 + minutes
}

export function buildDiurnalDoPattern(rows: WaterQualityMeasurementViewRow[]): DiurnalDoPattern {
  const doRows = rows
    .filter((row) => row.parameter_name === "dissolved_oxygen")
    .filter(
      (row): row is WaterQualityMeasurementViewRow & { date: string; time: string; parameter_value: number } =>
        row.date != null && row.time != null && typeof row.parameter_value === "number",
    )

  const recentDates = Array.from(new Set(doRows.map((row) => row.date)))
    .sort((left, right) => right.localeCompare(left))
    .slice(0, 7)
    .sort((left, right) => left.localeCompare(right))

  if (!recentDates.length) {
    return { rows: [], dateSeries: [], insufficientSamples: true, dominantTimeLabel: null }
  }

  const dateSet = new Set(recentDates)
  const filteredRows = doRows.filter((row) => dateSet.has(row.date))
  const byTime = new Map<string, DiurnalDoPatternRow>()
  const timeFrequency = new Map<string, number>()
  const timesByDate = new Map<string, Set<string>>()
  const aggregateByDateAndTime = new Map<string, { sum: number; count: number }>()

  filteredRows.forEach((row) => {
    const timeLabel = normalizeTimeLabel(row.time)
    if (!timeLabel) return
    const aggregateKey = `${row.date}|${timeLabel}`
    const current = aggregateByDateAndTime.get(aggregateKey) ?? { sum: 0, count: 0 }
    current.sum += row.parameter_value
    current.count += 1
    aggregateByDateAndTime.set(aggregateKey, current)

    timeFrequency.set(timeLabel, (timeFrequency.get(timeLabel) ?? 0) + 1)
    const dateTimes = timesByDate.get(row.date) ?? new Set<string>()
    dateTimes.add(timeLabel)
    timesByDate.set(row.date, dateTimes)
  })

  aggregateByDateAndTime.forEach((aggregate, key) => {
    const [date, timeLabel] = key.split("|")
    const row = byTime.get(timeLabel) ?? { time: timeLabel, sortKey: timeLabelToMinutes(timeLabel) }
    row[date] = aggregate.count > 0 ? aggregate.sum / aggregate.count : null
    byTime.set(timeLabel, row)
  })

  const dominantTimeLabel =
    Array.from(timeFrequency.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
  const averageSamplesPerDate =
    timesByDate.size > 0
      ? Array.from(timesByDate.values()).reduce((sum, set) => sum + set.size, 0) / timesByDate.size
      : 0

  return {
    rows: Array.from(byTime.values()).sort((left, right) => left.sortKey - right.sortKey),
    dateSeries: recentDates,
    insufficientSamples: averageSamplesPerDate < 2,
    dominantTimeLabel,
  }
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

export function buildAlertItems(criticalRiskRows: SystemRiskRow[]): AlertItem[] {
  return criticalRiskRows.slice(0, 6).map((row) => {
    const worstParam = row.worstParameter
      ? parameterLabels[row.worstParameter as WqParameter] ?? row.worstParameter
      : "Risk"
    const value =
      row.worstValue != null
        ? `${row.worstValue.toFixed(2)}${row.worstUnit ? ` ${row.worstUnit}` : ""}`
        : row.thresholdBreached
          ? "Threshold breach"
          : "Rating decline"

    return {
      id: `${row.systemId}-${row.ratingDate ?? "latest"}`,
      message: `${row.systemName}: ${worstParam} ${value}`,
      priority: row.severity >= 3 || row.thresholdBreached ? "high" : "medium",
      systemId: row.systemId,
    }
  })
}

export function buildOverlayByDate(rows: WaterQualityOverlayRow[], scopedSystemIds: number[]): OverlayByDate {
  const map = new Map<string, { feeding: number; mortality: number }>()
  rows.forEach((row) => {
    if (!row.inventory_date || !scopedSystemIds.includes(row.system_id)) return
    const current = map.get(row.inventory_date) ?? { feeding: 0, mortality: 0 }
    current.feeding += row.feeding_amount ?? 0
    current.mortality += row.number_of_fish_mortality ?? 0
    map.set(row.inventory_date, current)
  })
  return map
}

export function buildDailyRiskTrend(rows: WaterQualityRatingRow[], overlayByDate: OverlayByDate): DailyRiskTrendRow[] {
  const byDate = new Map<string, { worst: { parameter: string | null; rating: number } }>()

  rows.forEach((row) => {
    if (!row.rating_date || typeof row.rating_numeric !== "number") return
    const current = byDate.get(row.rating_date) ?? { worst: { parameter: null, rating: 999 } }
    if (row.rating_numeric < current.worst.rating) {
      current.worst = { parameter: row.worst_parameter ?? null, rating: row.rating_numeric }
    }
    byDate.set(row.rating_date, current)
  })

  return Array.from(byDate.entries())
    .map(([date, agg]) => ({
      date,
      rating: agg.worst.rating !== 999 ? agg.worst.rating : null,
      worstParameter: agg.worst.parameter,
      feeding: overlayByDate.get(date)?.feeding ?? null,
      mortality: overlayByDate.get(date)?.mortality ?? null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function buildParameterTrendData(
  rows: WaterQualityMeasurementViewRow[],
  selectedParameter: WqParameter,
  overlayByDate: OverlayByDate,
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
      feeding: overlayByDate.get(date)?.feeding ?? null,
      mortality: overlayByDate.get(date)?.mortality ?? null,
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

export function buildDailyDoVariation(rows: WaterQualityMeasurementViewRow[]) {
  const byDate = new Map<string, { min: number; max: number }>()

  rows
    .filter((row) => row.parameter_name === "dissolved_oxygen")
    .forEach((row) => {
      if (!row.date || row.parameter_value == null) return
      const current = byDate.get(row.date)
      if (!current) {
        byDate.set(row.date, { min: row.parameter_value, max: row.parameter_value })
        return
      }
      current.min = Math.min(current.min, row.parameter_value)
      current.max = Math.max(current.max, row.parameter_value)
    })

  return Array.from(byDate.entries())
    .map(([date, agg]) => ({
      date,
      variation: agg.max - agg.min,
      min: agg.min,
      max: agg.max,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function buildDailyTempAverage(rows: WaterQualityMeasurementViewRow[]) {
  const byDate = new Map<string, { sum: number; count: number }>()

  rows
    .filter((row) => row.parameter_name === "temperature")
    .forEach((row) => {
      if (!row.date || row.parameter_value == null) return
      const current = byDate.get(row.date) ?? { sum: 0, count: 0 }
      current.sum += row.parameter_value
      current.count += 1
      byDate.set(row.date, current)
    })

  return Array.from(byDate.entries())
    .map(([date, agg]) => ({
      date,
      average: agg.count > 0 ? agg.sum / agg.count : null,
    }))
    .filter((row) => row.average != null)
    .sort((a, b) => a.date.localeCompare(b.date))
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

export function buildDailyParameterByDate(rows: WaterQualityMeasurementViewRow[]) {
  const map = new Map<string, { doValue?: number; ammoniaValue?: number; tempValue?: number }>()
  rows.forEach((row) => {
    if (!row.date || row.parameter_value == null) return
    const current = map.get(row.date) ?? {}
    if (row.parameter_name === "dissolved_oxygen") current.doValue = row.parameter_value
    if (row.parameter_name === "ammonia") current.ammoniaValue = row.parameter_value
    if (row.parameter_name === "temperature") current.tempValue = row.parameter_value
    map.set(row.date, current)
  })
  return map
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

export function buildEmergingRisks(
  dailyParameterByDate: Map<string, { doValue?: number; ammoniaValue?: number; tempValue?: number }>,
  dailyRiskTrend: DailyRiskTrendRow[],
) {
  const alerts: string[] = []
  const doSeries = dailyRiskTrend
    .map((row) => dailyParameterByDate.get(row.date)?.doValue)
    .filter((value): value is number => typeof value === "number")
    .slice(-7)
  const ammoniaSeries = dailyRiskTrend
    .map((row) => dailyParameterByDate.get(row.date)?.ammoniaValue)
    .filter((value): value is number => typeof value === "number")
    .slice(-7)

  if (doSeries.length >= 4 && slope(doSeries) < -0.05) {
    alerts.push("DO trend is worsening over the last 7 days.")
  }
  if (ammoniaSeries.length >= 4 && slope(ammoniaSeries) > 0.02) {
    alerts.push("Ammonia trend is rising over the last 7 days.")
  }

  const ratingSeries = dailyRiskTrend
    .map((row) => row.rating)
    .filter((value): value is number => typeof value === "number")
    .slice(-14)
  if (ratingSeries.length >= 5) {
    const mean = ratingSeries.reduce((sum, value) => sum + value, 0) / ratingSeries.length
    const variance = ratingSeries.reduce((sum, value) => sum + (value - mean) ** 2, 0) / ratingSeries.length
    if (Math.sqrt(variance) >= 0.6) {
      alerts.push("Daily rating volatility is high (frequent swings).")
    }
  }

  const worstSeries = dailyRiskTrend
    .map((row) => row.worstParameter)
    .filter((value): value is string => Boolean(value))
    .slice(-14)
  let switches = 0
  for (let index = 1; index < worstSeries.length; index += 1) {
    if (worstSeries[index] !== worstSeries[index - 1]) switches += 1
  }
  if (switches >= 4) {
    alerts.push("Worst parameter is switching frequently; system may be unstable.")
  }

  return alerts
}
