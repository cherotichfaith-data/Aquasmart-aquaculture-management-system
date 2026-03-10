"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Droplets,
  FlaskConical,
  Gauge,
  Layers,
  Leaf,
  Radio,
  Thermometer,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { useActiveFarm } from "@/hooks/use-active-farm"
import {
  useAlertThresholds,
  useLatestWaterQualityStatus,
  useWaterQualitySyncStatus,
  useWaterQualityOverlay,
  useWaterQualityMeasurements,
  useDailyWaterQualityRating,
} from "@/lib/hooks/use-water-quality"
import { useRecentActivities } from "@/lib/hooks/use-dashboard"
import { useSharedFilters } from "@/hooks/use-shared-filters"
import { useTimePeriodBounds } from "@/hooks/use-time-period-bounds"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import {
  formatTimestamp,
  getResultRows,
  operatorColumns,
  parameterLabels,
  parseJsonish,
  slope,
  type MeasurementEvent,
  type WqParameter,
} from "./water-quality-utils"
import { DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formatDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
}

const WATER_QUALITY_TABS = new Set([
  "overview",
  "alerts",
  "sensors",
  "parameter",
  "environment",
  "depth",
])

const CHART_TABS = new Set(["parameter", "environment", "depth"])

type DepthProfileRow = {
  depth: number
  dissolvedOxygen: number | null
  temperature: number | null
  pH: number | null
}

const DepthProfileTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: number | string
}) => {
  if (!active || !payload || payload.length === 0) return null
  const depthLabel = typeof label === "number" ? label.toFixed(1) : String(label ?? "")
  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-md">
      <p className="mb-2 text-xs text-muted-foreground">Depth: {depthLabel} m</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color ?? "currentColor" }} />
          <span className="text-muted-foreground">{entry.name ?? "Value"}:</span>
          <span className="font-semibold text-foreground">
            {typeof entry.value === "number" ? entry.value.toFixed(2) : "--"}
          </span>
        </div>
      ))}
    </div>
  )
}

const getDoColor = (value: number) => {
  if (value < 3) return "#EF4444"
  if (value < 5) return "#F59E0B"
  return "#10B981"
}

type EnvParameter =
  | "dissolved_oxygen"
  | "temperature"
  | "pH"
  | "ammonia_ammonium"
  | "nitrite"
  | "nitrate"
  | "salinity"
  | "secchi_disk_depth"

type CurrentReadings = Partial<Record<EnvParameter, number>>

const ENV_PARAMETERS = new Set<EnvParameter>([
  "dissolved_oxygen",
  "temperature",
  "pH",
  "ammonia_ammonium",
  "nitrite",
  "nitrate",
  "salinity",
  "secchi_disk_depth",
])

const getWqiLabel = (value: number | null) => {
  if (value == null) return { label: "No data", color: "hsl(var(--muted-foreground))" }
  if (value >= 70) return { label: "Good", color: "#10B981" }
  if (value >= 50) return { label: "Moderate", color: "#F59E0B" }
  return { label: "Poor", color: "#EF4444" }
}

const scoreDissolvedOxygen = (value: number | null, lowDoThreshold: number) => {
  if (value == null) return null
  if (value >= lowDoThreshold * 1.2) return 90
  if (value >= lowDoThreshold) return 60
  if (value >= lowDoThreshold * 0.8) return 30
  return 0
}

const scoreTemperature = (value: number | null, tempMean: number | null, tempStd: number | null) => {
  if (value == null || tempMean == null || tempStd == null || tempStd === 0) return null
  const delta = Math.abs(value - tempMean)
  if (delta <= tempStd) return 90
  if (delta <= tempStd * 2) return 60
  if (delta <= tempStd * 3) return 30
  return 0
}

const calculateWqi = (
  doValue: number | null,
  tempValue: number | null,
  lowDoThreshold: number,
  tempMean: number | null,
  tempStd: number | null,
) => {
  const doScore = scoreDissolvedOxygen(doValue, lowDoThreshold)
  const tempScore = scoreTemperature(tempValue, tempMean, tempStd)
  if (doScore == null || tempScore == null) return null
  return (doScore + tempScore) / 2
}

const CircularGauge = ({
  value,
  max,
  color,
  label,
  size = 160,
}: {
  value: number
  max: number
  color: string
  label: string
  size?: number
}) => {
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const progress = max > 0 ? Math.min(value / max, 1) : 0
  const strokeDashoffset = circumference * (1 - progress)
  const center = size / 2

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{Math.round(value)}</span>
        <span className="mt-0.5 text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

export default function WaterQualityPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { farmId } = useActiveFarm()

  const {
    selectedBatch,
    selectedSystem,
    setSelectedSystem,
    selectedStage,
    timePeriod,
  } = useSharedFilters("month")
  const selectedSystemValue = selectedSystem
  const isAllSystemsSelected = selectedSystem === "all"
  const [selectedParameter, setSelectedParameter] = useState<WqParameter>("dissolved_oxygen")
  const [showFeedingOverlay, setShowFeedingOverlay] = useState(true)
  const [showMortalityOverlay, setShowMortalityOverlay] = useState(true)
  const [depthProfileDate, setDepthProfileDate] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab")
    return tab && WATER_QUALITY_TABS.has(tab) ? tab : "overview"
  })
  const chartLimit = 2000

  const {
    selectedSystemId,
    scopedSystemIdList,
    systemsQuery,
    batchSystemsQuery,
  } = useScopedSystemIds({
    farmId,
    selectedStage,
    selectedBatch,
    selectedSystem,
  })

  const boundsQuery = useTimePeriodBounds({ farmId, timePeriod })
  const dateFrom = boundsQuery.start ?? undefined
  const dateTo = boundsQuery.end ?? undefined
  const boundsReady = boundsQuery.hasBounds
  const syncStatusQuery = useWaterQualitySyncStatus()
  const latestStatusQuery = useLatestWaterQualityStatus(selectedSystemId)
  const ratingsQuery = useDailyWaterQualityRating({
    systemId: selectedSystemId,
    dateFrom,
    dateTo,
    requireSystem: false,
    limit: chartLimit,
    enabled: boundsReady,
  })
  const measurementsQuery = useWaterQualityMeasurements({
    systemId: selectedSystemId,
    dateFrom,
    dateTo,
    requireSystem: false,
    limit: chartLimit,
    enabled: boundsReady,
  })
  const overlayQuery = useWaterQualityOverlay({
    systemId: selectedSystemId,
    dateFrom,
    dateTo,
    requireSystem: false,
    enabled: boundsReady,
  })
  const activitiesQuery = useRecentActivities({
    tableName: "water_quality_measurement",
    dateFrom: dateFrom ? `${dateFrom}T00:00:00` : undefined,
    dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
    limit: 1500,
    enabled: boundsReady,
  })
  const thresholdsQuery = useAlertThresholds()
  const scopedSystemIds = scopedSystemIdList
  const latestUpdatedAt = Math.max(
    measurementsQuery.dataUpdatedAt ?? 0,
    ratingsQuery.dataUpdatedAt ?? 0,
    overlayQuery.dataUpdatedAt ?? 0,
    latestStatusQuery.dataUpdatedAt ?? 0,
    syncStatusQuery.dataUpdatedAt ?? 0,
  )
  const systemsRows = useMemo(
    () => getResultRows(systemsQuery.data).filter((system) => system.id != null),
    [systemsQuery.data],
  )
  const scopedMeasurementRows = useMemo(
    () =>
      getResultRows(measurementsQuery.data).filter(
        (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
      ),
    [measurementsQuery.data, scopedSystemIds],
  )
  const thresholdRow = useMemo(() => {
    const rows = getResultRows(thresholdsQuery.data)
    return rows.find((row) => row.scope === "farm" && row.system_id == null) ?? rows[0] ?? null
  }, [thresholdsQuery.data])
  const lowDoThreshold = thresholdRow?.low_do_threshold ?? 4
  const highAmmoniaThreshold = thresholdRow?.high_ammonia_threshold ?? 0.5

  const latestStatusRows = useMemo(
    () =>
      getResultRows(latestStatusQuery.data).filter(
        (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
      ),
    [latestStatusQuery.data, scopedSystemIds],
  )

  const systemLabelById = useMemo(() => {
    const map = new Map<number, string>()
    systemsRows.forEach((system) => {
      if (system.id != null) map.set(system.id, system.label ?? `System ${system.id}`)
    })
    return map
  }, [systemsRows])

  const systemOptions = useMemo(() => {
    return systemsRows
      .map((system) => ({
        id: system.id as number,
        label: system.label ?? `System ${system.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [systemsRows])


  const ratingRows = useMemo(
    () =>
      getResultRows(ratingsQuery.data).filter(
        (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
      ),
    [ratingsQuery.data, scopedSystemIds],
  )

  const ratingTrendBySystemId = useMemo(() => {
    const map = new Map<number, number>()
    const grouped = new Map<number, Array<{ date: string; rating: number }>>()
    ratingRows.forEach((row) => {
      if (row.system_id == null || row.rating_date == null || typeof row.rating_numeric !== "number") return
      const list = grouped.get(row.system_id) ?? []
      list.push({ date: row.rating_date, rating: row.rating_numeric })
      grouped.set(row.system_id, list)
    })
    grouped.forEach((list, systemId) => {
      list.sort((a, b) => String(a.date).localeCompare(String(b.date)))
      const series = list.slice(-7).map((item) => item.rating)
      map.set(systemId, slope(series))
    })
    return map
  }, [ratingRows])

  const operatorByRecordId = useMemo(() => {
    const map = new Map<string, string>()
    const rows = getResultRows(activitiesQuery.data)
    rows.forEach((row) => {
      if (!row.record_id || !row.column_name || !operatorColumns.has(row.column_name)) return
      const parsed = parseJsonish(row.new_value)
      if (!parsed) return
      map.set(String(row.record_id), parsed)
    })
    return map
  }, [activitiesQuery.data])

  const latestReadingsBySystem = useMemo(() => {
    const map = new Map<number, { readings: CurrentReadings; timestamps: Partial<Record<EnvParameter, string>> }>()
    scopedMeasurementRows.forEach((row) => {
      if (!row.system_id || row.parameter_value == null || !row.date) return
      const parameter = row.parameter_name as EnvParameter
      if (!ENV_PARAMETERS.has(parameter)) return
      const timestamp = `${row.date}T${row.time ?? "00:00"}`
      const entry = map.get(row.system_id) ?? { readings: {}, timestamps: {} }
      const prevTimestamp = entry.timestamps[parameter]
      if (!prevTimestamp || timestamp > prevTimestamp) {
        entry.timestamps[parameter] = timestamp
        entry.readings[parameter] = row.parameter_value
      }
      map.set(row.system_id, entry)
    })

    return map
  }, [scopedMeasurementRows])

  const measurementEvents = useMemo<MeasurementEvent[]>(() => {
    const grouped = new Map<string, MeasurementEvent>()

    scopedMeasurementRows.forEach((row) => {
      if (row.system_id == null) return
      const date = row.date ?? ""
      const time = row.time ?? "00:00"
      const key = `${row.system_id}-${date}-${time}`
      const existing = grouped.get(key)
      if (!existing) {
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
          ammonia_ammonium: null,
          operator: operatorByRecordId.get(String(row.id)) ?? "Untracked",
          source: "measurement" as const,
        })
      }

      const target = grouped.get(key)
      if (!target) return
      if (row.parameter_name === "dissolved_oxygen") target.dissolved_oxygen = row.parameter_value
      if (row.parameter_name === "pH") target.pH = row.parameter_value
      if (row.parameter_name === "temperature") target.temperature = row.parameter_value
      if (row.parameter_name === "ammonia_ammonium") target.ammonia_ammonium = row.parameter_value
      target.waterDepth = row.water_depth ?? target.waterDepth
      target.operator = operatorByRecordId.get(String(row.id)) ?? target.operator
    })

    return Array.from(grouped.values()).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
  }, [operatorByRecordId, scopedMeasurementRows, systemLabelById])

  const lastMeasurementBySystemId = useMemo(() => {
    const map = new Map<number, string>()
    measurementEvents.forEach((event) => {
      if (!map.has(event.systemId)) {
        map.set(event.systemId, event.timestamp)
      }
    })
    return map
  }, [measurementEvents])

  const formatSensorLag = (timestamp: string | null) => {
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

  const sensorStatusBySystem = useMemo(() => {
    const now = Date.now()
    const map = new Map<number, { status: "online" | "warning" | "offline"; lastSeen: string | null; minutesSince: number | null }>()
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
  }, [lastMeasurementBySystemId, systemOptions])

  const sensorCounts = useMemo(() => {
    const counts = { online: 0, warning: 0, offline: 0 }
    sensorStatusBySystem.forEach((value) => {
      counts[value.status] += 1
    })
    return counts
  }, [sensorStatusBySystem])

  const aggregatedReadings = useMemo(() => {
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
  }, [latestReadingsBySystem])
  const selectedReadings =
    selectedSystemId != null ? latestReadingsBySystem.get(selectedSystemId)?.readings ?? {} : aggregatedReadings

  const temperatureStats = useMemo(() => {
    const values = scopedMeasurementRows
      .filter((row) => row.parameter_name === "temperature")
      .map((row) => row.parameter_value)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))

    if (!values.length) return { mean: null, std: null }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    const variance =
      values.length > 1 ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length : 0
    return { mean, std: Math.sqrt(variance) }
  }, [scopedMeasurementRows])

  const wqiValue = calculateWqi(
    selectedReadings.dissolved_oxygen ?? null,
    selectedReadings.temperature ?? null,
    lowDoThreshold,
    temperatureStats.mean,
    temperatureStats.std,
  )
  const wqiLabel = getWqiLabel(wqiValue)

  const nutrientLoad = useMemo(() => {
    const nitrate = selectedReadings.nitrate
    const nitrite = selectedReadings.nitrite
    const ammonia = selectedReadings.ammonia_ammonium
    const hasData = nitrate != null || nitrite != null || ammonia != null
    const value = hasData ? (nitrate ?? 0) + (nitrite ?? 0) + (ammonia ?? 0) : 0
    if (!hasData) return { value: 0, level: "No data", color: "hsl(var(--muted-foreground))" }
    if (value >= 2) return { value, level: "High", color: "#EF4444" }
    if (value >= 1) return { value, level: "Moderate", color: "#F59E0B" }
    return { value, level: "Low", color: "#10B981" }
  }, [selectedReadings])

  const algalActivity = useMemo(() => {
    const secchi = selectedReadings.secchi_disk_depth
    if (secchi == null || !Number.isFinite(secchi)) {
      return { value: 0, level: "No data", color: "hsl(var(--muted-foreground))", source: null as number | null }
    }
    const value = Math.max(0, Math.min(50, 50 - secchi * 10))
    if (value >= 30) return { value, level: "High", color: "#EF4444", source: secchi }
    if (value >= 10) return { value, level: "Moderate", color: "#10B981", source: secchi }
    return { value, level: "Low", color: "#3B82F6", source: secchi }
  }, [selectedReadings])

  const allSystemsWqi = useMemo(() => {
    return systemOptions.map((system) => {
      const readings = latestReadingsBySystem.get(system.id)?.readings ?? {}
      const value = calculateWqi(
        readings.dissolved_oxygen ?? null,
        readings.temperature ?? null,
        lowDoThreshold,
        temperatureStats.mean,
        temperatureStats.std,
      )
      return {
        ...system,
        wqi: value,
        wqiLabel: getWqiLabel(value),
      }
    })
  }, [latestReadingsBySystem, lowDoThreshold, systemOptions, temperatureStats])

  const averageWqi = useMemo(() => {
    const values = allSystemsWqi.map((system) => system.wqi).filter((value): value is number => typeof value === "number")
    if (!values.length) return null
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }, [allSystemsWqi])

  const averageWqiLabel = getWqiLabel(averageWqi)

  const systemRiskRows = useMemo(() => {
    const severityRank = (rating: string | null) => {
      const key = String(rating ?? "").toLowerCase()
      if (key === "lethal") return 4
      if (key === "critical") return 3
      if (key === "acceptable") return 2
      if (key === "optimal") return 1
      return 0
    }

    const actionState = (row: (typeof latestStatusRows)[number]) => {
      const rating = String(row.rating ?? "").toLowerCase()
      let state = "Stable"
      if (rating === "acceptable") state = "Watch"
      if (rating === "critical") state = "Investigate"
      if (rating === "lethal") state = "Escalate"
      if ((row.do_exceeded || row.ammonia_exceeded) && state === "Stable") state = "Watch"
      if ((row.do_exceeded || row.ammonia_exceeded) && state === "Watch") state = "Investigate"
      return state
    }

    return latestStatusRows
      .map((row) => {
        const trend = ratingTrendBySystemId.get(row.system_id) ?? 0
        const trendLabel = trend > 0.02 ? "Improving" : trend < -0.02 ? "Worsening" : "Stable"
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
          trendLabel,
          action: actionState(row),
          severity: severityRank(row.rating),
        }
      })
      .sort((a, b) => {
        if (b.severity !== a.severity) return b.severity - a.severity
        return String(b.ratingDate ?? "").localeCompare(String(a.ratingDate ?? ""))
      })
  }, [lastMeasurementBySystemId, latestStatusRows, ratingTrendBySystemId, systemLabelById])


  const criticalRiskRows = useMemo(
    () =>
      systemRiskRows.filter((row) => {
        const rating = String(row.rating ?? "").toLowerCase()
        return rating === "critical" || rating === "lethal" || row.thresholdBreached
      }),
    [systemRiskRows],
  )

  const alertItems = useMemo(() => {
    return criticalRiskRows.slice(0, 6).map((row) => {
      const priority = row.severity >= 3 || row.thresholdBreached ? "high" : "medium"
      const worstParam = row.worstParameter ? parameterLabels[row.worstParameter as WqParameter] ?? row.worstParameter : "Risk"
      const value =
        row.worstValue != null
          ? `${row.worstValue.toFixed(2)}${row.worstUnit ? ` ${row.worstUnit}` : ""}`
          : row.thresholdBreached
            ? "Threshold breach"
            : "Rating decline"
      return {
        id: `${row.systemId}-${row.ratingDate ?? "latest"}`,
        message: `${row.systemName}: ${worstParam} ${value}`,
        priority,
      }
    })
  }, [criticalRiskRows])

  const highAlertCount = useMemo(
    () => alertItems.filter((alert) => alert.priority === "high").length,
    [alertItems],
  )

  const overlayByDate = useMemo(() => {
    const map = new Map<string, { feeding: number; mortality: number }>()
    const overlayRows = getResultRows(overlayQuery.data)
    overlayRows.forEach((row) => {
      if (!row.inventory_date || !scopedSystemIds.includes(row.system_id)) return
      const current = map.get(row.inventory_date) ?? { feeding: 0, mortality: 0 }
      current.feeding += row.feeding_amount ?? 0
      current.mortality += row.number_of_fish_mortality ?? 0
      map.set(row.inventory_date, current)
    })
    return map
  }, [overlayQuery.data, scopedSystemIds])

  const dailyRiskTrend = useMemo(() => {
    const byDate = new Map<string, { worst: { parameter: string | null; rating: number } }>()
    ratingRows.forEach((row) => {
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
  }, [overlayByDate, ratingRows])

  const parameterTrendData = useMemo(() => {
    const byDate = new Map<string, { sum: number; count: number }>()
    scopedMeasurementRows
      .filter((row) => row.parameter_name === selectedParameter)
      .forEach((row) => {
      if (!row.date) return
      const value = row.parameter_value ?? null
      if (value == null) return
      const current = byDate.get(row.date) ?? { sum: 0, count: 0 }
      current.sum += value
      current.count += 1
      byDate.set(row.date, current)
    })

    const rows = Array.from(byDate.entries())
      .map(([date, agg]) => ({
        date,
        mean: agg.count > 0 ? agg.sum / agg.count : null,
        count: agg.count,
        feeding: overlayByDate.get(date)?.feeding ?? null,
        mortality: overlayByDate.get(date)?.mortality ?? null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const rolling = rows.map((row, index) => {
      const window = rows.slice(Math.max(0, index - 6), index + 1).map((r) => r.mean).filter((v): v is number => typeof v === "number")
      const avg = window.length ? window.reduce((sum, v) => sum + v, 0) / window.length : null
      return { ...row, rolling: avg }
    })

    return rolling
  }, [overlayByDate, scopedMeasurementRows, selectedParameter])


  const dailyDoVariation = useMemo(() => {
    const byDate = new Map<string, { min: number; max: number }>()
    scopedMeasurementRows
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
  }, [scopedMeasurementRows])

  const dailyTempAverage = useMemo(() => {
    const byDate = new Map<string, { sum: number; count: number }>()
    scopedMeasurementRows
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
  }, [scopedMeasurementRows])

  const depthProfileScopeIds = selectedSystemId != null ? [selectedSystemId] : []
  const depthProfiles = useMemo(() => {
    if (!depthProfileScopeIds.length) {
      return { dates: [], dataByDate: new Map<string, DepthProfileRow[]>() }
    }
    const byDate = new Map<
      string,
      Map<number, { doSum: number; doCount: number; tempSum: number; tempCount: number; phSum: number; phCount: number }>
    >()
    scopedMeasurementRows
      .filter(
        (row) =>
          depthProfileScopeIds.includes(row.system_id as number) &&
          row.water_depth != null &&
          (row.parameter_name === "dissolved_oxygen" || row.parameter_name === "temperature" || row.parameter_name === "pH"),
      )
      .forEach((row) => {
      if (!row.date || row.parameter_value == null || row.water_depth == null) return
      const depth = Number(row.water_depth)
      if (!Number.isFinite(depth)) return
      const dateMap = byDate.get(row.date) ?? new Map()
      const current = dateMap.get(depth) ?? { doSum: 0, doCount: 0, tempSum: 0, tempCount: 0, phSum: 0, phCount: 0 }
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
      const rows = Array.from(depthMap.entries())
        .map(([depth, row]) => ({
          depth,
          dissolvedOxygen: row.doCount > 0 ? row.doSum / row.doCount : null,
          temperature: row.tempCount > 0 ? row.tempSum / row.tempCount : null,
          pH: row.phCount > 0 ? row.phSum / row.phCount : null,
        }))
        .filter((row) => row.dissolvedOxygen != null || row.temperature != null || row.pH != null)
        .sort((a, b) => a.depth - b.depth)
      dataByDate.set(date, rows)
    })

    return { dates, dataByDate }
  }, [depthProfileScopeIds, scopedMeasurementRows])

  const selectedDepthProfileDate =
    depthProfileDate && depthProfiles.dataByDate.has(depthProfileDate) ? depthProfileDate : null
  const depthProfileData = selectedDepthProfileDate
    ? depthProfiles.dataByDate.get(selectedDepthProfileDate) ?? []
    : []

  useEffect(() => {
    if (!depthProfiles.dates.length) {
      if (depthProfileDate !== null) setDepthProfileDate(null)
      return
    }
    if (depthProfileDate && depthProfiles.dataByDate.has(depthProfileDate)) return
    const latest = depthProfiles.dates[depthProfiles.dates.length - 1]
    if (depthProfileDate !== latest) setDepthProfileDate(latest)
  }, [depthProfiles, depthProfileDate])

  useEffect(() => {
    const tab = searchParams.get("tab")
    setActiveTab(tab && WATER_QUALITY_TABS.has(tab) ? tab : "overview")
  }, [searchParams])

  const handleTabChange = (value: string) => {
    if (!WATER_QUALITY_TABS.has(value)) return
    setActiveTab(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value === "overview") {
      params.delete("tab")
    } else {
      params.set("tab", value)
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const depthProfileDoData = useMemo(
    () => depthProfileData.filter((row): row is DepthProfileRow & { dissolvedOxygen: number } => row.dissolvedOxygen != null),
    [depthProfileData],
  )
  const depthProfileTempData = useMemo(
    () => depthProfileData.filter((row): row is DepthProfileRow & { temperature: number } => row.temperature != null),
    [depthProfileData],
  )

  const doProfileSeries = useMemo(() => [...depthProfileDoData].sort((a, b) => a.depth - b.depth), [depthProfileDoData])
  const tempProfileSeries = useMemo(() => [...depthProfileTempData].sort((a, b) => a.depth - b.depth), [depthProfileTempData])

  const surfaceDo = doProfileSeries[0]?.dissolvedOxygen ?? null
  const bottomDo = doProfileSeries.length ? doProfileSeries[doProfileSeries.length - 1].dissolvedOxygen : null
  const doGradient = surfaceDo != null && bottomDo != null ? surfaceDo - bottomDo : null
  const isStratified = surfaceDo != null && bottomDo != null && bottomDo < 3 && surfaceDo > 5
  const hasGradient = doGradient != null && doGradient > 2

  const surfaceTemp = tempProfileSeries[0]?.temperature ?? null
  const bottomTemp = tempProfileSeries.length ? tempProfileSeries[tempProfileSeries.length - 1].temperature : null
  const tempGradient = surfaceTemp != null && bottomTemp != null ? surfaceTemp - bottomTemp : null

  const selectedParameterUnit = useMemo(() => {
    if (selectedParameter === "dissolved_oxygen" || selectedParameter === "ammonia_ammonium") return "mg/L"
    if (selectedParameter === "temperature") return "deg C"
    if (selectedParameter === "pH") return "pH"
    return ""
  }, [selectedParameter])

  const worstParamColor = (param: string | null | undefined) => {
    if (param === "dissolved_oxygen") return "var(--color-chart-4)"
    if (param === "ammonia_ammonium") return "var(--color-chart-3)"
    if (param === "temperature") return "var(--color-chart-2)"
    if (param === "pH") return "var(--color-chart-1)"
    return "hsl(var(--muted-foreground))"
  }

  const ratingBadgeClass = (rating: string | null | undefined) => {
    const key = String(rating ?? "").toLowerCase()
    if (key === "optimal") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
    if (key === "acceptable") return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
    if (key === "critical") return "bg-orange-500/10 text-orange-700 dark:text-orange-300"
    if (key === "lethal") return "bg-red-500/10 text-red-600 dark:text-red-300"
    return "bg-muted/50 text-muted-foreground"
  }

  const actionBadgeClass = (action: string) => {
    if (action === "Escalate") return "bg-red-500/10 text-red-600 dark:text-red-300"
    if (action === "Investigate") return "bg-orange-500/10 text-orange-700 dark:text-orange-300"
    if (action === "Watch") return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
  }

  const dailyParameterByDate = useMemo(() => {
    const map = new Map<string, { doValue?: number; ammoniaValue?: number; tempValue?: number }>()
    scopedMeasurementRows.forEach((row) => {
      if (!row.date || row.parameter_value == null) return
      const current = map.get(row.date) ?? {}
      if (row.parameter_name === "dissolved_oxygen") current.doValue = row.parameter_value
      if (row.parameter_name === "ammonia_ammonium") current.ammoniaValue = row.parameter_value
      if (row.parameter_name === "temperature") current.tempValue = row.parameter_value
      map.set(row.date, current)
    })
    return map
  }, [scopedMeasurementRows])

  const currentAlerts = useMemo(() => {
    const alerts: string[] = []
    latestStatusRows.forEach((row) => {
      if (row.do_exceeded) {
        alerts.push(`${row.system_name ?? `System ${row.system_id}`}: DO below threshold.`)
      }
      if (row.ammonia_exceeded) {
        alerts.push(`${row.system_name ?? `System ${row.system_id}`}: Ammonia above threshold.`)
      }
    })
    return alerts
  }, [latestStatusRows])

  const emergingRisks = useMemo(() => {
    const alerts: string[] = []
    const doSeries = dailyRiskTrend
      .map((row) => dailyParameterByDate.get(row.date)?.doValue)
      .filter((value): value is number => typeof value === "number")
      .slice(-7)
    const ammoniaSeries = dailyRiskTrend
      .map((row) => dailyParameterByDate.get(row.date)?.ammoniaValue)
      .filter((value): value is number => typeof value === "number")
      .slice(-7)

    if (doSeries.length >= 4) {
      const trendSlope = slope(doSeries)
      if (trendSlope < -0.05) {
        alerts.push("DO trend is worsening over the last 7 days.")
      }
    }
    if (ammoniaSeries.length >= 4) {
      const trendSlope = slope(ammoniaSeries)
      if (trendSlope > 0.02) {
        alerts.push("Ammonia trend is rising over the last 7 days.")
      }
    }

    const ratingSeries = dailyRiskTrend
      .map((row) => row.rating)
      .filter((value): value is number => typeof value === "number")
      .slice(-14)
    if (ratingSeries.length >= 5) {
      const mean = ratingSeries.reduce((sum, v) => sum + v, 0) / ratingSeries.length
      const variance = ratingSeries.reduce((sum, v) => sum + (v - mean) ** 2, 0) / ratingSeries.length
      const std = Math.sqrt(variance)
      if (std >= 0.6) {
        alerts.push("Daily rating volatility is high (frequent swings).")
      }
    }

    const worstSeries = dailyRiskTrend
      .map((row) => row.worstParameter)
      .filter((value): value is string => Boolean(value))
      .slice(-14)
    let switches = 0
    for (let i = 1; i < worstSeries.length; i += 1) {
      if (worstSeries[i] !== worstSeries[i - 1]) switches += 1
    }
    if (switches >= 4) {
      alerts.push("Worst parameter is switching frequently; system may be unstable.")
    }

    return alerts
  }, [dailyParameterByDate, dailyRiskTrend])

  const dataIssues = useMemo(() => {
    const issues: string[] = []
    const checks: Array<[string, { status: "success" | "error"; error?: string } | undefined]> = [
      ["Sync status", syncStatusQuery.data],
      ["Latest status", latestStatusQuery.data],
      ["Daily ratings", ratingsQuery.data],
      ["Measurements", measurementsQuery.data],
      ["Daily overlay", overlayQuery.data],
      ["Thresholds", thresholdsQuery.data as any],
      ["Batch systems", selectedBatch !== "all" ? (batchSystemsQuery.data as any) : undefined],
    ]

    checks.forEach(([label, result]) => {
      if (!result || result.status !== "error") return
      issues.push(`${label}: ${result.error ?? "request failed"}`)
    })

    if (!scopedSystemIds.length && farmId) {
      issues.push("No scoped systems found for selected farm/stage/batch/system filters.")
    }

    return issues
  }, [
    syncStatusQuery.data,
    latestStatusQuery.data,
    batchSystemsQuery.data,
    farmId,
    measurementsQuery.data,
    overlayQuery.data,
    ratingsQuery.data,
    scopedSystemIds.length,
    selectedBatch,
    thresholdsQuery.data,
  ])

  const loading =
    measurementsQuery.isLoading ||
    ratingsQuery.isLoading ||
    overlayQuery.isLoading ||
    systemsQuery.isLoading ||
    latestStatusQuery.isLoading ||
    syncStatusQuery.isLoading
  const parameterTabContent = loading ? (
    <div className="h-[320px] flex items-center justify-center text-muted-foreground">Loading parameter analysis...</div>
  ) : parameterTrendData.length === 0 ? (
    <div className="h-[320px] flex items-center justify-center text-muted-foreground">No parameter measurements in this range.</div>
  ) : (
    <div className="space-y-4">
      <div className="h-[320px] rounded-md border border-border/80 bg-muted/20 p-2">
        <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={parameterTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDateLabel} />
              <YAxis yAxisId="param" />
              <YAxis yAxisId="overlay" orientation="right" />
              <Tooltip
                labelFormatter={(label) => formatTimestamp(`${label}T00:00:00`)}
                formatter={(value, name) => {
                  const numeric = Number(value)
                  const field = String(name).toLowerCase()
                  if (field.includes("feeding")) {
                    return [`${numeric.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`, String(name)]
                  }
                  if (field.includes("mortality")) {
                    return [numeric.toLocaleString(undefined, { maximumFractionDigits: 0 }), String(name)]
                  }
                  if (selectedParameter === "pH") {
                    return [numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), String(name)]
                  }
                  return [
                    `${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${selectedParameterUnit ? ` ${selectedParameterUnit}` : ""}`,
                    String(name),
                  ]
                }}
              />
              <Legend />
              <Line yAxisId="param" type="monotone" dataKey="mean" name="Daily mean" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
              <Line yAxisId="param" type="monotone" dataKey="rolling" name="7-day mean" stroke="var(--color-chart-2)" strokeDasharray="4 4" dot={false} />
              {selectedParameter === "dissolved_oxygen" ? (
                <ReferenceLine yAxisId="param" y={lowDoThreshold} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label="Low DO threshold" />
              ) : null}
              {selectedParameter === "ammonia_ammonium" ? (
                <ReferenceLine yAxisId="param" y={highAmmoniaThreshold} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label="High ammonia threshold" />
              ) : null}
              {showFeedingOverlay ? (
                <Line yAxisId="overlay" type="monotone" dataKey="feeding" name="Feeding amount" stroke="var(--color-chart-3)" dot={false} />
              ) : null}
              {showMortalityOverlay ? (
                <Line yAxisId="overlay" type="monotone" dataKey="mortality" name="Mortality count" stroke="var(--color-chart-4)" dot={false} />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </LazyRender>
      </div>

      <div className="rounded-md border border-border/80 bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <p className="text-sm font-semibold">Daily Dissolved Oxygen Variation</p>
            <p className="text-xs text-muted-foreground">Max minus min DO per day across the selected scope.</p>
          </div>
          <span className="text-xs text-muted-foreground">Units: mg/L</span>
        </div>
        {dailyDoVariation.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
            No dissolved oxygen measurements in this range.
          </div>
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyDoVariation}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDateLabel} />
                <YAxis />
                <Tooltip
                  labelFormatter={(label) => formatTimestamp(`${label}T00:00:00`)}
                  formatter={(value) => [`${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mg/L`, "Daily DO variation"]}
                />
                <Line type="monotone" dataKey="variation" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-md border border-border/80 bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <p className="text-sm font-semibold">Daily Average Temperature</p>
            <p className="text-xs text-muted-foreground">Mean temperature per day across the selected scope.</p>
          </div>
          <span className="text-xs text-muted-foreground">Units: deg C</span>
        </div>
        {dailyTempAverage.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
            No temperature measurements in this range.
          </div>
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTempAverage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDateLabel} />
                <YAxis />
                <Tooltip
                  labelFormatter={(label) => formatTimestamp(`${label}T00:00:00`)}
                  formatter={(value) => [`${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} deg C`, "Average temperature"]}
                />
                <Line type="monotone" dataKey="average" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <DashboardLayout>
      <div className={`space-y-6 ${activeTab === "depth" || activeTab === "parameter" ? "-mt-6 md:-mt-8" : ""}`}>
        <div
          className={`flex flex-wrap items-center justify-end gap-2 ${
            activeTab === "depth" || activeTab === "parameter" ? "mt-8 md:mt-10" : "mt-4 md:mt-6"
          }`}
        >
          <Select value={selectedParameter} onValueChange={(value) => setSelectedParameter(value as WqParameter)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select parameter" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(parameterLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/20">
                  <Droplets className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Water Quality Overview</h2>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card
                className="bg-card border border-border cursor-pointer hover:border-cyan-500/40 transition-all"
                onClick={() => handleTabChange("environment")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Gauge className="h-5 w-5 text-cyan-400" />
                    <span className="text-xs text-muted-foreground">Avg WQI</span>
                  </div>
                  <p className="text-3xl font-bold" style={{ color: averageWqiLabel.color }}>
                    {averageWqi != null ? Math.round(averageWqi) : "--"}
                  </p>
                  <p className="text-xs mt-1" style={{ color: averageWqiLabel.color }}>
                    {averageWqiLabel.label}
                  </p>
                </CardContent>
              </Card>
              <Card
                className="bg-card border border-border cursor-pointer hover:border-red-500/40 transition-all"
                onClick={() => handleTabChange("alerts")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Bell className="h-5 w-5 text-red-400" />
                    <span className="text-xs text-muted-foreground">Active Alerts</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{alertItems.length}</p>
                  <p className="text-xs text-red-400 mt-1">{highAlertCount} high priority</p>
                </CardContent>
              </Card>
              <Card
                className="bg-card border border-border cursor-pointer hover:border-emerald-500/40 transition-all"
                onClick={() => handleTabChange("sensors")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Radio className="h-5 w-5 text-emerald-400" />
                    <span className="text-xs text-muted-foreground">Sensors</span>
                  </div>
                  <p className="text-3xl font-bold text-emerald-400">{sensorCounts.online}</p>
                  <p className="text-xs text-muted-foreground mt-1">of {systemOptions.length} online</p>
                </CardContent>
              </Card>
              <Card
                className="bg-card border border-border cursor-pointer hover:border-slate-500/40 transition-all"
                onClick={() => handleTabChange("parameter")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Thermometer className="h-5 w-5 text-amber-400" />
                    <span className="text-xs text-muted-foreground">Parameters</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{Object.keys(parameterLabels).length}</p>
                  <p className="text-xs text-muted-foreground mt-1">monitored</p>
                </CardContent>
              </Card>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">System Status Overview</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemRiskRows.map((row) => (
                  <Card
                    key={row.systemId}
                    className="bg-card border border-border hover:border-slate-500/40 transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedSystem(String(row.systemId))
                      handleTabChange("parameter")
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">{row.systemName}</CardTitle>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ratingBadgeClass(row.rating)}`}>
                          {row.rating ?? "Unknown"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last rating {row.ratingDate ? formatTimestamp(`${row.ratingDate}T00:00:00`) : "--"}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Worst parameter</span>
                        <span className="font-medium text-foreground">
                          {row.worstParameter ? parameterLabels[row.worstParameter as WqParameter] ?? row.worstParameter : "--"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Latest measurement</span>
                        <span className="text-foreground">
                          {row.latestMeasurement ? formatTimestamp(row.latestMeasurement) : "--"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Action</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${actionBadgeClass(row.action)}`}>
                          {row.action}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Recent Alerts</h3>
                <button onClick={() => handleTabChange("alerts")} className="text-xs text-cyan-500 hover:text-cyan-400">
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {alertItems.length ? (
                  alertItems.slice(0, 5).map((alert) => (
                    <Card
                      key={alert.id}
                      className={`border ${
                        alert.priority === "high" ? "bg-red-500/5 border-red-500/20" : "bg-amber-500/5 border-amber-500/20"
                      }`}
                    >
                      <CardContent className="flex items-center gap-3 p-3">
                        {alert.priority === "high" ? (
                          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        )}
                        <p className="text-xs text-foreground flex-1">{alert.message}</p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0 flex-shrink-0 ${
                            alert.priority === "high"
                              ? "bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/30"
                              : "bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {alert.priority.toUpperCase()}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border border-border bg-muted/30">
                    <CardContent className="p-3 text-sm text-muted-foreground">No alerts for the selected scope.</CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "alerts" && (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <div>
              <h2 className="font-semibold">System Risk Table</h2>
              <p className="text-sm text-muted-foreground">Ranked by severity and recency for the selected scope.</p>
            </div>
            <div className="overflow-x-auto rounded-md border border-border/80">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-3 py-2 text-left font-semibold">System</th>
                    <th className="px-3 py-2 text-left font-semibold">Latest rating</th>
                    <th className="px-3 py-2 text-left font-semibold">Rating date</th>
                    <th className="px-3 py-2 text-left font-semibold">Worst parameter</th>
                    <th className="px-3 py-2 text-left font-semibold">Worst value</th>
                    <th className="px-3 py-2 text-left font-semibold">Threshold</th>
                    <th className="px-3 py-2 text-left font-semibold">Last measurement</th>
                    <th className="px-3 py-2 text-left font-semibold">Trend</th>
                    <th className="px-3 py-2 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalRiskRows.length ? (
                    criticalRiskRows.map((row) => (
                      <tr key={`risk-${row.systemId}`} className="border-b border-border hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{row.systemName}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ratingBadgeClass(row.rating)}`}>
                            {row.rating ?? "Unknown"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {row.ratingDate ? formatTimestamp(`${row.ratingDate}T00:00:00`) : "--"}
                        </td>
                        <td className="px-3 py-2">
                          {row.worstParameter ? parameterLabels[row.worstParameter as WqParameter] ?? row.worstParameter : "--"}
                        </td>
                        <td className="px-3 py-2">
                          {row.worstValue != null ? `${row.worstValue.toFixed(2)}${row.worstUnit ? ` ${row.worstUnit}` : ""}` : "--"}
                        </td>
                        <td className="px-3 py-2">
                          <span className={row.thresholdBreached ? "text-destructive font-semibold" : "text-muted-foreground"}>
                            {row.thresholdBreached ? "Breached" : "OK"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {row.latestMeasurement ? formatTimestamp(row.latestMeasurement) : "--"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs font-semibold ${
                              row.trendLabel === "Worsening"
                                ? "text-destructive"
                                : row.trendLabel === "Improving"
                                  ? "text-emerald-600 dark:text-emerald-300"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {row.trendLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${actionBadgeClass(row.action)}`}>
                            {row.action}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                        No critical alerts in the selected scope.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="font-semibold">Current Alerts</h3>
              <p className="text-sm text-muted-foreground">Latest status and threshold conditions.</p>
              <div className="mt-3 space-y-2">
                {currentAlerts.length ? (
                  currentAlerts.slice(0, 3).map((alert) => (
                    <div key={alert} className="rounded-md border border-border/80 bg-muted/20 p-3 text-sm">
                      {alert}
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                    No active alerts in the current scope.
                  </div>
                )}
                {currentAlerts.length > 3 ? (
                  <p className="text-xs text-muted-foreground">See details below.</p>
                ) : null}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="font-semibold">Threshold Snapshot</h3>
              <p className="text-sm text-muted-foreground">Managed in farm settings.</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Low DO</span>
                  <span className="font-semibold">{lowDoThreshold.toFixed(2)} mg/L</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">High ammonia</span>
                  <span className="font-semibold">{highAmmoniaThreshold.toFixed(2)} mg/L</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeTab === "sensors" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/20">
                <Radio className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Sensor Activity</h2>
                <p className="text-sm text-muted-foreground">System connectivity and data freshness tracking.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-emerald-500/10 border-emerald-500/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <Wifi className="h-6 w-6 text-emerald-500" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-500">{sensorCounts.online}</p>
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-300/80">Online</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/10 border-amber-500/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold text-amber-500">{sensorCounts.warning}</p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-300/80">Delayed</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-red-500/10 border-red-500/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <WifiOff className="h-6 w-6 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold text-red-500">{sensorCounts.offline}</p>
                    <p className="text-xs text-red-600/80 dark:text-red-300/80">Offline</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemOptions.map((system) => {
                const status = sensorStatusBySystem.get(system.id)
                const isOffline = status?.status === "offline"
                const isWarning = status?.status === "warning"
                return (
                  <Card
                    key={system.id}
                    className={`border transition-all ${
                      isOffline
                        ? "bg-red-500/5 border-red-500/20"
                        : isWarning
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-card border-border"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              isOffline ? "bg-red-500 animate-pulse" : isWarning ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                            }`}
                          />
                          <span className="text-sm font-semibold text-foreground">{system.label}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0 ${
                            isOffline
                              ? "bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/30"
                              : isWarning
                                ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {(status?.status ?? "offline").toUpperCase()}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">System ID</span>
                          <span className="text-foreground font-mono">{system.id}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Last Reading</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className={isOffline ? "text-red-500" : isWarning ? "text-amber-500" : "text-foreground"}>
                              {formatSensorLag(status?.lastSeen ?? null)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isOffline ? (
                        <div className="mt-3 rounded bg-red-500/10 border border-red-500/20 p-2">
                          <p className="text-[10px] text-red-600 dark:text-red-300">No data received for more than 24 hours.</p>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {CHART_TABS.has(activeTab) && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          {activeTab === "parameter" && (
            <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={showFeedingOverlay} onChange={(e) => setShowFeedingOverlay(e.target.checked)} />
                Overlay feeding
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={showMortalityOverlay} onChange={(e) => setShowMortalityOverlay(e.target.checked)} />
                Overlay mortality
              </label>
            </div>
          )}

          <Tabs value={activeTab}>
            <TabsContent value="environment">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20">
                      <Gauge className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Environmental Indicators</h2>
                      <p className="text-sm text-muted-foreground">Composite water quality scores and environmental indices.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-card border border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-cyan-400" />
                        Water Quality Index
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center py-4">
                      <div className="relative">
                        <CircularGauge value={wqiValue ?? 0} max={100} color={wqiLabel.color} label="WQI" />
                      </div>
                      <div className="mt-4 text-center">
                        <span className="text-lg font-bold" style={{ color: wqiLabel.color }}>
                          {wqiLabel.label}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          {wqiValue == null
                            ? "Insufficient data for WQI scoring."
                            : wqiValue >= 70
                              ? "Optimal conditions for aquaculture."
                              : wqiValue >= 50
                                ? "Some parameters need attention."
                                : "Immediate intervention recommended."}
                        </p>
                      </div>
                      <div className="w-full mt-4 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Poor (0-50)</span>
                          <span>Moderate (50-70)</span>
                          <span>Good (70-100)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                          <div className="h-full bg-red-500" style={{ width: "50%" }} />
                          <div className="h-full bg-amber-500" style={{ width: "20%" }} />
                          <div className="h-full bg-emerald-500" style={{ width: "30%" }} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-orange-400" />
                        Nutrient Load Indicator
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center py-4">
                      <div className="relative">
                        <CircularGauge value={nutrientLoad.value} max={4} color={nutrientLoad.color} label="mg/L" />
                      </div>
                      <div className="mt-4 text-center">
                        <span className="text-lg font-bold" style={{ color: nutrientLoad.color }}>
                          {nutrientLoad.level}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Nitrate + Nitrite + Ammonia = {nutrientLoad.level === "No data" ? "--" : nutrientLoad.value.toFixed(2)} mg/L
                        </p>
                      </div>
                      <div className="w-full mt-4 p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                        {nutrientLoad.level === "High"
                          ? "High nutrient load. Consider reducing nutrient input."
                          : nutrientLoad.level === "Moderate"
                            ? "Moderate nutrient levels. Monitor for rising trends."
                            : nutrientLoad.level === "Low"
                              ? "Nutrient levels within acceptable range."
                              : "No nutrient data available."}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Leaf className="h-4 w-4 text-green-400" />
                        Algal Activity Indicator
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center py-4">
                      <div className="relative">
                        <CircularGauge value={algalActivity.value} max={50} color={algalActivity.color} label="index" />
                      </div>
                      <div className="mt-4 text-center">
                        <span className="text-lg font-bold" style={{ color: algalActivity.color }}>
                          {algalActivity.level}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Secchi depth: {algalActivity.source != null ? `${algalActivity.source.toFixed(1)} m` : "--"}
                        </p>
                      </div>
                      <div className="w-full mt-4 space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-blue-500" />
                          <span>Low activity</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-emerald-500" />
                          <span>Moderate activity</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-red-500" />
                          <span>Bloom risk</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-card border border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">All Systems Water Quality Index</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      {allSystemsWqi.map((system) => (
                        <div
                          key={system.id}
                          className={`p-4 rounded-lg border text-center transition-all cursor-pointer hover:scale-[1.02] ${
                            String(system.id) === selectedSystemValue ? "border-cyan-500/50 bg-cyan-500/10" : "border-border bg-muted/30"
                          }`}
                          onClick={() => setSelectedSystem(String(system.id))}
                        >
                          <p className="text-xs text-muted-foreground mb-1">{system.label}</p>
                          <p className="text-2xl font-bold" style={{ color: system.wqiLabel.color }}>
                            {system.wqi != null ? Math.round(system.wqi) : "--"}
                          </p>
                          <p className="text-xs mt-1" style={{ color: system.wqiLabel.color }}>
                            {system.wqiLabel.label}
                          </p>
                          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${system.wqi != null ? Math.min(system.wqi, 100) : 0}%`,
                                backgroundColor: system.wqiLabel.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="depth">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/20">
                      <Layers className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Stratification Analysis</h2>
                      <p className="text-sm text-muted-foreground">Vertical water quality stratification analysis.</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={selectedDepthProfileDate ?? ""} onValueChange={setDepthProfileDate}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select date" />
                      </SelectTrigger>
                      <SelectContent>
                        {depthProfiles.dates.map((date) => (
                          <SelectItem key={date} value={date}>
                            {formatTimestamp(`${date}T00:00:00`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isAllSystemsSelected ? (
                  <Card className="border-dashed">
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      Select a system to view stratification analysis.
                    </CardContent>
                  </Card>
                ) : depthProfileData.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      No stratification profile measurements found in the selected time period.
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {depthProfileDoData.length < 2 ? (
                      <Card className="bg-muted/30">
                        <CardContent className="p-4 text-sm text-muted-foreground">
                          Not enough dissolved oxygen depth readings to assess stratification.
                        </CardContent>
                      </Card>
                    ) : isStratified || hasGradient ? (
                      <Card className="border-red-500/30 bg-red-500/10">
                        <CardContent className="flex items-start gap-3 p-4">
                          <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-300" />
                          <div>
                            <p className="text-sm font-semibold text-red-600 dark:text-red-300">Stratification Risk Detected</p>
                            <p className="mt-1 text-xs text-red-600/80 dark:text-red-300/80">
                              {isStratified && surfaceDo != null && bottomDo != null
                                ? `Bottom oxygen (${bottomDo.toFixed(1)} mg/L) is critically low while surface oxygen (${surfaceDo.toFixed(1)} mg/L) remains normal. `
                                : doGradient != null
                                  ? `Significant DO gradient of ${doGradient.toFixed(1)} mg/L detected between surface and bottom. `
                                  : ""}
                              Recommended: Increase aeration, improve water mixing, reduce feeding.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-emerald-500/30 bg-emerald-500/10">
                        <CardContent className="flex items-start gap-3 p-4">
                          <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                          <div>
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">No Stratification Detected</p>
                            <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                              Water column appears well-mixed. DO gradient: {doGradient != null ? doGradient.toFixed(1) : "--"} mg/L.
                              Temperature gradient: {tempGradient != null ? tempGradient.toFixed(1) : "--"} deg C.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="bg-card">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium flex items-center justify-between">
                            Dissolved Oxygen by Depth
                            <Badge
                              variant="outline"
                              className={
                                depthProfileDoData.length === 0
                                  ? "border-border text-muted-foreground"
                                  : isStratified || hasGradient
                                    ? "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/30"
                                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              }
                            >
                              {depthProfileDoData.length === 0 ? "NO DATA" : isStratified || hasGradient ? "STRATIFIED" : "MIXED"}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {depthProfileDoData.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                              No dissolved oxygen depth measurements.
                            </div>
                          ) : (
                            <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={depthProfileDoData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                                  <XAxis
                                    type="number"
                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                                    label={{ value: "DO (mg/L)", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                                  />
                                  <YAxis
                                    dataKey="depth"
                                    type="number"
                                    reversed
                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                                    label={{ value: "Depth (m)", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                                  />
                                  <Tooltip content={<DepthProfileTooltip />} />
                                  <ReferenceLine x={3} stroke="#EF4444" strokeDasharray="4 4" />
                                  <ReferenceLine x={5} stroke="#F59E0B" strokeDasharray="4 4" />
                                  <Bar dataKey="dissolvedOxygen" name="DO (mg/L)" radius={[0, 4, 4, 0]} barSize={20}>
                                    {depthProfileDoData.map((entry, index) => (
                                      <Cell key={`do-cell-${index}`} fill={getDoColor(entry.dissolvedOxygen)} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="bg-card">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium flex items-center justify-between">
                            Temperature by Depth
                            <span className="text-xs text-muted-foreground">
                              Gradient: {tempGradient != null ? tempGradient.toFixed(1) : "--"} deg C
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {depthProfileTempData.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                              No temperature depth measurements.
                            </div>
                          ) : (
                            <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={depthProfileTempData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                                  <XAxis
                                    type="number"
                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                                    domain={["dataMin - 1", "dataMax + 1"]}
                                    label={{ value: "Temp (deg C)", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                                  />
                                  <YAxis
                                    dataKey="depth"
                                    type="number"
                                    reversed
                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                                    label={{ value: "Depth (m)", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                                  />
                                  <Tooltip content={<DepthProfileTooltip />} />
                                  <Bar dataKey="temperature" name="Temp (deg C)" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-card">
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Depth Measurement Data</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {depthProfileData.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground">No stratification profile data for the selected date.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-border/70">
                                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Depth (m)</th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">DO (mg/L)</th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Temp (deg C)</th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">pH</th>
                                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">DO Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {depthProfileData.map((row, i) => {
                                  const doValue = row.dissolvedOxygen
                                  const status =
                                    doValue == null ? "N/A" : doValue < 3 ? "CRITICAL" : doValue < 5 ? "WARNING" : "NORMAL"
                                  const statusClass =
                                    doValue == null
                                      ? "border-border text-muted-foreground"
                                      : doValue < 3
                                        ? "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/30"
                                        : doValue < 5
                                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30"
                                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  return (
                                    <tr key={`${row.depth}-${i}`} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                                      <td className="px-4 py-2.5 text-sm text-foreground">{row.depth.toFixed(1)}</td>
                                      <td className="px-4 py-2.5 text-right text-sm font-mono font-semibold" style={{ color: doValue != null ? getDoColor(doValue) : undefined }}>
                                        {doValue != null ? doValue.toFixed(2) : "--"}
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-sm font-mono text-foreground">
                                        {row.temperature != null ? row.temperature.toFixed(1) : "--"}
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-sm font-mono text-foreground">
                                        {row.pH != null ? row.pH.toFixed(2) : "--"}
                                      </td>
                                      <td className="px-4 py-2.5 text-center">
                                        <Badge variant="outline" className={`text-[10px] px-2 py-0 ${statusClass}`}>
                                          {status}
                                        </Badge>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="parameter">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">Parameter Analysis</h2>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <DataUpdatedAt updatedAt={latestUpdatedAt} />
                  <DataFetchingBadge isFetching={measurementsQuery.isFetching || ratingsQuery.isFetching} isLoading={loading} />
                </div>
                {dataIssues.length ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                    <p className="font-medium mb-1">Some water-quality data sources failed to load:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {dataIssues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {parameterTabContent}
              </div>
            </TabsContent>

          </Tabs>
        </div>
        )}

        {activeTab === "alerts" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Alerts</h2>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                <h3 className="font-semibold">Alert Intelligence</h3>
                <p className="text-sm text-muted-foreground">Current conditions that require attention.</p>
                {currentAlerts.length ? (
                  <div className="space-y-2">
                    {currentAlerts.map((alert) => (
                      <div key={alert} className="rounded-md border border-border/80 bg-muted/20 p-3 text-sm">
                        {alert}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                    No current alerts in the selected scope.
                  </div>
                )}
              </div>

              <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                <h3 className="font-semibold">Emerging Risks</h3>
                <p className="text-sm text-muted-foreground">Trend-based signals and volatility checks.</p>
                {emergingRisks.length ? (
                  <div className="space-y-2">
                    {emergingRisks.map((alert) => (
                      <div key={alert} className="rounded-md border border-orange-300/50 bg-orange-500/10 text-orange-700 dark:text-orange-300 p-3 text-sm">
                        {alert}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                    No emerging risks detected in the last two weeks.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}



