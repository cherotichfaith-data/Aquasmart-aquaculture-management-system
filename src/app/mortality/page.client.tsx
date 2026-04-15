"use client"

import { useMemo, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import SystemHistorySheet from "@/components/systems/system-history-sheet"
import { DataErrorState } from "@/components/shared/data-states"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useAlertLog, useMortalityEvents } from "@/lib/hooks/use-mortality"
import { useFeedingRecords, useSamplingData, useScopedSurvivalTrend } from "@/lib/hooks/use-reports"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { useWaterQualityMeasurements } from "@/lib/hooks/use-water-quality"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import {
  buildDeathsTrend,
  buildDriverItems,
  buildDriverTrend,
  buildLatestReadingsBySystem,
  buildMortalityKpis,
  buildMortalityRiskRows,
  buildSurvivalTrend,
  buildSystemNameById,
  type InvestigationStatus,
} from "./mortality-selectors"
import { useMortalityInvestigationStatus } from "./use-mortality-investigation-status"
import { MortalityDashboard } from "./_components/mortality-dashboard"

export default function MortalityPage() {
  const [selectedHistorySystemId, setSelectedHistorySystemId] = useState<number | null>(null)

  const {
    farmId,
    selectedBatch,
    selectedSystem,
    selectedStage,
    boundsReady,
    dateFrom,
    dateTo,
  } = useAnalyticsPageBootstrap({
    defaultTimePeriod: "quarter",
    boundsScope: "production",
  })

  const todayDate = dateTo ?? new Date().toISOString().slice(0, 10)
  const {
    batchId,
    scopedSystemIdList,
    scopedSystemIds,
    systemsQuery,
    batchSystemsQuery,
  } = useScopedSystemIds({
    farmId,
    selectedBatch,
    selectedSystem,
    selectedStage,
  })

  const eventsQuery = useMortalityEvents({
    farmId,
    batchId,
    dateFrom,
    dateTo,
    limit: 5000,
    enabled: boundsReady,
  })
  const alertsQuery = useAlertLog({
    farmId,
    ruleCodes: ["MASS_MORTALITY", "ELEVATED_MORTALITY"],
    limit: 200,
    enabled: boundsReady,
  })
  const survivalQuery = useScopedSurvivalTrend({
    systemIds: scopedSystemIdList,
    dateFrom,
    dateTo,
    enabled: boundsReady && scopedSystemIdList.length > 0,
  })
  const feedingQuery = useFeedingRecords({
    systemIds: scopedSystemIdList,
    batchId,
    dateFrom,
    dateTo,
    limit: 5000,
    enabled: boundsReady && scopedSystemIdList.length > 0,
  })
  const samplingQuery = useSamplingData({
    systemIds: scopedSystemIdList,
    batchId,
    dateFrom,
    dateTo,
    limit: 5000,
    enabled: boundsReady && scopedSystemIdList.length > 0,
  })
  const measurementsQuery = useWaterQualityMeasurements({
    farmId,
    dateFrom,
    dateTo,
    limit: 8000,
    enabled: boundsReady,
  })
  const investigation = useMortalityInvestigationStatus(farmId)

  const systems = systemsQuery.data?.status === "success" ? systemsQuery.data.data : []
  const eventsRaw = eventsQuery.data?.status === "success" ? eventsQuery.data.data : []
  const alertsRaw = alertsQuery.data?.status === "success" ? alertsQuery.data.data : []
  const survivalRows = survivalQuery.data?.status === "success" ? survivalQuery.data.data : []
  const feedingRows = feedingQuery.data?.status === "success" ? feedingQuery.data.data : []
  const samplingRows = samplingQuery.data?.status === "success" ? samplingQuery.data.data : []
  const measurementRowsRaw = measurementsQuery.data?.status === "success" ? measurementsQuery.data.data : []

  const events = useMemo(
    () => eventsRaw.filter((row) => scopedSystemIds.has(row.system_id)),
    [eventsRaw, scopedSystemIds],
  )
  const alerts = useMemo(
    () => alertsRaw.filter((row) => row.system_id == null || scopedSystemIds.has(row.system_id)),
    [alertsRaw, scopedSystemIds],
  )
  const measurementRows = useMemo(
    () => measurementRowsRaw.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [measurementRowsRaw, scopedSystemIds],
  )

  const systemNameById = useMemo(() => buildSystemNameById(systems), [systems])
  const latestReadingsBySystem = useMemo(() => buildLatestReadingsBySystem(measurementRows), [measurementRows])

  const riskRows = useMemo(
    () =>
      buildMortalityRiskRows({
        systems,
        events,
        alerts: alerts.filter((row) => row.system_id != null),
        survivalRows,
        measurements: measurementRows,
        samplingRows,
        feedingRows,
        todayDate,
        investigationBySystemId: investigation.statusBySystemId,
      }),
    [alerts, events, feedingRows, investigation.statusBySystemId, measurementRows, samplingRows, systems, survivalRows, todayDate],
  )

  const kpis = useMemo(() => buildMortalityKpis(riskRows, alerts), [alerts, riskRows])
  const investigationCounts = useMemo(
    () =>
      riskRows.reduce(
        (acc, row) => {
          acc[row.investigationStatus] += 1
          return acc
        },
        { open: 0, monitoring: 0, resolved: 0, escalated: 0 } as Record<InvestigationStatus, number>,
      ),
    [riskRows],
  )
  const deathsTrend = useMemo(() => buildDeathsTrend(events), [events])
  const survivalTrend = useMemo(() => buildSurvivalTrend(survivalRows), [survivalRows])
  const driverTrend = useMemo(
    () => buildDriverTrend({ events, measurements: measurementRows, feedingRows }),
    [events, feedingRows, measurementRows],
  )
  const driverItems = useMemo(() => buildDriverItems(riskRows), [riskRows])
  const latestEvent = events[0] ?? null

  const loading =
    systemsQuery.isLoading ||
    batchSystemsQuery.isLoading ||
    eventsQuery.isLoading ||
    alertsQuery.isLoading ||
    survivalQuery.isLoading ||
    feedingQuery.isLoading ||
    samplingQuery.isLoading ||
    measurementsQuery.isLoading

  const errorMessages = [
    getErrorMessage(systemsQuery.error),
    getQueryResultError(systemsQuery.data),
    getErrorMessage(batchSystemsQuery.error),
    getQueryResultError(batchSystemsQuery.data),
    getErrorMessage(eventsQuery.error),
    getQueryResultError(eventsQuery.data),
    getErrorMessage(alertsQuery.error),
    getQueryResultError(alertsQuery.data),
    getErrorMessage(survivalQuery.error),
    getQueryResultError(survivalQuery.data),
    getErrorMessage(feedingQuery.error),
    getQueryResultError(feedingQuery.data),
    getErrorMessage(samplingQuery.error),
    getQueryResultError(samplingQuery.data),
    getErrorMessage(measurementsQuery.error),
    getQueryResultError(measurementsQuery.data),
  ].filter(Boolean) as string[]

  if (errorMessages.length > 0) {
    return (
      <DashboardLayout>
        <DataErrorState
          title="Unable to load mortality page"
          description={errorMessages[0]}
          onRetry={() => {
            systemsQuery.refetch()
            batchSystemsQuery.refetch()
            eventsQuery.refetch()
            alertsQuery.refetch()
            survivalQuery.refetch()
            feedingQuery.refetch()
            samplingQuery.refetch()
            measurementsQuery.refetch()
          }}
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <MortalityDashboard
          kpis={kpis}
          loading={loading}
          riskRows={riskRows}
          alerts={alerts}
          driverItems={driverItems}
          investigationCounts={investigationCounts}
          deathsTrend={deathsTrend}
          survivalTrend={survivalTrend}
          driverTrend={driverTrend}
          latestEvent={latestEvent}
          events={events}
          latestReadingsBySystem={latestReadingsBySystem}
          systemNameById={systemNameById}
          onSelectHistorySystem={setSelectedHistorySystemId}
          onInvestigationStatusChange={investigation.setStatus}
        />

        <SystemHistorySheet
          open={selectedHistorySystemId !== null}
          onOpenChange={(open) => !open && setSelectedHistorySystemId(null)}
          farmId={farmId}
          systemId={selectedHistorySystemId}
          systemLabel={selectedHistorySystemId != null ? (systemNameById.get(selectedHistorySystemId) ?? null) : null}
          dateFrom={dateFrom ?? undefined}
          dateTo={dateTo ?? undefined}
        />
      </div>
    </DashboardLayout>
  )
}
