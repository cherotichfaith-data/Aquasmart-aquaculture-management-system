"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useQuery } from "@tanstack/react-query"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FarmSelector from "@/components/shared/farm-selector"
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
import TimePeriodSelector from "@/components/shared/time-period-selector"
import { getTimePeriodBounds } from "@/lib/api/dashboard"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const formatDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
}

const formatRatingLabel = (value: number) => {
  if (value === 1) return "Lethal"
  if (value === 2) return "Critical"
  if (value === 3) return "Acceptable"
  if (value === 4) return "Optimal"
  return String(value)
}

export default function WaterQualityPage() {
  const { farmId } = useActiveFarm()

  const {
    selectedBatch,
    setSelectedBatch,
    selectedSystem,
    setSelectedSystem,
    selectedStage,
    setSelectedStage,
    timePeriod,
    setTimePeriod,
  } = useSharedFilters("month")
  const [selectedParameter, setSelectedParameter] = useState<WqParameter>("dissolved_oxygen")
  const [showFeedingOverlay, setShowFeedingOverlay] = useState(true)
  const [showMortalityOverlay, setShowMortalityOverlay] = useState(true)
  const [doProfileDate, setDoProfileDate] = useState<string | null>(null)
  const [tempProfileDate, setTempProfileDate] = useState<string | null>(null)
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

  const boundsQuery = useQuery({
    queryKey: ["time-period-bounds", farmId ?? "all", timePeriod],
    queryFn: ({ signal }) => getTimePeriodBounds(timePeriod, signal, farmId ?? null),
    enabled: Boolean(farmId),
    staleTime: 5 * 60_000,
  })
  const dateFrom = boundsQuery.data?.start ?? undefined
  const dateTo = boundsQuery.data?.end ?? undefined
  const boundsReady = Boolean(dateFrom && dateTo)
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
    const systems = getResultRows(systemsQuery.data)
    systems.forEach((system) => {
      if (system.id != null) map.set(system.id, system.label ?? `System ${system.id}`)
    })
    return map
  }, [systemsQuery.data])

  const syncRow = useMemo(() => getResultRows(syncStatusQuery.data)[0] ?? null, [syncStatusQuery.data])
  const latestMeasurementTs = syncRow?.latest_measurement_ts ?? null
  const latestRatingDate = syncRow?.latest_rating_date ?? null
  const freshnessLagDays = useMemo(() => {
    if (!latestMeasurementTs || !latestRatingDate) return null
    const measurementDate = new Date(latestMeasurementTs)
    const ratingDate = new Date(`${latestRatingDate}T00:00:00`)
    if (Number.isNaN(measurementDate.getTime()) || Number.isNaN(ratingDate.getTime())) return null
    return Math.floor((measurementDate.getTime() - ratingDate.getTime()) / 86_400_000)
  }, [latestMeasurementTs, latestRatingDate])
  const ratingsStale = freshnessLagDays != null && freshnessLagDays > 1

  const ratingRows = useMemo(
    () =>
      getResultRows(ratingsQuery.data).filter(
        (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
      ),
    [ratingsQuery.data, scopedSystemIds],
  )

  const ratingDistribution = useMemo(() => {
    const dist = { optimal: 0, acceptable: 0, critical: 0, lethal: 0 }
    ratingRows.forEach((row) => {
      const rating = String(row.rating ?? "").toLowerCase()
      if (rating === "optimal") dist.optimal += 1
      else if (rating === "acceptable") dist.acceptable += 1
      else if (rating === "critical") dist.critical += 1
      else if (rating === "lethal") dist.lethal += 1
    })
    return dist
  }, [ratingRows])

  const worstParameterMix = useMemo(() => {
    const counts = new Map<string, number>()
    latestStatusRows.forEach((row) => {
      const key = String(row.worst_parameter ?? "unknown")
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [latestStatusRows])

  const summaryMetrics = useMemo(() => {
    const systemsMonitored = latestStatusRows.length
    const nonOptimal = latestStatusRows.filter((row) => String(row.rating ?? "").toLowerCase() !== "optimal").length
    const breaches = latestStatusRows.filter((row) => row.do_exceeded || row.ammonia_exceeded).length
    return { systemsMonitored, nonOptimal, breaches }
  }, [latestStatusRows])

  const worstMixLabel = useMemo(() => {
    if (!worstParameterMix.length) return "No data"
    return worstParameterMix
      .slice(0, 3)
      .map(([key, count]) => `${parameterLabels[key as WqParameter] ?? key}: ${count}`)
      .join(" | ")
  }, [worstParameterMix])

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

  const measurementEvents = useMemo<MeasurementEvent[]>(() => {
    const rows = getResultRows(measurementsQuery.data).filter(
      (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
    )
    const grouped = new Map<string, MeasurementEvent>()

    rows.forEach((row) => {
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
  }, [measurementsQuery.data, operatorByRecordId, scopedSystemIds, systemLabelById])

  const lastMeasurementBySystemId = useMemo(() => {
    const map = new Map<number, string>()
    measurementEvents.forEach((event) => {
      if (!map.has(event.systemId)) {
        map.set(event.systemId, event.timestamp)
      }
    })
    return map
  }, [measurementEvents])

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
    const byDate = new Map<string, { sum: number; count: number; min: number; max: number }>()
    const measurementRows = getResultRows(measurementsQuery.data).filter(
      (row) => row.system_id != null && scopedSystemIds.includes(row.system_id) && row.parameter_name === selectedParameter,
    )

    measurementRows.forEach((row) => {
      if (!row.date) return
      const value = row.parameter_value ?? null
      if (value == null) return
      const current = byDate.get(row.date) ?? { sum: 0, count: 0, min: value, max: value }
      current.sum += value
      current.count += 1
      current.min = Math.min(current.min, value)
      current.max = Math.max(current.max, value)
      byDate.set(row.date, current)
    })

    const rows = Array.from(byDate.entries())
      .map(([date, agg]) => ({
        date,
        mean: agg.count > 0 ? agg.sum / agg.count : null,
        min: agg.min,
        max: agg.max,
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
  }, [measurementsQuery.data, overlayByDate, scopedSystemIds, selectedParameter])

  const dailyDoVariation = useMemo(() => {
    const byDate = new Map<string, { min: number; max: number }>()
    const measurementRows = getResultRows(measurementsQuery.data).filter(
      (row) => row.system_id != null && scopedSystemIds.includes(row.system_id) && row.parameter_name === "dissolved_oxygen",
    )

    measurementRows.forEach((row) => {
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
  }, [measurementsQuery.data, scopedSystemIds])

  const dailyTempAverage = useMemo(() => {
    const byDate = new Map<string, { sum: number; count: number }>()
    const measurementRows = getResultRows(measurementsQuery.data).filter(
      (row) => row.system_id != null && scopedSystemIds.includes(row.system_id) && row.parameter_name === "temperature",
    )

    measurementRows.forEach((row) => {
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
  }, [measurementsQuery.data, scopedSystemIds])

  const wqiSummary = useMemo(() => {
    const measurementRows = getResultRows(measurementsQuery.data).filter(
      (row) =>
        row.system_id != null &&
        scopedSystemIds.includes(row.system_id) &&
        (row.parameter_name === "dissolved_oxygen" || row.parameter_name === "temperature") &&
        row.water_depth != null,
    )

    const tempValues = measurementRows
      .filter((row) => row.parameter_name === "temperature" && row.parameter_value != null)
      .map((row) => row.parameter_value as number)

    const tempMean = tempValues.length ? tempValues.reduce((sum, v) => sum + v, 0) / tempValues.length : null
    const tempVariance =
      tempValues.length > 1 && tempMean != null
        ? tempValues.reduce((sum, v) => sum + (v - tempMean) ** 2, 0) / tempValues.length
        : null
    const tempStd = tempVariance != null ? Math.sqrt(tempVariance) : null

    const scoreDo = (value: number | null) => {
      if (value == null) return null
      if (value >= lowDoThreshold * 1.2) return 90
      if (value >= lowDoThreshold) return 60
      if (value >= lowDoThreshold * 0.8) return 30
      return 0
    }

    const scoreTemp = (value: number | null) => {
      if (value == null || tempMean == null || tempStd == null || tempStd === 0) return null
      const delta = Math.abs(value - tempMean)
      if (delta <= tempStd) return 90
      if (delta <= tempStd * 2) return 60
      if (delta <= tempStd * 3) return 30
      return 0
    }

    const byKey = new Map<string, { date: string; systemId: number; depth: number; doValues: number[]; tempValues: number[] }>()
    measurementRows.forEach((row) => {
      if (!row.date || row.system_id == null || row.parameter_value == null || row.water_depth == null) return
      const key = `${row.date}|${row.system_id}|${row.water_depth}`
      const current =
        byKey.get(key) ?? {
          date: row.date,
          systemId: row.system_id,
          depth: row.water_depth,
          doValues: [],
          tempValues: [],
        }
      if (row.parameter_name === "dissolved_oxygen") current.doValues.push(row.parameter_value)
      if (row.parameter_name === "temperature") current.tempValues.push(row.parameter_value)
      byKey.set(key, current)
    })

    const wqiValues: number[] = []
    byKey.forEach((row) => {
      const doAvg = row.doValues.length ? row.doValues.reduce((sum, v) => sum + v, 0) / row.doValues.length : null
      const tempAvg = row.tempValues.length
        ? row.tempValues.reduce((sum, v) => sum + v, 0) / row.tempValues.length
        : null
      const doScore = scoreDo(doAvg)
      const tempScore = scoreTemp(tempAvg)
      if (doScore == null || tempScore == null) return
      wqiValues.push((doScore + tempScore) / 2)
    })

    const bucketCounts = { poor: 0, moderate: 0, good: 0 }
    wqiValues.forEach((value) => {
      if (value < 50) bucketCounts.poor += 1
      else if (value < 70) bucketCounts.moderate += 1
      else bucketCounts.good += 1
    })

    const avg = wqiValues.length ? wqiValues.reduce((sum, v) => sum + v, 0) / wqiValues.length : null
    const min = wqiValues.length ? Math.min(...wqiValues) : null
    const max = wqiValues.length ? Math.max(...wqiValues) : null

    return {
      buckets: [
        { label: "Poor (0-50)", count: bucketCounts.poor },
        { label: "Moderate (50-70)", count: bucketCounts.moderate },
        { label: "Good (70-100)", count: bucketCounts.good },
      ],
      stats: { avg, min, max, total: wqiValues.length },
      hasData: wqiValues.length > 0,
    }
  }, [measurementsQuery.data, scopedSystemIds, lowDoThreshold])

  const doDepthProfiles = useMemo(() => {
    const byDate = new Map<string, Map<number, { sum: number; count: number }>>()
    const measurementRows = getResultRows(measurementsQuery.data).filter(
      (row) =>
        row.system_id != null &&
        scopedSystemIds.includes(row.system_id) &&
        row.parameter_name === "dissolved_oxygen" &&
        row.water_depth != null,
    )

    measurementRows.forEach((row) => {
      if (!row.date || row.parameter_value == null || row.water_depth == null) return
      const depth = Number(row.water_depth)
      if (!Number.isFinite(depth)) return
      const dateMap = byDate.get(row.date) ?? new Map()
      const current = dateMap.get(depth) ?? { sum: 0, count: 0 }
      current.sum += row.parameter_value
      current.count += 1
      dateMap.set(depth, current)
      byDate.set(row.date, dateMap)
    })

    const dates = Array.from(byDate.keys()).sort()
    const dataByDate = new Map<string, Array<{ depth: number; avg: number }>>()
    dates.forEach((date) => {
      const depthMap = byDate.get(date)
      if (!depthMap) return
      const rows = Array.from(depthMap.entries())
        .map(([depth, agg]) => ({ depth, avg: agg.count > 0 ? agg.sum / agg.count : null }))
        .filter((row): row is { depth: number; avg: number } => row.avg != null)
        .sort((a, b) => a.depth - b.depth)
      dataByDate.set(date, rows)
    })

    return { dates, dataByDate }
  }, [measurementsQuery.data, scopedSystemIds])

  const tempDepthProfiles = useMemo(() => {
    const byDate = new Map<string, Map<number, { sum: number; count: number }>>()
    const measurementRows = getResultRows(measurementsQuery.data).filter(
      (row) =>
        row.system_id != null &&
        scopedSystemIds.includes(row.system_id) &&
        row.parameter_name === "temperature" &&
        row.water_depth != null,
    )

    measurementRows.forEach((row) => {
      if (!row.date || row.parameter_value == null || row.water_depth == null) return
      const depth = Number(row.water_depth)
      if (!Number.isFinite(depth)) return
      const dateMap = byDate.get(row.date) ?? new Map()
      const current = dateMap.get(depth) ?? { sum: 0, count: 0 }
      current.sum += row.parameter_value
      current.count += 1
      dateMap.set(depth, current)
      byDate.set(row.date, dateMap)
    })

    const dates = Array.from(byDate.keys()).sort()
    const dataByDate = new Map<string, Array<{ depth: number; avg: number }>>()
    dates.forEach((date) => {
      const depthMap = byDate.get(date)
      if (!depthMap) return
      const rows = Array.from(depthMap.entries())
        .map(([depth, agg]) => ({ depth, avg: agg.count > 0 ? agg.sum / agg.count : null }))
        .filter((row): row is { depth: number; avg: number } => row.avg != null)
        .sort((a, b) => a.depth - b.depth)
      dataByDate.set(date, rows)
    })

    return { dates, dataByDate }
  }, [measurementsQuery.data, scopedSystemIds])

  const selectedDoProfileDate = doProfileDate && doDepthProfiles.dataByDate.has(doProfileDate) ? doProfileDate : null
  const selectedTempProfileDate =
    tempProfileDate && tempDepthProfiles.dataByDate.has(tempProfileDate) ? tempProfileDate : null
  const doDepthData = selectedDoProfileDate ? doDepthProfiles.dataByDate.get(selectedDoProfileDate) ?? [] : []
  const tempDepthData = selectedTempProfileDate ? tempDepthProfiles.dataByDate.get(selectedTempProfileDate) ?? [] : []

  useEffect(() => {
    if (!doDepthProfiles.dates.length) {
      if (doProfileDate !== null) setDoProfileDate(null)
      return
    }
    const latest = doDepthProfiles.dates[doDepthProfiles.dates.length - 1]
    if (doProfileDate !== latest) {
      setDoProfileDate(latest)
    }
  }, [doDepthProfiles, doProfileDate])

  useEffect(() => {
    if (!tempDepthProfiles.dates.length) {
      if (tempProfileDate !== null) setTempProfileDate(null)
      return
    }
    const latest = tempDepthProfiles.dates[tempDepthProfiles.dates.length - 1]
    if (tempProfileDate !== latest) {
      setTempProfileDate(latest)
    }
  }, [tempDepthProfiles, tempProfileDate])

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
    if (key === "optimal") return "bg-emerald-500/10 text-emerald-600"
    if (key === "acceptable") return "bg-yellow-500/10 text-yellow-700"
    if (key === "critical") return "bg-orange-500/10 text-orange-700"
    if (key === "lethal") return "bg-red-500/10 text-red-600"
    return "bg-muted/50 text-muted-foreground"
  }

  const actionBadgeClass = (action: string) => {
    if (action === "Escalate") return "bg-red-500/10 text-red-600"
    if (action === "Investigate") return "bg-orange-500/10 text-orange-700"
    if (action === "Watch") return "bg-yellow-500/10 text-yellow-700"
    return "bg-emerald-500/10 text-emerald-600"
  }

  const dailyParameterByDate = useMemo(() => {
    const map = new Map<string, { doValue?: number; ammoniaValue?: number; tempValue?: number }>()
    const measurementRows = getResultRows(measurementsQuery.data).filter(
      (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
    )
    measurementRows.forEach((row) => {
      if (!row.date || row.parameter_value == null) return
      const current = map.get(row.date) ?? {}
      if (row.parameter_name === "dissolved_oxygen") current.doValue = row.parameter_value
      if (row.parameter_name === "ammonia_ammonium") current.ammoniaValue = row.parameter_value
      if (row.parameter_name === "temperature") current.tempValue = row.parameter_value
      map.set(row.date, current)
    })
    return map
  }, [measurementsQuery.data, scopedSystemIds])

  const relationshipScatterData = useMemo(() => {
    const doMortality: Array<{ x: number; y: number }> = []
    const ammoniaFeeding: Array<{ x: number; y: number }> = []
    const tempRating: Array<{ x: number; y: number }> = []

    dailyRiskTrend.forEach((row) => {
      const overlay = overlayByDate.get(row.date)
      const params = dailyParameterByDate.get(row.date)
      if (params?.doValue != null && overlay?.mortality != null) {
        doMortality.push({ x: params.doValue, y: overlay.mortality })
      }
      if (params?.ammoniaValue != null && overlay?.feeding != null) {
        ammoniaFeeding.push({ x: params.ammoniaValue, y: overlay.feeding })
      }
      if (params?.tempValue != null && typeof row.rating === "number") {
        tempRating.push({ x: params.tempValue, y: row.rating })
      }
    })

    return {
      doMortality,
      ammoniaFeeding,
      tempRating,
    }
  }, [dailyParameterByDate, dailyRiskTrend, overlayByDate])

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

  const exportCsv = () => {
    const header = ["parameter_name", "reading", "timestamp", "system", "operator"]
    const rows: string[] = []
    const exportStart = dateFrom ?? "start"
    const exportEnd = dateTo ?? "end"
    measurementEvents.forEach((event) => {
      const timestamp = `${event.date} ${event.time}`
      const entries: Array<[string, number | null]> = [
        ["dissolved_oxygen", event.dissolved_oxygen],
        ["pH", event.pH],
        ["temperature", event.temperature],
        ["ammonia_ammonium", event.ammonia_ammonium],
      ]
      entries.forEach(([name, value]) => {
        if (value == null) return
        rows.push(
          [name, String(value), timestamp, event.systemLabel, event.operator]
            .map((cell) => `"${cell.replaceAll('"', '""')}"`)
            .join(","),
        )
      })
    })

    const csv = [header.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `water-quality-compliance-${exportStart}-to-${exportEnd}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportPdf = () => {
    const exportStart = dateFrom ?? "start"
    const exportEnd = dateTo ?? "end"
    const rows = measurementEvents
      .slice(0, 500)
      .map(
        (event) =>
          `<tr><td>${event.systemLabel}</td><td>${event.date} ${event.time}</td><td>${event.dissolved_oxygen ?? ""}</td><td>${event.pH ?? ""}</td><td>${event.temperature ?? ""}</td><td>${event.ammonia_ammonium ?? ""}</td><td>${event.operator}</td></tr>`,
      )
      .join("")

    const popup = window.open("", "_blank")
    if (!popup) return
    popup.document.write(`
      <html><head><title>Water Quality Compliance Report</title></head>
      <body>
        <h1>Water Quality Compliance Report</h1>
        <p>Period: ${exportStart} to ${exportEnd}</p>
        <table border="1" cellspacing="0" cellpadding="6">
          <thead><tr><th>System</th><th>Timestamp</th><th>DO</th><th>pH</th><th>Temp</th><th>Ammonia</th><th>Operator</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>
    `)
    popup.document.close()
    popup.focus()
    popup.print()
  }

  const loading =
    measurementsQuery.isLoading ||
    ratingsQuery.isLoading ||
    overlayQuery.isLoading ||
    systemsQuery.isLoading ||
    latestStatusQuery.isLoading ||
    syncStatusQuery.isLoading

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">Water Quality Monitoring</h1>
            <p className="text-muted-foreground mt-1">Live system risk, daily ratings, and parameter trends for the selected scope.</p>
            <div className="mt-2 text-xs text-muted-foreground">
              <span>Latest measurement: {latestMeasurementTs ? formatTimestamp(latestMeasurementTs) : "N/A"}</span>
              <span className="mx-2">|</span>
              <span>Latest daily rating: {latestRatingDate ? formatTimestamp(`${latestRatingDate}T00:00:00`) : "N/A"}</span>
              {ratingsStale ? (
                <span className="ml-2 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                  Ratings may be stale
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <DataUpdatedAt updatedAt={latestUpdatedAt} />
            <DataFetchingBadge isFetching={measurementsQuery.isFetching || ratingsQuery.isFetching} isLoading={loading} />
          </div>

          <FarmSelector
            selectedBatch={selectedBatch}
            selectedSystem={selectedSystem}
            selectedStage={selectedStage}
            onBatchChange={setSelectedBatch}
            onSystemChange={setSelectedSystem}
            onStageChange={setSelectedStage}
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex items-center">
              <TimePeriodSelector selectedPeriod={timePeriod} onPeriodChange={setTimePeriod} />
            </div>
            <select value={selectedParameter} onChange={(e) => setSelectedParameter(e.target.value as WqParameter)} className="px-3 py-2 rounded-md border border-input bg-background text-sm">
              {Object.entries(parameterLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex gap-2 md:col-span-2">
              <button type="button" onClick={exportCsv} className="px-3 py-2 rounded-md border border-border text-sm hover:bg-muted/40">Export CSV</button>
              <button type="button" onClick={exportPdf} className="px-3 py-2 rounded-md border border-border text-sm hover:bg-muted/40">Export PDF</button>
            </div>
          </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Systems monitored</p>
            <p className="text-2xl font-bold mt-1">{summaryMetrics.systemsMonitored}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Latest non-optimal</p>
            <p className="text-2xl font-bold mt-1">{summaryMetrics.nonOptimal}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Threshold breaches</p>
            <p className="text-2xl font-bold mt-1">{summaryMetrics.breaches}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Worst parameter mix</p>
            <p className="text-sm font-semibold mt-2">{worstMixLabel}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Freshness lag</p>
            <p className="text-2xl font-bold mt-1">
              {freshnessLagDays != null ? `${freshnessLagDays} day${freshnessLagDays === 1 ? "" : "s"}` : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Latest measurement: {latestMeasurementTs ? formatTimestamp(latestMeasurementTs) : "N/A"}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Rating distribution (days)</p>
            <p className="text-sm font-semibold mt-2">
              Optimal {ratingDistribution.optimal} | Acceptable {ratingDistribution.acceptable} | Critical {ratingDistribution.critical} | Lethal {ratingDistribution.lethal}
            </p>
          </div>
        </div>

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
                                  ? "text-emerald-600"
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

        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Analytics</h2>
              <p className="text-sm text-muted-foreground">Daily risk, parameter behavior, and relationships.</p>
            </div>
            <div className="flex gap-3 text-xs">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={showFeedingOverlay} onChange={(e) => setShowFeedingOverlay(e.target.checked)} />
                Overlay feeding
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={showMortalityOverlay} onChange={(e) => setShowMortalityOverlay(e.target.checked)} />
                Overlay mortality
              </label>
            </div>
          </div>

          <Tabs defaultValue="daily">
            <TabsList className="mb-4">
              <TabsTrigger value="daily">Daily risk trend</TabsTrigger>
              <TabsTrigger value="parameter">Parameter trend</TabsTrigger>
              <TabsTrigger value="relationship">Relationships</TabsTrigger>
            </TabsList>

            <TabsContent value="daily">
              {loading ? (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground">Loading daily risk trend...</div>
              ) : dailyRiskTrend.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground">No daily ratings in this range.</div>
              ) : (
                <>
                  <div className="h-[320px] rounded-md border border-border/80 bg-muted/20 p-2">
                    <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={dailyRiskTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tickFormatter={formatDateLabel} />
                          <YAxis yAxisId="rating" domain={[1, 4]} ticks={[1, 2, 3, 4]} tickFormatter={formatRatingLabel} />
                          <YAxis yAxisId="overlay" orientation="right" />
                          <ReferenceArea y1={3.5} y2={4.5} fill="hsl(var(--chart-2))" fillOpacity={0.08} />
                          <ReferenceArea y1={2.5} y2={3.5} fill="hsl(var(--chart-3))" fillOpacity={0.08} />
                          <ReferenceArea y1={1.5} y2={2.5} fill="hsl(var(--chart-4))" fillOpacity={0.12} />
                          <ReferenceArea y1={0.5} y2={1.5} fill="hsl(var(--destructive))" fillOpacity={0.12} />
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
                              return [numeric.toLocaleString(undefined, { maximumFractionDigits: 2 }), String(name)]
                            }}
                          />
                          <Legend />
                          <Line
                            yAxisId="rating"
                            type="monotone"
                            dataKey="rating"
                            name="Daily rating"
                            stroke="var(--color-chart-1)"
                            strokeWidth={2}
                            dot={({ cx, cy, payload }) => {
                              if (cx == null || cy == null) return null
                              const color = worstParamColor(payload?.worstParameter)
                              const key = payload?.date ? `dot-${payload.date}` : `dot-${cx}-${cy}`
                              return (
                                <circle
                                  key={key}
                                  cx={cx}
                                  cy={cy}
                                  r={4}
                                  fill={color}
                                  stroke="#ffffff"
                                  strokeWidth={1}
                                />
                              )
                            }}
                          />
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
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: worstParamColor("dissolved_oxygen") }} />
                      DO
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: worstParamColor("ammonia_ammonium") }} />
                      Ammonia
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: worstParamColor("temperature") }} />
                      Temperature
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: worstParamColor("pH") }} />
                      pH
                    </span>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="parameter">
              {loading ? (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground">Loading parameter trend...</div>
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
                          <Line yAxisId="param" type="monotone" dataKey="min" name="Daily min" stroke="var(--color-chart-3)" strokeDasharray="2 2" dot={false} />
                          <Line yAxisId="param" type="monotone" dataKey="max" name="Daily max" stroke="var(--color-chart-4)" strokeDasharray="2 2" dot={false} />
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

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-md border border-border/80 bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold">DO Depth Profile</p>
                          <p className="text-xs text-muted-foreground">Average DO by depth for the selected date.</p>
                        </div>
                        {doDepthProfiles.dates.length ? (
                          <select
                            value={selectedDoProfileDate ?? ""}
                            onChange={(event) => setDoProfileDate(event.target.value)}
                            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                          >
                            {doDepthProfiles.dates.map((date) => (
                              <option key={date} value={date}>
                                {formatDateLabel(date)}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                      {doDepthData.length === 0 ? (
                        <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                          No depth profile data for dissolved oxygen.
                        </div>
                      ) : (
                        <div className="h-[220px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={doDepthData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" dataKey="avg" />
                              <YAxis type="number" dataKey="depth" reversed />
                              <Tooltip
                                labelFormatter={(label) => `Avg DO: ${Number(label).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mg/L`}
                                formatter={(value) => [`${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`, "Depth"]}
                              />
                              <Line type="monotone" dataKey="depth" stroke="var(--color-chart-2)" strokeWidth={2} dot />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    <div className="rounded-md border border-border/80 bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold">Temperature Depth Profile</p>
                          <p className="text-xs text-muted-foreground">Average temperature by depth for the selected date.</p>
                        </div>
                        {tempDepthProfiles.dates.length ? (
                          <select
                            value={selectedTempProfileDate ?? ""}
                            onChange={(event) => setTempProfileDate(event.target.value)}
                            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                          >
                            {tempDepthProfiles.dates.map((date) => (
                              <option key={date} value={date}>
                                {formatDateLabel(date)}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                      {tempDepthData.length === 0 ? (
                        <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                          No depth profile data for temperature.
                        </div>
                      ) : (
                        <div className="h-[220px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={tempDepthData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" dataKey="avg" />
                              <YAxis type="number" dataKey="depth" reversed />
                              <Tooltip
                                labelFormatter={(label) => `Avg Temp: ${Number(label).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} deg C`}
                                formatter={(value) => [`${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`, "Depth"]}
                              />
                              <Line type="monotone" dataKey="depth" stroke="var(--color-chart-1)" strokeWidth={2} dot />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="relationship">
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Water Quality Index (WQI)</p>
                      <p className="text-xs text-muted-foreground">
                        Based on dissolved oxygen and temperature using existing measurements and farm thresholds.
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">Buckets: Poor 0-50, Moderate 50-70, Good 70-100</span>
                  </div>
                  {wqiSummary.hasData ? (
                    <div className="mt-3 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-4">
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={wqiSummary.buckets}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis allowDecimals={false} />
                            <Tooltip formatter={(value) => [Number(value).toLocaleString(), "Count"]} />
                            <Bar dataKey="count" fill="var(--color-chart-3)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="rounded-md border border-border/80 bg-background px-3 py-2">
                          <p className="text-xs text-muted-foreground">Samples</p>
                          <p className="font-semibold">{wqiSummary.stats.total}</p>
                        </div>
                        <div className="rounded-md border border-border/80 bg-background px-3 py-2">
                          <p className="text-xs text-muted-foreground">Average</p>
                          <p className="font-semibold">{wqiSummary.stats.avg != null ? wqiSummary.stats.avg.toFixed(1) : "N/A"}</p>
                        </div>
                        <div className="rounded-md border border-border/80 bg-background px-3 py-2">
                          <p className="text-xs text-muted-foreground">Min / Max</p>
                          <p className="font-semibold">
                            {wqiSummary.stats.min != null ? wqiSummary.stats.min.toFixed(0) : "N/A"} /{" "}
                            {wqiSummary.stats.max != null ? wqiSummary.stats.max.toFixed(0) : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-md border border-border/80 bg-background p-3 text-sm text-muted-foreground">
                      Not enough DO and temperature measurements (with depth) to compute WQI.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-xs text-muted-foreground">DO vs Mortality</p>
                    <div className="h-[220px] mt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="x" name="DO" unit="mg/L" />
                          <YAxis dataKey="y" name="Mortality" />
                          <Tooltip
                            cursor={{ strokeDasharray: "3 3" }}
                            formatter={(value, name) => {
                              if (name === "x") return [`${Number(value).toLocaleString()} mg/L`, "DO"]
                              if (name === "y") return [`${Number(value).toLocaleString()} fish`, "Mortality"]
                              return [Number(value).toLocaleString(), String(name)]
                            }}
                          />
                          <Scatter data={relationshipScatterData.doMortality} fill="var(--color-chart-1)" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-xs text-muted-foreground">Ammonia vs Feeding</p>
                    <div className="h-[220px] mt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="x" name="Ammonia" unit="mg/L" />
                          <YAxis dataKey="y" name="Feeding" />
                          <Tooltip
                            cursor={{ strokeDasharray: "3 3" }}
                            formatter={(value, name) => {
                              if (name === "x") return [`${Number(value).toLocaleString()} mg/L`, "Ammonia"]
                              if (name === "y") return [`${Number(value).toLocaleString()} kg`, "Feeding"]
                              return [Number(value).toLocaleString(), String(name)]
                            }}
                          />
                          <Scatter data={relationshipScatterData.ammoniaFeeding} fill="var(--color-chart-3)" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-xs text-muted-foreground">Temperature vs Rating</p>
                    <div className="h-[220px] mt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="x" name="Temperature" unit="deg C" />
                          <YAxis dataKey="y" name="Rating" domain={[1, 4]} ticks={[1, 2, 3, 4]} tickFormatter={formatRatingLabel} />
                          <Tooltip
                            cursor={{ strokeDasharray: "3 3" }}
                            formatter={(value, name) => {
                              if (String(name).toLowerCase().includes("rating")) {
                                return [formatRatingLabel(Number(value)), String(name)]
                              }
                              if (name === "x") return [`${Number(value).toLocaleString()} deg C`, "Temperature"]
                              if (name === "y") return [formatRatingLabel(Number(value)), "Rating"]
                              return [Number(value).toLocaleString(), String(name)]
                            }}
                          />
                          <Scatter data={relationshipScatterData.tempRating} fill="var(--color-chart-2)" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
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
                  <div key={alert} className="rounded-md border border-orange-300/50 bg-orange-500/10 text-orange-700 p-3 text-sm">
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
    </DashboardLayout>
  )
}


