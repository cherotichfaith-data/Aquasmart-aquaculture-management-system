"use client"

import { useMemo, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import SystemHistorySheet from "@/components/systems/system-history-sheet"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useSamplingData } from "@/lib/hooks/use-reports"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { diffDateDays, formatBucketLabel, formatGranularityLabel, getBucketGranularity, getBucketKey } from "@/lib/time-series"
import { sortByDateAsc } from "@/lib/utils"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { DataErrorState } from "@/components/shared/data-states"
import { useSystemsTable } from "@/lib/hooks/use-dashboard"
import { useAppConfig, useSystemVolumes } from "@/lib/hooks/use-options"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import { getSemanticBadgeClass } from "@/lib/theme/semantic-colors"
import {
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
    boundsScope: "production",
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
  const productionSummaryQuery = useProductionSummary({
    farmId,
    systemId: hasSystem ? (systemId as number) : undefined,
    stage: selectedStage === "all" ? undefined : selectedStage,
    dateFrom,
    dateTo,
    limit: 5000,
    enabled: hasBounds,
  })

  const rows = samplingQuery.data?.status === "success" ? samplingQuery.data.data : []
  const loading =
    samplingQuery.isLoading ||
    productionSummaryQuery.isLoading ||
    systemsQuery.isLoading ||
    batchSystemsQuery.isLoading ||
    systemsTableQuery.isLoading ||
    systemVolumesQuery.isLoading
  const errorMessages = [
    getErrorMessage(samplingQuery.error),
    getErrorMessage(productionSummaryQuery.error),
    getQueryResultError(samplingQuery.data),
    getQueryResultError(productionSummaryQuery.data),
    getErrorMessage(systemsQuery.error),
    getQueryResultError(systemsQuery.data),
    getErrorMessage(batchSystemsQuery.error),
    getQueryResultError(batchSystemsQuery.data),
    getErrorMessage(systemsTableQuery.error),
    getErrorMessage(systemVolumesQuery.error),
    getErrorMessage(appConfigQuery.error),
  ].filter(Boolean) as string[]
  const filteredRows = useMemo(
    () => rows.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [rows, scopedSystemIds],
  )
  const productionRowsRaw =
    productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []
  const productionRows = useMemo(
    () => productionRowsRaw.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [productionRowsRaw, scopedSystemIds],
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
  const targetDensityKgM3 =
    Number.isFinite(targetDensity) && targetDensity > 0 ? targetDensity : DEFAULT_TARGET_DENSITY
  const harvestTargetValue = Number(configMap.get("target_harvest_weight_g") ?? "")
  const harvestTargetG = Number.isFinite(harvestTargetValue) && harvestTargetValue > 0 ? harvestTargetValue : null
  const moveTargetValue = Number(configMap.get("target_move_weight_g") ?? "")
  const moveTargetG = Number.isFinite(moveTargetValue) && moveTargetValue > 0 ? moveTargetValue : null
  const curveOverride = configMap.get("growth_curve_points")
  const targetCurvePoints = useMemo(() => {
    if (!curveOverride) return null
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
      return null
    }
    return null
  }, [curveOverride])
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
      const targetAbw = targetCurvePoints ? resolveTargetAbw(daySinceStart, targetCurvePoints) : null
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

  const harvestBySystem = useMemo(() => {
    const map = new Map<number, number>()
    productionRows.forEach((row) => {
      if (row.system_id == null) return
      map.set(row.system_id, (map.get(row.system_id) ?? 0) + (row.total_weight_harvested ?? 0))
    })
    return map
  }, [productionRows])

  const growthSystemRows = useMemo(() => {
    return scopedSystemIdList
      .map((currentSystemId) => {
        const series = samplingSeriesBySystem.get(currentSystemId) ?? []
        const first = series[0] ?? null
        const last = series[series.length - 1] ?? null
        const overallDays = first && last ? diffDateDays(first.date, last.date) : null
        const overallSgr =
          first &&
          last &&
          overallDays != null &&
          overallDays > 0 &&
          first.abw > 0 &&
          last.abw > 0
            ? ((Math.log(last.abw) - Math.log(first.abw)) / overallDays) * 100
            : null
        const dashboardRow = dashboardRowBySystemId.get(currentSystemId) ?? null
        return {
          systemId: currentSystemId,
          label:
            systemNameById.get(currentSystemId) ??
            dashboardRow?.system_name ??
            `System ${currentSystemId}`,
          samples: series.length,
          latestAbw: last?.abw ?? dashboardRow?.abw ?? null,
          currentBiomass: dashboardRow?.biomass_end ?? null,
          overallSgr,
          totalHarvestKg: harvestBySystem.get(currentSystemId) ?? 0,
        }
      })
      .filter(
        (row) =>
          row.samples > 0 ||
          row.latestAbw != null ||
          row.currentBiomass != null ||
          row.totalHarvestKg > 0,
      )
  }, [dashboardRowBySystemId, harvestBySystem, samplingSeriesBySystem, scopedSystemIdList, systemNameById])

  const bestGrowthSystem = useMemo(() => {
    return (
      growthSystemRows
        .filter((row) => row.samples > 0 && row.latestAbw != null)
        .sort((left, right) => right.samples - left.samples || (right.latestAbw ?? 0) - (left.latestAbw ?? 0))[0] ??
      null
    )
  }, [growthSystemRows])

  const bestGrowthTrajectory = useMemo(() => {
    if (!bestGrowthSystem) return []
    return (samplingSeriesBySystem.get(bestGrowthSystem.systemId) ?? []).map((row) => ({
      date: row.date,
      label: formatDayLabel(row.date),
      abw: row.abw,
    }))
  }, [bestGrowthSystem, samplingSeriesBySystem])

  const currentAbwRows = useMemo(
    () =>
      growthSystemRows
        .filter((row) => row.latestAbw != null)
        .sort((left, right) => (right.latestAbw ?? 0) - (left.latestAbw ?? 0))
        .map((row) => ({ systemId: row.systemId, label: row.label, abw: row.latestAbw ?? 0 })),
    [growthSystemRows],
  )

  const sgrRows = useMemo(
    () =>
      growthSystemRows
        .filter((row) => row.overallSgr != null)
        .sort((left, right) => (right.overallSgr ?? 0) - (left.overallSgr ?? 0))
        .map((row) => ({ systemId: row.systemId, label: row.label, sgr: row.overallSgr ?? 0 })),
    [growthSystemRows],
  )

  const harvestGranularity = useMemo(() => getBucketGranularity(timePeriod), [timePeriod])
  const harvestGranularityLabel = useMemo(() => formatGranularityLabel(harvestGranularity), [harvestGranularity])

  const harvestTimelineSystems = useMemo(
    () =>
      growthSystemRows
        .filter((row) => row.totalHarvestKg > 0)
        .sort((left, right) => right.totalHarvestKg - left.totalHarvestKg)
        .slice(0, 4)
        .map((row) => ({ systemId: row.systemId, label: row.label })),
    [growthSystemRows],
  )

  const harvestTimelineRows = useMemo(() => {
    if (harvestTimelineSystems.length === 0) return []

    const buckets = Array.from(
      new Set(
        productionRows
          .map((row) => getBucketKey(row.date, harvestGranularity))
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort()

    const bySystemBucket = new Map<string, number>()
    productionRows.forEach((row) => {
      if (row.system_id == null) return
      const key = getBucketKey(row.date, harvestGranularity)
      if (!key) return
      bySystemBucket.set(
        `${row.system_id}:${key}`,
        (bySystemBucket.get(`${row.system_id}:${key}`) ?? 0) + (row.total_weight_harvested ?? 0),
      )
    })

    const cumulative = new Map<number, number>()
    return buckets.map((bucket) => {
      const current: Record<string, string | number> = {
        bucket,
        label: formatBucketLabel(bucket, harvestGranularity),
      }
      harvestTimelineSystems.forEach((row) => {
        const bucketHarvest = bySystemBucket.get(`${row.systemId}:${bucket}`) ?? 0
        const nextValue = (cumulative.get(row.systemId) ?? 0) + bucketHarvest
        cumulative.set(row.systemId, nextValue)
        current[`system_${row.systemId}`] = nextValue
      })
      return current
    })
  }, [harvestGranularity, harvestTimelineSystems, productionRows])

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
    if (targetWeightG == null || !Number.isFinite(targetWeightG) || targetWeightG <= 0) return null
    const last = points[points.length - 1]
    const prev = points[points.length - 2]
    const days = safeDayDiff(prev.date, last.date)
    if (!days || days <= 0) return null
    if (last.abw <= 0 || prev.abw <= 0) return null
    const sgr = ((Math.log(last.abw) - Math.log(prev.abw)) / days) * 100
    if (!Number.isFinite(sgr) || sgr <= 0) return null
    const target = targetWeightG
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

  const projectionLabel = resolvedStage === "nursing" ? "Estimated Move Date" : "Estimated Harvest Date"

  const selectedSystemRow = hasSystem ? dashboardRowBySystemId.get(systemId as number) ?? null : null
  const currentFish = selectedSystemRow?.fish_end ?? null
  const abwForCapacity = latestAbw ?? selectedSystemRow?.abw ?? null
  const volumeM3 = hasSystem ? volumeBySystemId.get(systemId as number) ?? null : null
  const abwKg = abwForCapacity != null && abwForCapacity > 0 ? abwForCapacity / 1000 : null
  const targetBiomassKg =
    volumeM3 != null && Number.isFinite(volumeM3) && targetDensityKgM3 != null ? volumeM3 * targetDensityKgM3 : null
  const maxFish =
    targetBiomassKg != null && abwKg != null && abwKg > 0 ? targetBiomassKg / abwKg : null
  const utilization =
    currentFish != null && maxFish != null && maxFish > 0 ? currentFish / maxFish : null
  const utilizationLabel =
    utilization == null
      ? "N/A"
      : `${Math.round(utilization * 100)}%`
  const utilizationTone =
    utilization == null
      ? "bg-muted/20 text-muted-foreground"
      : utilization >= 1
        ? getSemanticBadgeClass("bad")
        : utilization >= 0.9
          ? getSemanticBadgeClass("warn")
          : getSemanticBadgeClass("good")
  const utilizationBadge =
    utilization == null ? "Unknown" : utilization >= 1 ? "Grade now" : utilization >= 0.9 ? "Grade soon" : "OK"



  return (
    <DashboardLayout>
      <div className="space-y-6">
        {errorMessages.length > 0 ? (
          <DataErrorState
            title="Unable to load sampling data"
            description={errorMessages[0]}
            onRetry={() => {
              samplingQuery.refetch()
              productionSummaryQuery.refetch()
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
          bestGrowthSystem={bestGrowthSystem}
          bestGrowthTrajectory={bestGrowthTrajectory}
          currentAbwRows={currentAbwRows}
          sgrRows={sgrRows}
          harvestTimelineRows={harvestTimelineRows}
          harvestTimelineSystems={harvestTimelineSystems}
          harvestGranularityLabel={harvestGranularityLabel}
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

