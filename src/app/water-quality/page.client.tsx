"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import DashboardLayout from "@/components/layout/dashboard-layout"
import {
  useLatestWaterQualityStatus,
  useWaterQualityMeasurements,
} from "@/features/water-quality/hooks"
import { getWaterQualityIndex } from "@/features/water-quality/queries.client"
import type { WaterQualityPageFilters } from "@/features/water-quality/types"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import {
  DEFAULT_WQ_PARAMETER,
  getResultRows,
  isWqParameter,
  type WqParameter,
} from "@/features/water-quality/lib/water-quality-utils"
import {
  buildCurrentAlerts,
  buildDepthProfiles,
  buildLastMeasurementBySystemId,
  buildMeasurementEvents,
  buildParameterTrendData,
  buildSystemLabelById,
  buildSystemOptions,
  buildSystemRiskRows,
  getAverageWqi,
  getDepthProfileData,
  getWqiLabel,
  resolveDepthProfileDate,
  type DepthProfileRow,
} from "@/features/water-quality/lib/water-quality-selectors"
import { WaterQualityAlertsTab } from "@/features/water-quality/components/water-quality-alerts-tab"
import { WaterQualityDepthTab } from "@/features/water-quality/components/water-quality-depth-tab"
import { WaterQualityEnvironmentTab } from "@/features/water-quality/components/water-quality-environment-tab"
import { WaterQualityParameterTab } from "@/features/water-quality/components/water-quality-parameter-tab"

export default function WaterQualityPage({
  initialFarmId,
  initialFarmName,
  initialFilters,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFilters?: WaterQualityPageFilters
}) {
  const searchParams = useSearchParams()
  const [requestedDepthProfileDate, setRequestedDepthProfileDate] = useState<string | null>(null)
  const selectedParameter = useMemo<WqParameter>(() => {
    const nextParameter = searchParams.get("parameter")
    if (isWqParameter(nextParameter)) return nextParameter
    return initialFilters?.selectedParameter ?? DEFAULT_WQ_PARAMETER
  }, [initialFilters?.selectedParameter, searchParams])

  const {
    farmId,
    selectedBatch,
    selectedSystem,
    selectedStage,
    dateFrom,
    dateTo,
    boundsReady,
  } = useAnalyticsPageBootstrap({
    initialFarmId,
    initialFarmName,
    defaultTimePeriod: "month",
    boundsScope: "water_quality",
    initialFilters,
  })

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

  const latestStatusQuery = useLatestWaterQualityStatus(selectedSystemId, { farmId })
  const wqiQuery = useQuery({
    queryKey: ["dashboard", "water-quality", "index", farmId, selectedSystemId ?? "all", dateFrom, dateTo],
    queryFn: ({ signal }) =>
      getWaterQualityIndex({
        farmId: farmId!,
        systemId: selectedSystemId ?? undefined,
        dateFrom,
        dateTo,
        signal,
      }),
    enabled: Boolean(farmId) && boundsReady,
    staleTime: 60_000,
  })
  const measurementsQuery = useWaterQualityMeasurements({
    farmId,
    systemId: selectedSystemId,
    dateFrom,
    dateTo,
    requireSystem: false,
    limit: 2000,
    enabled: boundsReady,
  })

  const scopedSystemIds = scopedSystemIdList
  const systemsRows = useMemo(
    () => getResultRows(systemsQuery.data).filter((system) => system.id != null),
    [systemsQuery.data],
  )
  const systemLabelById = useMemo(() => buildSystemLabelById(systemsRows), [systemsRows])
  const systemOptions = useMemo(() => buildSystemOptions(systemsRows), [systemsRows])
  const scopedMeasurementRows = useMemo(
    () =>
      getResultRows(measurementsQuery.data).filter(
        (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
      ),
    [measurementsQuery.data, scopedSystemIds],
  )
  const latestStatusRows = useMemo(
    () =>
      getResultRows(latestStatusQuery.data).filter(
        (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
      ),
    [latestStatusQuery.data, scopedSystemIds],
  )
  const wqiRows = useMemo(
    () =>
      getResultRows(wqiQuery.data).filter(
        (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
      ),
    [scopedSystemIds, wqiQuery.data],
  )

  const measurementEvents = useMemo(
    () => buildMeasurementEvents(scopedMeasurementRows, systemLabelById, new Map()),
    [scopedMeasurementRows, systemLabelById],
  )
  const lastMeasurementBySystemId = useMemo(
    () => buildLastMeasurementBySystemId(measurementEvents),
    [measurementEvents],
  )
  const allSystemsWqi = useMemo(() => {
    const wqiBySystem = new Map(wqiRows.map((row) => [row.system_id, row]))
    return systemOptions.map((system) => {
      const wqi = wqiBySystem.get(system.id)?.wqi_score ?? null
      return {
        ...system,
        wqi,
        wqiLabel: getWqiLabel(wqi),
      }
    })
  }, [systemOptions, wqiRows])
  const averageWqi = useMemo(() => getAverageWqi(allSystemsWqi), [allSystemsWqi])
  const selectedSystemWqi = selectedSystemId != null ? (wqiRows[0]?.wqi_score ?? null) : null
  const wqiValue = selectedSystemId != null ? selectedSystemWqi : averageWqi
  const wqiLabel = useMemo(() => getWqiLabel(wqiValue), [wqiValue])
  const systemRiskRows = useMemo(
    () => buildSystemRiskRows(latestStatusRows, new Map(), systemLabelById, lastMeasurementBySystemId),
    [lastMeasurementBySystemId, latestStatusRows, systemLabelById],
  )
  const alertRows = useMemo(
    () =>
      systemRiskRows.filter((row) => {
        const rating = String(row.rating ?? "").toLowerCase()
        return rating === "critical" || rating === "lethal" || row.thresholdBreached
      }),
    [systemRiskRows],
  )
  const currentAlerts = useMemo(() => buildCurrentAlerts(latestStatusRows), [latestStatusRows])
  const parameterTrendData = useMemo(
    () => buildParameterTrendData(scopedMeasurementRows, selectedParameter),
    [scopedMeasurementRows, selectedParameter],
  )
  const depthProfiles = useMemo(
    () => buildDepthProfiles(scopedMeasurementRows, selectedSystemId != null ? [selectedSystemId] : []),
    [scopedMeasurementRows, selectedSystemId],
  )
  const selectedDepthProfileDate = useMemo(
    () => resolveDepthProfileDate(depthProfiles, requestedDepthProfileDate),
    [depthProfiles, requestedDepthProfileDate],
  )
  const depthProfileData = useMemo(
    () => getDepthProfileData(depthProfiles, selectedDepthProfileDate),
    [depthProfiles, selectedDepthProfileDate],
  )

  const depthProfileDoData = useMemo(
    () => depthProfileData.filter((row): row is DepthProfileRow & { dissolvedOxygen: number } => row.dissolvedOxygen != null),
    [depthProfileData],
  )
  const depthProfileTempData = useMemo(
    () => depthProfileData.filter((row): row is DepthProfileRow & { temperature: number } => row.temperature != null),
    [depthProfileData],
  )

  const selectedParameterUnit = useMemo(() => {
    if (selectedParameter === "dissolved_oxygen" || selectedParameter === "ammonia") return "mg/L"
    if (selectedParameter === "temperature") return "deg C"
    if (selectedParameter === "pH") return "pH"
    return ""
  }, [selectedParameter])

  const dataIssues = useMemo(() => {
    const issues: string[] = []
    const checks: Array<[string, { status: string; error?: string } | undefined]> = [
      ["Latest status", latestStatusQuery.data],
      ["Water quality index", wqiQuery.data],
      ["Measurements", measurementsQuery.data],
      ["Batch systems", selectedBatch !== "all" ? batchSystemsQuery.data : undefined],
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
    batchSystemsQuery.data,
    farmId,
    latestStatusQuery.data,
    measurementsQuery.data,
    scopedSystemIds.length,
    selectedBatch,
    wqiQuery.data,
  ])

  const loading =
    measurementsQuery.isLoading ||
    systemsQuery.isLoading ||
    latestStatusQuery.isLoading ||
    wqiQuery.isLoading

  return (
    <DashboardLayout initialFarmId={initialFarmId} initialFarmName={initialFarmName}>
      <div className="space-y-6">
        <WaterQualityEnvironmentTab wqiValue={wqiValue} wqiLabel={wqiLabel} />
        <WaterQualityParameterTab
          latestUpdatedAt={Math.max(measurementsQuery.dataUpdatedAt ?? 0, wqiQuery.dataUpdatedAt ?? 0)}
          isFetching={measurementsQuery.isFetching || wqiQuery.isFetching}
          isLoading={loading}
          dataIssues={dataIssues}
          parameterTrendData={parameterTrendData}
          selectedParameter={selectedParameter}
          selectedParameterUnit={selectedParameterUnit}
        />
        <WaterQualityAlertsTab
          alertRows={alertRows}
          currentAlerts={currentAlerts}
        />
        <WaterQualityDepthTab
          selectedDepthProfileDate={selectedDepthProfileDate}
          onSelectDepthProfileDate={setRequestedDepthProfileDate}
          depthDates={depthProfiles.dates}
          isAllSystemsSelected={selectedSystemId == null}
          depthProfileData={depthProfileData}
          depthProfileDoData={depthProfileDoData}
          depthProfileTempData={depthProfileTempData}
        />
      </div>
    </DashboardLayout>
  )
}
