"use client"

import { useMemo, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import SystemHistorySheet from "@/components/systems/system-history-sheet"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useSamplingData, useTransferData } from "@/lib/hooks/use-reports"
import { sortByDateAsc } from "@/lib/utils"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { useSystemsTable } from "@/lib/hooks/use-dashboard"
import { useAppConfig, useSystemVolumes } from "@/lib/hooks/use-options"
import { TimelineIntegrityNote } from "@/components/shared/timeline-integrity-note"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import {
  DEFAULT_GROWTH_CURVE,
  DEFAULT_HARVEST_TARGET_G,
  DEFAULT_MOVE_TARGET_G,
  DEFAULT_TARGET_DENSITY,
  formatDayLabel,
  safeDayDiff,
  resolveTargetAbw,
} from "@/app/sampling/_lib/formatters"
import { SamplingGrowthDashboard } from "@/app/sampling/_components/sampling-growth-dashboard"


export default function SamplingPage() {
  const [selectedHistorySystemId, setSelectedHistorySystemId] = useState<number | null>(null)
  const {
    farmId,
    selectedBatch,
    selectedSystem,
    selectedStage,
    timePeriod,
    dateFrom,
    dateTo,
    boundsReady: hasBounds,
  } = useAnalyticsPageBootstrap({
    defaultTimePeriod: "quarter",
  })

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
              <h1 className="text-3xl font-bold">Growth</h1>
              <p className="text-muted-foreground mt-1">ABW trends, projection, and movement or harvest readiness</p>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs">
              <DataUpdatedAt updatedAt={latestUpdatedAt} />
              <DataFetchingBadge isFetching={samplingQuery.isFetching || systemsTableQuery.isFetching} isLoading={loading} />
            </div>
          </div>
        </div>

        <TimelineIntegrityNote
          systemId={hasSystem ? systemId : undefined}
          dateFrom={dateFrom ?? null}
          dateTo={dateTo ?? null}
        />

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
        <SamplingGrowthDashboard
          filteredRowCount={filteredRows.length}
          latestAbw={latestAbw}
          abwCv={abwCv}
          avgSampleSize={avgSampleSize}
          growthEfficiency={growthEfficiency}
          efficiencyActionRequired={efficiencyActionRequired}
          projectionLabel={projectionLabel}
          projection={projection}
          targetWeightG={targetWeightG}
          resolvedStage={resolvedStage}
          targetDensityKgM3={targetDensityKgM3}
          maxFish={maxFish}
          abwForCapacity={abwForCapacity}
          utilizationLabel={utilizationLabel}
          utilizationTone={utilizationTone}
          utilizationBadge={utilizationBadge}
          currentFish={currentFish}
          hasSystem={hasSystem}
          systemId={systemId}
          systemName={hasSystem ? (systemNameById.get(systemId as number) ?? `System ${systemId}`) : null}
          volumeM3={volumeM3}
          targetBiomassKg={targetBiomassKg}
          loading={loading}
          chartDisplayRows={chartDisplayRows}
          transferMarkers={transferMarkers}
          growthRows={growthRows}
          tableEnabled={tableEnabled}
          latestUpdatedAt={latestUpdatedAt}
          isFetching={samplingQuery.isFetching || systemsTableQuery.isFetching}
          onSelectHistorySystem={setSelectedHistorySystemId}
        />
        <SystemHistorySheet
          open={selectedHistorySystemId !== null}
          onOpenChange={(open) => !open && setSelectedHistorySystemId(null)}
          farmId={farmId}
          systemId={selectedHistorySystemId}
          systemLabel={selectedHistorySystemId != null ? (systemNameById.get(selectedHistorySystemId) ?? null) : null}
          dateFrom={dateFrom ?? undefined}
          dateTo={dateTo ?? undefined}
          summaryRow={selectedHistorySystemId != null ? (dashboardRowBySystemId.get(selectedHistorySystemId) ?? null) : null}
        />
      </div>
    </DashboardLayout>
  )
}

