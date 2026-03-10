"use client"

import { useMemo } from "react"
import { Gauge } from "lucide-react"
import type { Enums } from "@/lib/types/database"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { useAlertThresholds, useWaterQualityMeasurements } from "@/lib/hooks/use-water-quality"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { getErrorMessage } from "@/lib/utils/query-result"

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
  size = 170,
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

export default function WaterQualityIndex({
  stage,
  batch,
  system,
  timePeriod,
  periodParam,
  dateFrom,
  dateTo,
}: {
  stage?: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: Enums<"time_period">
  periodParam?: string | null
  dateFrom?: string
  dateTo?: string
}) {
  const { farmId } = useActiveFarm()
  const boundsReady = Boolean(dateFrom && dateTo)

  const { selectedSystemId, scopedSystemIdList } = useScopedSystemIds({
    farmId,
    selectedStage: stage ?? "all",
    selectedBatch: batch ?? "all",
    selectedSystem: system ?? "all",
  })

  const measurementsQuery = useWaterQualityMeasurements({
    systemId: selectedSystemId,
    dateFrom: dateFrom ?? undefined,
    dateTo: dateTo ?? undefined,
    requireSystem: false,
    limit: 2000,
    enabled: boundsReady,
  })

  const thresholdsQuery = useAlertThresholds()
  const thresholdRow = useMemo(() => {
    const rows = getRows(thresholdsQuery.data)
    return rows.find((row: any) => row.scope === "farm" && row.system_id == null) ?? rows[0] ?? null
  }, [thresholdsQuery.data])
  const lowDoThreshold = thresholdRow?.low_do_threshold ?? 4

  const temperatureStats = useMemo(() => {
    const scope = new Set(scopedSystemIdList)
    const measurementRows = getRows<MeasurementRow>(measurementsQuery.data).filter(
      (row) => row.system_id != null && scope.has(row.system_id) && row.parameter_name === "temperature",
    )
    const values = measurementRows
      .map((row) => row.parameter_value)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))

    if (!values.length) return { mean: null, std: null }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    const variance =
      values.length > 1 ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length : 0
    return { mean, std: Math.sqrt(variance) }
  }, [measurementsQuery.data, scopedSystemIdList])

  const latestReadingsBySystem = useMemo(() => {
    const map = new Map<number, { doValue: number | null; doTs: string | null; tempValue: number | null; tempTs: string | null }>()
    const rows = getRows<MeasurementRow>(measurementsQuery.data).filter(
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
  }, [measurementsQuery.data, scopedSystemIdList])

  const wqiValues = useMemo(() => {
    const values: number[] = []
    scopedSystemIdList.forEach((systemId) => {
      const readings = latestReadingsBySystem.get(systemId)
      if (!readings) return
      const value = calculateWqi(
        readings.doValue ?? null,
        readings.tempValue ?? null,
        lowDoThreshold,
        temperatureStats.mean,
        temperatureStats.std,
      )
      if (value != null) values.push(value)
    })
    return values
  }, [latestReadingsBySystem, lowDoThreshold, scopedSystemIdList, temperatureStats])

  const wqiAverage = wqiValues.length ? wqiValues.reduce((sum, value) => sum + value, 0) / wqiValues.length : null
  const wqiLabel = getWqiLabel(wqiAverage)

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

  if (measurementsQuery.isLoading || !boundsReady) {
    return <div className="bg-muted/30 rounded-2xl h-[260px] animate-pulse" />
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <DataUpdatedAt updatedAt={measurementsQuery.dataUpdatedAt} />
        <DataFetchingBadge isFetching={measurementsQuery.isFetching} isLoading={measurementsQuery.isLoading} />
      </div>
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Water Quality Index</p>
            <p className="text-sm text-muted-foreground">
              {system && system !== "all" ? "Selected system" : "All scoped systems"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center">
          {wqiAverage == null ? (
            <div className="text-sm text-muted-foreground">No recent DO and temperature measurements.</div>
          ) : (
            <CircularGauge value={wqiAverage} max={100} color={wqiLabel.color} label="WQI" />
          )}
        </div>

        <div className="mt-3 text-center">
          <span className="text-sm font-semibold" style={{ color: wqiLabel.color }}>
            {wqiLabel.label}
          </span>
          <p className="text-xs text-muted-foreground mt-1">Based on latest DO and temperature readings.</p>
        </div>

        <div className="mt-4 space-y-1">
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
      </div>
    </div>
  )
}
