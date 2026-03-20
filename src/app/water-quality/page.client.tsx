"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { WaterQualityPageFilters, WaterQualityPageInitialData } from "@/features/water-quality/types"
import DashboardLayout from "@/components/layout/dashboard-layout"
import SystemHistorySheet from "@/components/systems/system-history-sheet"
import { TimelineIntegrityNote } from "@/components/shared/timeline-integrity-note"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import {
  useAlertThresholds,
  useLatestWaterQualityStatus,
  useWaterQualitySyncStatus,
  useWaterQualityOverlay,
  useWaterQualityMeasurements,
  useDailyWaterQualityRating,
} from "@/lib/hooks/use-water-quality"
import { useRecentActivities } from "@/lib/hooks/use-dashboard"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import {
  getResultRows,
  parameterLabels,
  type WqParameter,
} from "./_lib/water-quality-utils"
import {
  buildAlertItems,
  buildAggregatedReadings,
  buildAlgalActivity,
  buildAllSystemsWqi,
  buildCurrentAlerts,
  buildDailyDoVariation,
  buildDailyParameterByDate,
  buildDailyRiskTrend,
  buildDailyTempAverage,
  buildDepthProfiles,
  buildEmergingRisks,
  buildLatestReadingsBySystem,
  buildLastMeasurementBySystemId,
  buildMeasurementEvents,
  buildNutrientLoad,
  buildOperatorByRecordId,
  buildOverlayByDate,
  buildParameterTrendData,
  buildRatingTrendBySystemId,
  buildSensorCounts,
  buildSensorStatusBySystem,
  buildSystemLabelById,
  buildSystemOptions,
  buildSystemRiskRows,
  calculateWqi,
  getAverageWqi,
  getDepthProfileData,
  getSelectedReadings,
  getTemperatureStats,
  getWqiLabel,
  resolveDepthProfileDate,
  selectThresholdRow,
  type DepthProfileRow,
} from "./_lib/water-quality-selectors"
import { WaterQualityAlertsTab } from "./water-quality-alerts-tab"
import { WaterQualityDepthTab } from "./water-quality-depth-tab"
import { WaterQualityEnvironmentTab } from "./water-quality-environment-tab"
import { WaterQualityOverviewTab } from "./water-quality-overview-tab"
import { WaterQualityParameterTab } from "./water-quality-parameter-tab"
import { WaterQualitySensorsTab } from "./water-quality-sensors-tab"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  buildWaterQualityTabQuery,
  CHART_TABS,
  resolveWaterQualityTab,
  WATER_QUALITY_TABS,
} from "./_lib/water-quality-page"

export default function WaterQualityPage({
  initialFarmId,
  initialFilters,
  initialData,
}: {
  initialFarmId?: string | null
  initialFilters?: WaterQualityPageFilters
  initialData?: WaterQualityPageInitialData
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const {
    farmId,
    selectedBatch,
    selectedSystem,
    setSelectedSystem,
    selectedStage,
    dateFrom,
    dateTo,
    boundsReady,
  } = useAnalyticsPageBootstrap({
    initialFarmId,
    defaultTimePeriod: "month",
    initialFilters,
    initialBounds: initialData?.bounds,
  })
  const selectedSystemValue = selectedSystem
  const isAllSystemsSelected = selectedSystem === "all"
  const [selectedParameter, setSelectedParameter] = useState<WqParameter>("dissolved_oxygen")
  const [showFeedingOverlay, setShowFeedingOverlay] = useState(true)
  const [showMortalityOverlay, setShowMortalityOverlay] = useState(true)
  const [depthProfileDate, setDepthProfileDate] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(() => initialFilters?.activeTab ?? "overview")
  const [selectedHistorySystemId, setSelectedHistorySystemId] = useState<number | null>(null)
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
    initialSystemsData: initialData?.systemOptions,
    initialBatchSystemsData: initialData?.batchSystems,
  })

  const syncStatusQuery = useWaterQualitySyncStatus({ farmId, initialData: initialData?.syncStatus })
  const latestStatusQuery = useLatestWaterQualityStatus(selectedSystemId, {
    farmId,
    initialData: initialData?.latestStatus,
  })
  const ratingsQuery = useDailyWaterQualityRating({
    farmId,
    systemId: selectedSystemId,
    dateFrom,
    dateTo,
    requireSystem: false,
    limit: chartLimit,
    enabled: boundsReady,
    initialData: initialData?.ratings,
  })
  const measurementsQuery = useWaterQualityMeasurements({
    farmId,
    systemId: selectedSystemId,
    dateFrom,
    dateTo,
    requireSystem: false,
    limit: chartLimit,
    enabled: boundsReady,
    initialData: initialData?.measurements,
  })
  const overlayQuery = useWaterQualityOverlay({
    farmId,
    systemId: selectedSystemId,
    dateFrom,
    dateTo,
    requireSystem: false,
    enabled: boundsReady,
    initialData: initialData?.overlay,
  })
  const activitiesQuery = useRecentActivities({
    tableName: "water_quality_measurement",
    dateFrom: dateFrom ? `${dateFrom}T00:00:00` : undefined,
    dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
    limit: 1500,
    enabled: boundsReady,
    initialData: initialData?.activities,
  })
  const thresholdsQuery = useAlertThresholds({ farmId, initialData: initialData?.thresholds })
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
  const latestStatusRows = useMemo(
    () =>
      getResultRows(latestStatusQuery.data).filter(
        (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
      ),
    [latestStatusQuery.data, scopedSystemIds],
  )
  const ratingRows = useMemo(
    () =>
      getResultRows(ratingsQuery.data).filter(
        (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
      ),
    [ratingsQuery.data, scopedSystemIds],
  )
  const thresholdRow = useMemo(() => selectThresholdRow(getResultRows(thresholdsQuery.data)), [thresholdsQuery.data])
  const lowDoThreshold = thresholdRow?.low_do_threshold ?? 4
  const highAmmoniaThreshold = thresholdRow?.high_ammonia_threshold ?? 0.5

  const systemLabelById = useMemo(() => buildSystemLabelById(systemsRows), [systemsRows])
  const systemOptions = useMemo(() => buildSystemOptions(systemsRows), [systemsRows])
  const ratingTrendBySystemId = useMemo(() => buildRatingTrendBySystemId(ratingRows), [ratingRows])
  const operatorByRecordId = useMemo(
    () => buildOperatorByRecordId(getResultRows(activitiesQuery.data)),
    [activitiesQuery.data],
  )
  const latestReadingsBySystem = useMemo(
    () => buildLatestReadingsBySystem(scopedMeasurementRows),
    [scopedMeasurementRows],
  )
  const measurementEvents = useMemo(
    () => buildMeasurementEvents(scopedMeasurementRows, systemLabelById, operatorByRecordId),
    [operatorByRecordId, scopedMeasurementRows, systemLabelById],
  )
  const lastMeasurementBySystemId = useMemo(
    () => buildLastMeasurementBySystemId(measurementEvents),
    [measurementEvents],
  )
  const sensorStatusBySystem = useMemo(
    () => buildSensorStatusBySystem(systemOptions, lastMeasurementBySystemId),
    [lastMeasurementBySystemId, systemOptions],
  )
  const sensorCounts = useMemo(() => buildSensorCounts(sensorStatusBySystem), [sensorStatusBySystem])
  const aggregatedReadings = useMemo(
    () => buildAggregatedReadings(latestReadingsBySystem),
    [latestReadingsBySystem],
  )
  const selectedReadings = useMemo(
    () => getSelectedReadings(selectedSystemId, latestReadingsBySystem, aggregatedReadings),
    [aggregatedReadings, latestReadingsBySystem, selectedSystemId],
  )
  const temperatureStats = useMemo(() => getTemperatureStats(scopedMeasurementRows), [scopedMeasurementRows])
  const wqiValue = useMemo(
    () =>
      calculateWqi(
        selectedReadings.dissolved_oxygen ?? null,
        selectedReadings.temperature ?? null,
        lowDoThreshold,
        temperatureStats.mean,
        temperatureStats.std,
      ),
    [lowDoThreshold, selectedReadings, temperatureStats.mean, temperatureStats.std],
  )
  const wqiLabel = useMemo(() => getWqiLabel(wqiValue), [wqiValue])
  const nutrientLoad = useMemo(() => buildNutrientLoad(selectedReadings), [selectedReadings])
  const algalActivity = useMemo(() => buildAlgalActivity(selectedReadings), [selectedReadings])
  const allSystemsWqi = useMemo(
    () => buildAllSystemsWqi(systemOptions, latestReadingsBySystem, lowDoThreshold, temperatureStats),
    [latestReadingsBySystem, lowDoThreshold, systemOptions, temperatureStats],
  )
  const averageWqi = useMemo(() => getAverageWqi(allSystemsWqi), [allSystemsWqi])
  const averageWqiLabel = useMemo(() => getWqiLabel(averageWqi), [averageWqi])
  const systemRiskRows = useMemo(
    () => buildSystemRiskRows(latestStatusRows, ratingTrendBySystemId, systemLabelById, lastMeasurementBySystemId),
    [lastMeasurementBySystemId, latestStatusRows, ratingTrendBySystemId, systemLabelById],
  )
  const criticalRiskRows = useMemo(
    () =>
      systemRiskRows.filter((row) => {
        const rating = String(row.rating ?? "").toLowerCase()
        return rating === "critical" || rating === "lethal" || row.thresholdBreached
      }),
    [systemRiskRows],
  )
  const alertItems = useMemo(() => buildAlertItems(criticalRiskRows), [criticalRiskRows])
  const highAlertCount = useMemo(
    () => alertItems.filter((alert) => alert.priority === "high").length,
    [alertItems],
  )
  const overlayByDate = useMemo(
    () => buildOverlayByDate(getResultRows(overlayQuery.data), scopedSystemIds),
    [overlayQuery.data, scopedSystemIds],
  )
  const dailyRiskTrend = useMemo(() => buildDailyRiskTrend(ratingRows, overlayByDate), [overlayByDate, ratingRows])
  const parameterTrendData = useMemo(
    () => buildParameterTrendData(scopedMeasurementRows, selectedParameter, overlayByDate),
    [overlayByDate, scopedMeasurementRows, selectedParameter],
  )
  const dailyDoVariation = useMemo(() => buildDailyDoVariation(scopedMeasurementRows), [scopedMeasurementRows])
  const dailyTempAverage = useMemo(() => buildDailyTempAverage(scopedMeasurementRows), [scopedMeasurementRows])
  const depthProfileScopeIds = selectedSystemId != null ? [selectedSystemId] : []
  const depthProfiles = useMemo(
    () => buildDepthProfiles(scopedMeasurementRows, depthProfileScopeIds),
    [depthProfileScopeIds, scopedMeasurementRows],
  )
  const selectedDepthProfileDate = useMemo(
    () => resolveDepthProfileDate(depthProfiles, depthProfileDate),
    [depthProfileDate, depthProfiles],
  )
  const depthProfileData = useMemo(
    () => getDepthProfileData(depthProfiles, selectedDepthProfileDate),
    [depthProfiles, selectedDepthProfileDate],
  )

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
    setActiveTab(resolveWaterQualityTab(tab))
  }, [searchParams])

  const handleTabChange = (value: string) => {
    if (!WATER_QUALITY_TABS.has(value)) return
    setActiveTab(value as WaterQualityPageFilters["activeTab"])
    const query = buildWaterQualityTabQuery(new URLSearchParams(searchParams.toString()), value)
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
    if (selectedParameter === "dissolved_oxygen" || selectedParameter === "ammonia") return "mg/L"
    if (selectedParameter === "temperature") return "deg C"
    if (selectedParameter === "pH") return "pH"
    return ""
  }, [selectedParameter])

  const dailyParameterByDate = useMemo(
    () => buildDailyParameterByDate(scopedMeasurementRows),
    [scopedMeasurementRows],
  )
  const currentAlerts = useMemo(() => buildCurrentAlerts(latestStatusRows), [latestStatusRows])
  const emergingRisks = useMemo(
    () => buildEmergingRisks(dailyParameterByDate, dailyRiskTrend),
    [dailyParameterByDate, dailyRiskTrend],
  )

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
  return (
    <DashboardLayout>
      <div className={`space-y-6 ${activeTab === "depth" || activeTab === "parameter" ? "-mt-6 md:-mt-8" : ""}`}>
        <TimelineIntegrityNote
          systemId={selectedSystemId ?? undefined}
          dateFrom={dateFrom ?? null}
          dateTo={dateTo ?? null}
        />

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
          <WaterQualityOverviewTab
            averageWqi={averageWqi}
            averageWqiLabel={averageWqiLabel}
            alertItems={alertItems}
            highAlertCount={highAlertCount}
            sensorOnlineCount={sensorCounts.online}
            systemCount={systemOptions.length}
            systemRiskRows={systemRiskRows}
            onChangeTab={handleTabChange}
            onSelectSystem={setSelectedSystem}
            onOpenSystemHistory={setSelectedHistorySystemId}
          />
        )}

        {activeTab === "alerts" && (
          <WaterQualityAlertsTab
            criticalRiskRows={criticalRiskRows}
            currentAlerts={currentAlerts}
            emergingRisks={emergingRisks}
            lowDoThreshold={lowDoThreshold}
            highAmmoniaThreshold={highAmmoniaThreshold}
            onOpenSystemHistory={setSelectedHistorySystemId}
          />
        )}

        {activeTab === "sensors" && (
          <WaterQualitySensorsTab
            sensorCounts={sensorCounts}
            systemOptions={systemOptions}
            sensorStatusBySystem={sensorStatusBySystem}
            onOpenSystemHistory={setSelectedHistorySystemId}
          />
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
              <WaterQualityEnvironmentTab
                wqiValue={wqiValue}
                wqiLabel={wqiLabel}
                nutrientLoad={nutrientLoad}
                algalActivity={algalActivity}
                allSystemsWqi={allSystemsWqi}
                selectedSystemValue={selectedSystemValue}
                onSelectSystem={setSelectedSystem}
                onOpenSystemHistory={setSelectedHistorySystemId}
              />
            </TabsContent>

            <TabsContent value="depth">
              <WaterQualityDepthTab
                selectedDepthProfileDate={selectedDepthProfileDate}
                onSelectDepthProfileDate={setDepthProfileDate}
                depthDates={depthProfiles.dates}
                isAllSystemsSelected={isAllSystemsSelected}
                depthProfileData={depthProfileData}
                depthProfileDoData={depthProfileDoData}
                depthProfileTempData={depthProfileTempData}
                isStratified={isStratified}
                hasGradient={hasGradient}
                surfaceDo={surfaceDo}
                bottomDo={bottomDo}
                doGradient={doGradient}
                tempGradient={tempGradient}
              />
            </TabsContent>

            <TabsContent value="parameter">
              <WaterQualityParameterTab
                latestUpdatedAt={latestUpdatedAt}
                isFetching={measurementsQuery.isFetching || ratingsQuery.isFetching}
                isLoading={loading}
                dataIssues={dataIssues}
                parameterTrendData={parameterTrendData}
                selectedParameter={selectedParameter}
                selectedParameterUnit={selectedParameterUnit}
                lowDoThreshold={lowDoThreshold}
                highAmmoniaThreshold={highAmmoniaThreshold}
                showFeedingOverlay={showFeedingOverlay}
                showMortalityOverlay={showMortalityOverlay}
                dailyDoVariation={dailyDoVariation}
                dailyTempAverage={dailyTempAverage}
              />
            </TabsContent>

          </Tabs>
        </div>
        )}

      </div>
      <SystemHistorySheet
        open={selectedHistorySystemId !== null}
        onOpenChange={(open) => !open && setSelectedHistorySystemId(null)}
        farmId={farmId}
        systemId={selectedHistorySystemId}
        systemLabel={selectedHistorySystemId != null ? (systemLabelById.get(selectedHistorySystemId) ?? null) : null}
        dateFrom={dateFrom ?? undefined}
        dateTo={dateTo ?? undefined}
      />
    </DashboardLayout>
  )
}



