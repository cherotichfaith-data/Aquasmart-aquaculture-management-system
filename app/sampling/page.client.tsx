"use client"

import { useMemo } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useSamplingData, useTransferData } from "@/lib/hooks/use-reports"
import { sortByDateAsc } from "@/lib/utils"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useSharedFilters } from "@/hooks/use-shared-filters"
import { useTimePeriodBounds } from "@/hooks/use-time-period-bounds"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { useSystemsTable } from "@/lib/hooks/use-dashboard"
import { useAppConfig, useSystemVolumes } from "@/lib/hooks/use-options"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LazyRender } from "@/components/shared/lazy-render"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"

const formatDayLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
}

const formatFullDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(parsed)
}

const formatWithUnit = (value: number | null | undefined, decimals: number, unit: string) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--"
  return `${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${unit}`
}

const DEFAULT_TARGET_DENSITY = 15
const DEFAULT_HARVEST_TARGET_G = 1200
const DEFAULT_MOVE_TARGET_G = 50
const DEFAULT_GROWTH_CURVE = [
  { day: 0, abw: 10 },
  { day: 30, abw: 60 },
  { day: 60, abw: 150 },
  { day: 90, abw: 300 },
  { day: 120, abw: 500 },
  { day: 150, abw: 800 },
  { day: 180, abw: 1200 },
]

const safeDayDiff = (start: string, end: string) => {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000))
}

const resolveTargetAbw = (daySinceStart: number, curve: Array<{ day: number; abw: number }>) => {
  if (!Number.isFinite(daySinceStart) || curve.length === 0) return null
  const points = curve.slice().sort((a, b) => a.day - b.day)
  if (daySinceStart <= points[0].day) return points[0].abw
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]
    const next = points[i]
    if (daySinceStart <= next.day) {
      const span = next.day - prev.day
      if (span <= 0) return next.abw
      const progress = (daySinceStart - prev.day) / span
      return prev.abw + (next.abw - prev.abw) * progress
    }
  }
  return points[points.length - 1].abw
}


export default function SamplingPage() {
  const { farmId } = useActiveFarm()
  const {
    selectedBatch,
    selectedSystem,
    selectedStage,
    timePeriod,
  } = useSharedFilters("quarter")

  const {
    selectedSystemId: systemId,
    hasSystem,
    batchId,
    scopedSystemIdList,
    scopedSystemIds,
    systemsQuery,
    batchSystemsQuery,
  } = useScopedSystemIds({
    farmId,
    selectedStage,
    selectedBatch,
    selectedSystem,
  })

  const boundsQuery = useTimePeriodBounds({ farmId, timePeriod })
  const hasBounds = boundsQuery.hasBounds
  const dateFrom = boundsQuery.start ?? undefined
  const dateTo = boundsQuery.end ?? undefined

  const systemsTableQuery = useSystemsTable({
    farmId,
    stage: selectedStage,
    batch: selectedBatch,
    system: selectedSystem,
    timePeriod,
    dateFrom,
    dateTo,
    includeIncomplete: true,
  })

  const systemVolumesQuery = useSystemVolumes({
    farmId,
    stage: selectedStage,
    activeOnly: true,
  })

  const appConfigQuery = useAppConfig({
    keys: [
      "target_density_kg_m3",
      "target_harvest_weight_g",
      "target_move_weight_g",
      "growth_curve_points",
    ],
  })

  const samplingQueryEnabled = hasSystem || scopedSystemIdList.length > 0

  const samplingQuery = useSamplingData({
    systemId: hasSystem ? (systemId as number) : undefined,
    systemIds: !hasSystem ? scopedSystemIdList : undefined,
    batchId: Number.isFinite(batchId) ? batchId : undefined,
    dateFrom,
    dateTo,
    limit: 2000,
    enabled: samplingQueryEnabled && hasBounds,
  })
  const tableEnabled = samplingQueryEnabled && hasBounds
  const transferQuery = useTransferData({
    batchId: Number.isFinite(batchId) ? batchId : undefined,
    dateFrom,
    dateTo,
    limit: 2000,
    enabled: samplingQueryEnabled && hasBounds,
  })

  const rows = samplingQuery.data?.status === "success" ? samplingQuery.data.data : []
  const loading =
    samplingQuery.isLoading ||
    transferQuery.isLoading ||
    systemsQuery.isLoading ||
    batchSystemsQuery.isLoading ||
    systemsTableQuery.isLoading ||
    systemVolumesQuery.isLoading
  const errorMessages = [
    getErrorMessage(samplingQuery.error),
    getErrorMessage(transferQuery.error),
    getQueryResultError(samplingQuery.data),
    getQueryResultError(transferQuery.data),
    getErrorMessage(systemsQuery.error),
    getQueryResultError(systemsQuery.data),
    getErrorMessage(batchSystemsQuery.error),
    getQueryResultError(batchSystemsQuery.data),
    getErrorMessage(systemsTableQuery.error),
    getErrorMessage(systemVolumesQuery.error),
    getErrorMessage(appConfigQuery.error),
  ].filter(Boolean) as string[]
  const latestUpdatedAt = Math.max(
    samplingQuery.dataUpdatedAt ?? 0,
    transferQuery.dataUpdatedAt ?? 0,
    systemsQuery.dataUpdatedAt ?? 0,
    batchSystemsQuery.dataUpdatedAt ?? 0,
    systemsTableQuery.dataUpdatedAt ?? 0,
    systemVolumesQuery.dataUpdatedAt ?? 0,
    appConfigQuery.dataUpdatedAt ?? 0,
  )

  const filteredRows = useMemo(
    () => rows.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [rows, scopedSystemIds],
  )
  const systemNameById = useMemo(() => {
    const map = new Map<number, string>()
    if (systemsQuery.data?.status === "success") {
      systemsQuery.data.data.forEach((row) => {
        if (row.id == null) return
        map.set(row.id, row.label ?? `System ${row.id}`)
      })
    }
    return map
  }, [systemsQuery.data])
  const dashboardRows = systemsTableQuery.data?.rows ?? []
  const dashboardRowBySystemId = useMemo(() => {
    const map = new Map<number, (typeof dashboardRows)[number]>()
    dashboardRows.forEach((row) => {
      if (row.system_id == null) return
      map.set(row.system_id, row)
    })
    return map
  }, [dashboardRows])
  const volumeBySystemId = useMemo(() => {
    const map = new Map<number, number>()
    if (systemVolumesQuery.data?.status === "success") {
      systemVolumesQuery.data.data.forEach((row) => {
        if (row.id == null) return
        if (typeof row.volume === "number" && Number.isFinite(row.volume)) {
          map.set(row.id, row.volume)
        }
      })
    }
    return map
  }, [systemVolumesQuery.data])
  const configMap = useMemo(() => {
    const map = new Map<string, string>()
    if (appConfigQuery.data?.status === "success") {
      appConfigQuery.data.data.forEach((row) => {
        if (!row.key) return
        map.set(row.key, row.value ?? "")
      })
    }
    return map
  }, [appConfigQuery.data])
  const targetDensity = Number(configMap.get("target_density_kg_m3") ?? "")
  const targetDensityKgM3 = Number.isFinite(targetDensity) && targetDensity > 0 ? targetDensity : DEFAULT_TARGET_DENSITY
  const harvestTargetValue = Number(configMap.get("target_harvest_weight_g") ?? "")
  const harvestTargetG =
    Number.isFinite(harvestTargetValue) && harvestTargetValue > 0 ? harvestTargetValue : DEFAULT_HARVEST_TARGET_G
  const moveTargetValue = Number(configMap.get("target_move_weight_g") ?? "")
  const moveTargetG =
    Number.isFinite(moveTargetValue) && moveTargetValue > 0 ? moveTargetValue : DEFAULT_MOVE_TARGET_G
  const curveOverride = configMap.get("growth_curve_points")
  const targetCurvePoints = useMemo(() => {
    if (!curveOverride) return DEFAULT_GROWTH_CURVE
    try {
      const parsed = JSON.parse(curveOverride)
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .map((point) => ({
            day: Number(point?.day),
            abw: Number(point?.abw),
          }))
          .filter((point) => Number.isFinite(point.day) && Number.isFinite(point.abw))
        if (cleaned.length > 1) return cleaned
      }
    } catch {
      // fall back to defaults
    }
    return DEFAULT_GROWTH_CURVE
  }, [curveOverride])
  const transferRows = transferQuery.data?.status === "success" ? transferQuery.data.data : []
  const transferMarkers = useMemo(() => {
    const markers = new Map<
      string,
      { date: string; label: string; count: number; inbound: number; outbound: number }
    >()
    transferRows.forEach((row) => {
      if (!row.date) return
      const originInScope = hasSystem
        ? row.origin_system_id === systemId
        : scopedSystemIds.has(row.origin_system_id)
      const targetInScope = hasSystem
        ? row.target_system_id === systemId
        : scopedSystemIds.has(row.target_system_id)
      if (!originInScope && !targetInScope) return
      const current =
        markers.get(row.date) ?? {
          date: row.date,
          label: formatDayLabel(row.date),
          count: 0,
          inbound: 0,
          outbound: 0,
        }
      current.count += 1
      if (originInScope) current.outbound += 1
      if (targetInScope) current.inbound += 1
      markers.set(row.date, current)
    })
    return sortByDateAsc(Array.from(markers.values()), (item) => item.date)
  }, [transferRows, hasSystem, scopedSystemIds, systemId])

  const chartRows = useMemo(() => {
    const byDate = new Map<string, { sampled: number; totalWeight: number; weightedAbw: number; abwWeight: number; fallbackAbw: number; fallbackCount: number }>()
    filteredRows.forEach((item) => {
      if (!item.date) return
      const current = byDate.get(item.date) ?? { sampled: 0, totalWeight: 0, weightedAbw: 0, abwWeight: 0, fallbackAbw: 0, fallbackCount: 0 }
      const sampled = item.number_of_fish_sampling ?? 0
      current.sampled += sampled
      current.totalWeight += item.total_weight_sampling ?? 0
      if (typeof item.abw === "number") {
        if (sampled > 0) {
          current.weightedAbw += item.abw * sampled
          current.abwWeight += sampled
        } else {
          current.fallbackAbw += item.abw
          current.fallbackCount += 1
        }
      }
      byDate.set(item.date, current)
    })
    const baseRows = sortByDateAsc(
      Array.from(byDate.entries()).map(([date, current]) => ({
        date,
        abw:
          current.abwWeight > 0
            ? current.weightedAbw / current.abwWeight
            : current.fallbackCount > 0
              ? current.fallbackAbw / current.fallbackCount
              : null,
        fishSampled: current.sampled,
        totalWeight: current.totalWeight,
      })),
      (item) => item.date,
    )
    if (baseRows.length === 0) return []

    const startDate = baseRows[0].date
    return baseRows.map((row) => {
      const daySinceStart = safeDayDiff(startDate, row.date) ?? 0
      const targetAbw = resolveTargetAbw(daySinceStart, targetCurvePoints)
      return {
        ...row,
        targetAbw,
        label: formatDayLabel(row.date),
      }
    })
  }, [filteredRows, targetCurvePoints])

  const samplingSeriesBySystem = useMemo(() => {
    const map = new Map<number, Map<string, { weighted: number; weight: number; fallback: number; fallbackCount: number }>>()
    filteredRows.forEach((row) => {
      if (row.system_id == null || !row.date || typeof row.abw !== "number") return
      const systemMap = map.get(row.system_id) ?? new Map()
      const current = systemMap.get(row.date) ?? { weighted: 0, weight: 0, fallback: 0, fallbackCount: 0 }
      const sampled = row.number_of_fish_sampling ?? 0
      if (sampled > 0) {
        current.weighted += row.abw * sampled
        current.weight += sampled
      } else {
        current.fallback += row.abw
        current.fallbackCount += 1
      }
      systemMap.set(row.date, current)
      map.set(row.system_id, systemMap)
    })

    const resolved = new Map<number, Array<{ date: string; abw: number }>>()
    map.forEach((systemMap, systemId) => {
      const series = sortByDateAsc(
        Array.from(systemMap.entries()).map(([date, current]) => ({
          date,
          abw:
            current.weight > 0
              ? current.weighted / current.weight
              : current.fallbackCount > 0
                ? current.fallback / current.fallbackCount
                : null,
        })),
        (item) => item.date,
      ).filter((row) => typeof row.abw === "number") as Array<{ date: string; abw: number }>
      resolved.set(systemId, series)
    })
    return resolved
  }, [filteredRows])

  const transferPerformanceBySystem = useMemo(() => {
    const result = new Map<
      number,
      { status: "OK" | "Growth check" | "Insufficient data" | "No transfer"; transferDate: string | null; postAdg: number | null; baselineAdg: number | null }
    >()

    const scopedIds = hasSystem ? [systemId as number] : Array.from(scopedSystemIds)
    scopedIds.forEach((id) => {
      if (!Number.isFinite(id)) return
      const transfers = transferRows
        .filter((row) => row.date && (row.origin_system_id === id || row.target_system_id === id))
        .map((row) => row.date as string)
        .sort((a, b) => String(a).localeCompare(String(b)))

      if (transfers.length === 0) {
        result.set(id, { status: "No transfer", transferDate: null, postAdg: null, baselineAdg: null })
        return
      }

      const series = samplingSeriesBySystem.get(id) ?? []
      if (series.length < 2) {
        result.set(id, { status: "Insufficient data", transferDate: transfers[transfers.length - 1], postAdg: null, baselineAdg: null })
        return
      }

      const transferDate = transfers[transfers.length - 1]
      let beforeIndex = -1
      let afterIndex = -1
      series.forEach((point, idx) => {
        if (point.date <= transferDate) beforeIndex = idx
        if (afterIndex === -1 && point.date >= transferDate) afterIndex = idx
      })

      if (beforeIndex === -1 || afterIndex === -1) {
        result.set(id, { status: "Insufficient data", transferDate, postAdg: null, baselineAdg: null })
        return
      }
      if (afterIndex === beforeIndex) {
        afterIndex = Math.min(series.length - 1, beforeIndex + 1)
      }
      const before = series[beforeIndex]
      const after = series[afterIndex]
      const before2 = beforeIndex > 0 ? series[beforeIndex - 1] : null

      const postDays = safeDayDiff(before.date, after.date)
      const postAdg = postDays && postDays > 0 ? (after.abw - before.abw) / postDays : null
      const baselineDays = before2 ? safeDayDiff(before2.date, before.date) : null
      const baselineAdg =
        before2 && baselineDays && baselineDays > 0 ? (before.abw - before2.abw) / baselineDays : null

      if (postAdg == null || baselineAdg == null) {
        result.set(id, { status: "Insufficient data", transferDate, postAdg, baselineAdg })
        return
      }

      const status = postAdg < baselineAdg * 0.7 ? "Growth check" : "OK"
      result.set(id, { status, transferDate, postAdg, baselineAdg })
    })

    return result
  }, [hasSystem, samplingSeriesBySystem, scopedSystemIds, systemId, transferRows])

  const growthRows = useMemo(() => {
    const bySystem = new Map<number, Map<string, { sampled: number; totalWeight: number; weightedAbw: number; abwWeight: number; fallbackAbw: number; fallbackCount: number; batchId: number | null }>>()
    filteredRows.forEach((row) => {
      if (!row.date || row.system_id == null) return
      const systemId = row.system_id
      const systemDates = bySystem.get(systemId) ?? new Map()
      const current =
        systemDates.get(row.date) ?? {
          sampled: 0,
          totalWeight: 0,
          weightedAbw: 0,
          abwWeight: 0,
          fallbackAbw: 0,
          fallbackCount: 0,
          batchId: null,
        }
      const sampled = row.number_of_fish_sampling ?? 0
      current.sampled += sampled
      current.totalWeight += row.total_weight_sampling ?? 0
      if (typeof row.abw === "number") {
        if (sampled > 0) {
          current.weightedAbw += row.abw * sampled
          current.abwWeight += sampled
        } else {
          current.fallbackAbw += row.abw
          current.fallbackCount += 1
        }
      }
      if (current.batchId == null && row.batch_id != null) {
        current.batchId = row.batch_id
      }
      systemDates.set(row.date, current)
      bySystem.set(systemId, systemDates)
    })

    const rows = Array.from(bySystem.entries()).map(([systemId, dateMap]) => {
      const entries = sortByDateAsc(
        Array.from(dateMap.entries()).map(([date, current]) => ({
          date,
          abw:
            current.abwWeight > 0
              ? current.weightedAbw / current.abwWeight
              : current.fallbackCount > 0
                ? current.fallbackAbw / current.fallbackCount
                : null,
          fishSampled: current.sampled,
          totalWeight: current.totalWeight,
          batchId: current.batchId,
        })),
        (item) => item.date,
      )
      const latest = entries[entries.length - 1]
      const prev = entries.length > 1 ? entries[entries.length - 2] : null
      let dailyGain: number | null = null
      if (prev && latest?.abw != null && prev.abw != null) {
        const prevDate = new Date(`${prev.date}T00:00:00`)
        const latestDate = new Date(`${latest.date}T00:00:00`)
        const days = Math.max(1, Math.round((latestDate.getTime() - prevDate.getTime()) / 86_400_000))
        dailyGain = (latest.abw - prev.abw) / days
      }
      const transferPerformance = transferPerformanceBySystem.get(systemId)
      return {
        systemId,
        systemName: systemNameById.get(systemId) ?? `System ${systemId}`,
        date: latest?.date ?? null,
        abw: latest?.abw ?? null,
        fishSampled: latest?.fishSampled ?? null,
        totalWeight: latest?.totalWeight ?? null,
        batchId: latest?.batchId ?? null,
        dailyGain,
        transferStatus: transferPerformance?.status ?? "No transfer",
        transferDate: transferPerformance?.transferDate ?? null,
        postTransferAdg: transferPerformance?.postAdg ?? null,
        baselineAdg: transferPerformance?.baselineAdg ?? null,
      }
    })

    return rows.sort((a, b) => a.systemName.localeCompare(b.systemName))
  }, [filteredRows, systemNameById, transferPerformanceBySystem])

  const latestAbw = chartRows.length > 0 ? chartRows[chartRows.length - 1]?.abw ?? null : null
  const avgAbw = chartRows.length > 0 ? chartRows.reduce((sum, row) => sum + (row.abw ?? 0), 0) / chartRows.length : null
  const avgSampleSize =
    chartRows.length > 0 ? chartRows.reduce((sum, row) => sum + (row.fishSampled ?? 0), 0) / chartRows.length : null
  const abwStdDev = useMemo(() => {
    if (chartRows.length < 2) return null
    const values = chartRows.map((row) => row.abw ?? 0)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
    return Math.sqrt(variance)
  }, [chartRows])
  const abwCv = avgAbw && abwStdDev != null && avgAbw > 0 ? (abwStdDev / avgAbw) * 100 : null

  const resolvedStage = useMemo(() => {
    if (selectedStage && selectedStage !== "all") return selectedStage
    if (hasSystem) {
      const row = dashboardRowBySystemId.get(systemId as number)
      const stageValue = row?.growth_stage ?? null
      if (stageValue === "nursing") return "nursing"
      if (stageValue === "grow_out" || stageValue === "grow out") return "grow_out"
    }
    return null
  }, [dashboardRowBySystemId, hasSystem, selectedStage, systemId])

  const targetWeightG = resolvedStage === "nursing" ? moveTargetG : harvestTargetG
  const latestTargetAbw = chartRows.length > 0 ? chartRows[chartRows.length - 1]?.targetAbw ?? null : null
  const growthEfficiency =
    latestAbw != null && latestTargetAbw != null && latestTargetAbw > 0
      ? (latestAbw / latestTargetAbw) * 100
      : null
  const efficiencyActionRequired = growthEfficiency != null && growthEfficiency < 90

  const projection = useMemo(() => {
    const points = chartRows.filter((row) => typeof row.abw === "number") as Array<{ date: string; abw: number }>
    if (points.length < 2) return null
    const last = points[points.length - 1]
    const prev = points[points.length - 2]
    const days = safeDayDiff(prev.date, last.date)
    if (!days || days <= 0) return null
    if (last.abw <= 0 || prev.abw <= 0) return null
    const sgr = ((Math.log(last.abw) - Math.log(prev.abw)) / days) * 100
    if (!Number.isFinite(sgr) || sgr <= 0) return null
    const target = targetWeightG
    if (!Number.isFinite(target) || target <= 0) return null
    const remaining =
      Math.log(target) - Math.log(last.abw)
    if (!Number.isFinite(remaining)) return null
    const daysToTarget = remaining <= 0 ? 0 : remaining / (sgr / 100)
    if (!Number.isFinite(daysToTarget)) return null
    const roundedDays = Math.max(0, Math.ceil(daysToTarget))
    const projectedDate = new Date(`${last.date}T00:00:00`)
    if (Number.isNaN(projectedDate.getTime())) return null
    projectedDate.setDate(projectedDate.getDate() + roundedDays)
    return {
      lastDate: last.date,
      projectedDate,
      daysToTarget: roundedDays,
      sgr,
      targetWeight: target,
      lowConfidence: roundedDays > 365,
    }
  }, [chartRows, targetWeightG])

  const chartDisplayRows = useMemo(() => {
    if (chartRows.length === 0) return []
    const rows = chartRows.map((row) => ({
      ...row,
      projectionAbw: null as number | null,
    }))
    if (projection && projection.daysToTarget > 0) {
      rows[rows.length - 1] = {
        ...rows[rows.length - 1],
        projectionAbw: rows[rows.length - 1].abw ?? null,
      }
      const projectedDateString = projection.projectedDate.toISOString().split("T")[0]
      const daySinceStart = safeDayDiff(chartRows[0].date, projectedDateString) ?? 0
      rows.push({
        date: projectedDateString,
        abw: null,
        fishSampled: 0,
        totalWeight: 0,
        targetAbw: resolveTargetAbw(daySinceStart, targetCurvePoints),
        projectionAbw: projection.targetWeight,
        label: formatDayLabel(projectedDateString),
      })
    }
    return rows
  }, [chartRows, projection, targetCurvePoints])

  const projectionLabel = resolvedStage === "nursing" ? "Estimated Move Date" : "Estimated Harvest Date"

  const selectedSystemRow = hasSystem ? dashboardRowBySystemId.get(systemId as number) ?? null : null
  const currentFish = selectedSystemRow?.fish_end ?? null
  const abwForCapacity = latestAbw ?? selectedSystemRow?.abw ?? null
  const volumeM3 = hasSystem ? volumeBySystemId.get(systemId as number) ?? null : null
  const abwKg = abwForCapacity != null && abwForCapacity > 0 ? abwForCapacity / 1000 : null
  const targetBiomassKg =
    volumeM3 != null && Number.isFinite(volumeM3) ? volumeM3 * targetDensityKgM3 : null
  const maxFish =
    targetBiomassKg != null && abwKg != null && abwKg > 0 ? targetBiomassKg / abwKg : null
  const utilization =
    currentFish != null && maxFish != null && maxFish > 0 ? currentFish / maxFish : null
  const utilizationLabel =
    utilization == null
      ? "N/A"
      : `${Math.round(utilization * 100)}%`
  const utilizationTone =
    utilization == null ? "bg-muted/20 text-muted-foreground" : utilization >= 1 ? "bg-chart-4/15 text-chart-4" : utilization >= 0.9 ? "bg-chart-3/20 text-chart-3" : "bg-chart-2/15 text-chart-2"
  const utilizationBadge =
    utilization == null ? "Unknown" : utilization >= 1 ? "Grade now" : utilization >= 0.9 ? "Grade soon" : "OK"



  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-lg border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">Sampling & Growth</h1>
              <p className="text-muted-foreground mt-1">ABW trends, growth projection, and planning readiness</p>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs">
              <DataUpdatedAt updatedAt={latestUpdatedAt} />
              <DataFetchingBadge isFetching={samplingQuery.isFetching || systemsTableQuery.isFetching} isLoading={loading} />
            </div>
          </div>
        </div>

        {errorMessages.length > 0 ? (
          <DataErrorState
            title="Unable to load sampling data"
            description={errorMessages[0]}
            onRetry={() => {
              samplingQuery.refetch()
              transferQuery.refetch()
              systemsQuery.refetch()
              batchSystemsQuery.refetch()
              systemsTableQuery.refetch()
              systemVolumesQuery.refetch()
              appConfigQuery.refetch()
            }}
          />
        ) : null}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Growth KPIs</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Total Samples</p>
              <p className="text-2xl font-bold mt-1">{filteredRows.length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Latest ABW</p>
              <p className="text-2xl font-bold mt-1">{latestAbw != null ? `${latestAbw.toFixed(1)} g` : "N/A"}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">ABW Trend Volatility (CV over time)</p>
              <p className="text-2xl font-bold mt-1">{abwCv != null ? `${abwCv.toFixed(1)}%` : "N/A"}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Avg Sample Size</p>
              <p className="text-2xl font-bold mt-1">{avgSampleSize != null ? avgSampleSize.toFixed(0) : "N/A"}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Growth Efficiency</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold">
                  {growthEfficiency != null ? `${growthEfficiency.toFixed(0)}%` : "N/A"}
                </p>
                {efficiencyActionRequired ? (
                  <Badge variant="destructive" className="animate-pulse">Action Required</Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Actual ABW vs target curve</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">{projectionLabel}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold">
                  {projection
                    ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(projection.projectedDate)
                    : "N/A"}
                </p>
                {projection?.lowConfidence ? (
                  <Badge variant="outline" className="text-chart-4 border-chart-4/40">Low confidence</Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Target {formatWithUnit(targetWeightG, 0, "g")} {resolvedStage === "nursing" ? "move" : "harvest"}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">SGR (latest)</p>
              <p className="text-2xl font-bold mt-1">
                {projection ? `${projection.sgr.toFixed(2)}%/day` : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Based on last two samples</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Capacity Planning</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Target Density</p>
              <p className="text-2xl font-bold mt-1">{formatWithUnit(targetDensityKgM3, 1, "kg/m3")}</p>
              <p className="text-xs text-muted-foreground mt-1">Capacity planning baseline</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Max Fish @ Current ABW</p>
              <p className="text-2xl font-bold mt-1">{maxFish != null ? Math.round(maxFish).toLocaleString() : "N/A"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {abwForCapacity != null ? `ABW ${formatWithUnit(abwForCapacity, 1, "g")}` : "Select a system to compute capacity"}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Utilization</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold">{utilizationLabel}</p>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${utilizationTone}`}>{utilizationBadge}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentFish != null ? `${currentFish.toLocaleString()} fish in system` : "No fish count available"}
              </p>
            </div>
          </div>
        </div>

        {hasSystem && volumeM3 != null && abwForCapacity != null ? (
          <div className="text-xs text-muted-foreground">
            Capacity example for {systemNameById.get(systemId as number) ?? `System ${systemId}`} ({volumeM3} m3): target biomass{" "}
            {targetBiomassKg != null ? `${targetBiomassKg.toFixed(0)} kg` : "--"} at {formatWithUnit(abwForCapacity, 1, "g")} &gt; max{" "}
            {maxFish != null ? `${Math.round(maxFish).toLocaleString()} fish` : "--"}.
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Select a system with volume data to compute density capacity and utilization.
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          Example: 125 m3 at 15 kg/m3 &gt; target biomass 1,875 kg; at 10 g ABW &gt; max 187,500 fish.
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">ABW Trend & Transfer Events</h2>
          <p className="text-sm text-muted-foreground mb-4">
            ABW from `fish_sampling_weight` with target overlay, transfer event markers, and projection to the next milestone.
            {projection
              ? ` ${projectionLabel}: ${new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(
                  projection.projectedDate,
                )} (${projection.daysToTarget} days).`
              : ""}
          </p>
          {loading ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">Loading chart...</div>
          ) : chartDisplayRows.length > 0 ? (
            <div className="h-[320px] rounded-md border border-border/80 bg-muted/20 p-2">
              <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartDisplayRows}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                  <XAxis dataKey="date" tickFormatter={formatDayLabel} />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(_, payload) => formatFullDate(String(payload?.[0]?.payload?.date ?? ""))}
                    formatter={(value, name) => [
                      `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} g`,
                      String(name),
                    ]}
                  />
                  <Legend />
                  <ReferenceLine y={10} stroke="hsl(var(--border))" strokeDasharray="2 4" label="10g" />
                  <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="2 4" label="50g" />
                  {transferMarkers.map((marker, index) => {
                    const direction =
                      marker.inbound > 0 && marker.outbound > 0
                        ? "mixed"
                        : marker.inbound > 0
                          ? "in"
                          : "out"
                    const stroke =
                      direction === "in"
                        ? "hsl(var(--chart-2))"
                        : direction === "out"
                          ? "hsl(var(--chart-4))"
                          : "hsl(var(--chart-3))"
                    const label =
                      index === 0
                        ? direction === "in"
                          ? "Transfer In"
                          : direction === "out"
                            ? "Transfer Out"
                            : "Transfer"
                        : undefined
                    return (
                      <ReferenceLine
                        key={`${marker.date}-${index}`}
                        x={marker.date}
                        stroke={stroke}
                        strokeDasharray="3 3"
                        label={label}
                      />
                    )
                  })}
                  <Line type="monotone" dataKey="abw" stroke="hsl(var(--chart-1))" strokeWidth={2.5} name="Observed ABW (g)" />
                  <Line type="monotone" dataKey="targetAbw" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" name="Target ABW (g)" dot={false} />
                  <Line type="monotone" dataKey="projectionAbw" stroke="hsl(var(--chart-4))" strokeDasharray="4 4" name="Projection" dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </LazyRender>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">No sampling data available</div>
          )}
        </div>

        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Sampling Growth Analysis</CardTitle>
                <CardDescription>Latest sampling snapshot per system, including daily gain and post-transfer performance.</CardDescription>
              </div>
              <DataFetchingBadge isFetching={samplingQuery.isFetching || systemsTableQuery.isFetching} isLoading={loading} />
            </div>
            <DataUpdatedAt updatedAt={latestUpdatedAt} />
          </CardHeader>
          <CardContent className="pt-4">
            {!tableEnabled ? (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                Select a stage, batch, or system to view growth analysis.
              </div>
            ) : loading ? (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground">
                Loading growth analysis...
              </div>
            ) : growthRows.length ? (
              <div className="max-h-[480px] overflow-auto rounded-md border border-border/80">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wide">Date</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide">System</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide">Batch</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-right">ABW</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-right">Fish Sampled</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-right">Total Weight</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-right">Daily Gain</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-right">Post-Transfer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {growthRows.map((row) => (
                      <TableRow key={`${row.systemId}-${row.date ?? "latest"}`}>
                        <TableCell className="font-medium">{row.date ?? "--"}</TableCell>
                        <TableCell>{row.systemName}</TableCell>
                        <TableCell>{row.batchId ?? "-"}</TableCell>
                        <TableCell className="text-right">{formatWithUnit(row.abw, 1, "g")}</TableCell>
                        <TableCell className="text-right">{row.fishSampled ?? "--"}</TableCell>
                        <TableCell className="text-right">{formatWithUnit(row.totalWeight, 1, "kg")}</TableCell>
                        <TableCell className="text-right">{formatWithUnit(row.dailyGain, 2, "g/day")}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              row.transferStatus === "Growth check"
                                ? "text-chart-4 font-semibold"
                                : row.transferStatus === "OK"
                                  ? "text-chart-2 font-semibold"
                                  : "text-muted-foreground"
                            }
                          >
                            {row.transferStatus}
                          </span>
                          {row.transferDate ? (
                            <span className="block text-[11px] text-muted-foreground">{row.transferDate}</span>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No sampling records matched the current filters.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

