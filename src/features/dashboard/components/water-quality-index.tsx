"use client"

import { useMemo } from "react"
import type { Enums } from "@/lib/types/database"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { useAlertThresholds, useWaterQualityMeasurements } from "@/lib/hooks/use-water-quality"
import { DataErrorState } from "@/components/shared/data-states"
import { getErrorMessage } from "@/lib/utils/query-result"
import { calculateWqi, selectThresholdRow } from "@/lib/water-quality-index"
import type { WaterQualityThresholdRow } from "@/features/water-quality/types"

type MeasurementRow = {
  id?: number | null
  system_id?: number | null
  parameter_name?: string | null
  parameter_value?: number | null
  date?: string | null
  time?: string | null
}

const getRows = <T,>(result: { status: "success" | "error"; data: T[] | null } | undefined): T[] =>
  result?.status === "success" ? (result.data ?? []) : []

function getDashboardWqiStatus(value: number | null) {
  if (value == null) {
    return {
      label: "No Data",
      badgeClass: "bg-muted text-muted-foreground",
    }
  }

  if (value >= 70) {
    return {
      label: "Optimal",
      badgeClass: "bg-primary text-primary-foreground",
    }
  }

  if (value >= 50) {
    return {
      label: "Caution",
      badgeClass: "bg-warning text-warning-foreground",
    }
  }

  return {
    label: "Critical",
    badgeClass: "bg-destructive text-destructive-foreground",
  }
}

function SegmentedGauge({
  value,
  size = 230,
}: {
  value: number
  size?: number
}) {
  const strokeWidth = 22
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const gap = 8

  const segments = [
    { fraction: 0.18, color: "var(--muted-foreground)" },
    { fraction: 0.1, color: "var(--destructive)" },
    { fraction: 0.24, color: "var(--warning)" },
    { fraction: 0.28, color: "var(--primary)" },
    { fraction: 0.1, color: "var(--destructive)" },
    { fraction: 0.1, color: "var(--muted-foreground)" },
  ]

  let offset = 0
  const arcs = segments.map((segment, index) => {
    const segmentLength = circumference * segment.fraction - gap
    const arc = (
      <circle
        key={`${segment.color}-${index}`}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={segment.color}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
        strokeDasharray={`${Math.max(segmentLength, 0)} ${circumference}`}
        strokeDashoffset={-offset}
      />
    )
    offset += circumference * segment.fraction
    return arc
  })

  const status = getDashboardWqiStatus(value)

  return (
    <div className="relative mx-auto flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {arcs}
      </svg>
      <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full border border-border bg-background">
        <span className="text-[4rem] font-semibold leading-none tracking-tight text-foreground">
          {Math.round(value)}
        </span>
        <span className={`mt-3 rounded-full px-5 py-2 text-2xl font-semibold leading-none ${status.badgeClass}`}>
          {status.label}
        </span>
      </div>
    </div>
  )
}

function WaterQualityIndexSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mx-auto h-[280px] w-[280px] animate-pulse rounded-full bg-muted/40" />
    </div>
  )
}

export default function WaterQualityIndex({
  stage,
  batch,
  system,
  dateFrom,
  dateTo,
  scopedSystemIds,
  resolvedSystemId,
  farmId: initialFarmId,
}: {
  stage?: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  dateFrom?: string
  dateTo?: string
  scopedSystemIds?: number[] | null
  resolvedSystemId?: number
  farmId?: string | null
}) {
  const { farmId: activeFarmId } = useActiveFarm()
  const farmId = activeFarmId ?? initialFarmId
  const boundsReady = Boolean(dateFrom && dateTo)

  const scopedSystems = useScopedSystemIds({
    farmId,
    selectedStage: stage ?? "all",
    selectedBatch: batch ?? "all",
    selectedSystem: system ?? "all",
    enabled: scopedSystemIds == null,
  })
  const selectedSystemId = resolvedSystemId ?? scopedSystems.selectedSystemId

  const measurementsQuery = useWaterQualityMeasurements({
    farmId,
    systemId: selectedSystemId,
    dateFrom: dateFrom ?? undefined,
    dateTo: dateTo ?? undefined,
    requireSystem: false,
    limit: 2000,
    enabled: boundsReady,
  })
  const measurementRows = getRows<MeasurementRow>(measurementsQuery.data)
  const scopedSystemIdList = useMemo(() => {
    if (Array.isArray(scopedSystemIds)) return scopedSystemIds
    if (scopedSystems.scopedSystemIdList.length > 0) return scopedSystems.scopedSystemIdList

    return Array.from(
      new Set(
        measurementRows
          .map((row) => row.system_id)
          .filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
      ),
    )
  }, [measurementRows, scopedSystemIds, scopedSystems.scopedSystemIdList])

  const thresholdsQuery = useAlertThresholds({ farmId })
  const thresholdRows = useMemo(
    () => getRows<WaterQualityThresholdRow>(thresholdsQuery.data),
    [thresholdsQuery.data],
  )

  const temperatureStats = useMemo(() => {
    const scope = new Set(scopedSystemIdList)
    const filteredRows = measurementRows.filter(
      (row) => row.system_id != null && scope.has(row.system_id) && row.parameter_name === "temperature",
    )
    const values = filteredRows
      .map((row) => row.parameter_value)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))

    if (!values.length) return { mean: null, std: null }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    const variance =
      values.length > 1 ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length : 0
    return { mean, std: Math.sqrt(variance) }
  }, [measurementRows, scopedSystemIdList])

  const latestReadingsBySystem = useMemo(() => {
    const map = new Map<number, { doValue: number | null; doTs: string | null; tempValue: number | null; tempTs: string | null }>()
    const rows = measurementRows.filter(
      (row) =>
        row.system_id != null &&
        scopedSystemIdList.includes(row.system_id) &&
        (row.parameter_name === "dissolved_oxygen" || row.parameter_name === "temperature"),
    )

    rows.forEach((row) => {
      if (!row.system_id || row.parameter_value == null || !row.date) return
      const timestamp = `${row.date}T${row.time ?? "00:00"}`
      const current = map.get(row.system_id) ?? { doValue: null, doTs: null, tempValue: null, tempTs: null }
      if (row.parameter_name === "dissolved_oxygen") {
        if (!current.doTs || timestamp > current.doTs) {
          current.doTs = timestamp
          current.doValue = row.parameter_value
        }
      }
      if (row.parameter_name === "temperature") {
        if (!current.tempTs || timestamp > current.tempTs) {
          current.tempTs = timestamp
          current.tempValue = row.parameter_value
        }
      }
      map.set(row.system_id, current)
    })

    return map
  }, [measurementRows, scopedSystemIdList])

  const wqiValues = useMemo(() => {
    const values: number[] = []
    scopedSystemIdList.forEach((currentSystemId) => {
      const readings = latestReadingsBySystem.get(currentSystemId)
      if (!readings) return
      const thresholdRow = selectThresholdRow(thresholdRows, currentSystemId)
      const value = calculateWqi(
        readings.doValue ?? null,
        readings.tempValue ?? null,
        thresholdRow?.low_do_threshold ?? 5,
        temperatureStats.mean,
        temperatureStats.std,
      )
      if (value != null) values.push(value)
    })
    return values
  }, [latestReadingsBySystem, scopedSystemIdList, temperatureStats, thresholdRows])

  const wqiAverage = wqiValues.length ? wqiValues.reduce((sum, value) => sum + value, 0) / wqiValues.length : null

  const errorMessage = getErrorMessage(measurementsQuery.error)
  if (measurementsQuery.isError) {
    return (
      <DataErrorState
        title="Unable to load water quality index"
        description={errorMessage ?? "Please retry or check your connection."}
        onRetry={() => measurementsQuery.refetch()}
      />
    )
  }

  if (
    measurementsQuery.isLoading ||
    !boundsReady ||
    (scopedSystemIds == null && scopedSystems.systemsQuery.isLoading) ||
    (scopedSystemIds == null && selectedSystemId == null && scopedSystemIdList.length === 0 && measurementRows.length > 0)
  ) {
    return <WaterQualityIndexSkeleton />
  }

  if (wqiAverage == null) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
          No recent DO and temperature measurements.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <SegmentedGauge value={wqiAverage} />

      <div className="mt-4 flex items-center justify-center gap-8 text-sm font-semibold">
        <span className="inline-flex items-center gap-2 text-primary">
          <span className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent border-t-primary" />
          Good
        </span>
        <span className="inline-flex items-center gap-2 text-warning">
          <span className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent border-t-warning" />
          Caution
        </span>
        <span className="inline-flex items-center gap-2 text-destructive">
          <span className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent border-t-destructive" />
          Critical
        </span>
      </div>
    </div>
  )
}
