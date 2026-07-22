"use client"

import { useMemo, useState } from "react"
import { useProductionSummary } from "@/features/production/hooks"
import { useScopedGrowthTrend } from "@/features/reports/hooks"
import { useAppConfig, useSystemOptions } from "@/lib/hooks/use-options"
import type { Enums } from "@/lib/types/database"
import { AnalyticsSection } from "@/components/shared/analytics-section"
import { getCombinedQueryMessages } from "@/lib/utils/query-result"
import {
  GrowthAbwSection,
  GrowthBiomassSection,
  GrowthRecordsSection,
  GrowthSummaryCards,
} from "./growth-report-sections"
import { buildGrowthAbwChartRows, buildGrowthChartRows, projectDaysToHarvest } from "./report-selectors"

export default function GrowthReport({
  farmId,
  dateRange,
  systemId,
  stage,
  farmName,
}: {
  farmId?: string | null
  dateRange?: { from: string; to: string; days?: number | null }
  systemId?: number
  stage?: "all" | Enums<"system_growth_stage">
  farmName?: string | null
}) {
  const boundsReady = Boolean(dateRange?.from && dateRange?.to)
  const [showGrowthRecords, setShowGrowthRecords] = useState(false)

  const productionSummaryQuery = useProductionSummary({
    systemId,
    stage: stage && stage !== "all" ? stage : undefined,
    limit: 5000,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    farmId: farmId ?? null,
    enabled: boundsReady,
  })
  const systemsQuery = useSystemOptions({
    farmId: farmId ?? null,
    stage: stage ?? "all",
    activeOnly: false,
    enabled: boundsReady,
  })
  const appConfigQuery = useAppConfig({
    keys: ["target_harvest_weight_g"],
    enabled: boundsReady,
  })

  const scopedSystemIds = useMemo(() => {
    if (systemId != null) return [systemId]
    if (systemsQuery.data?.status !== "success") return []
    return systemsQuery.data.data.map((row) => row.id).filter((id): id is number => typeof id === "number")
  }, [systemId, systemsQuery.data])

  const growthTrendQuery = useScopedGrowthTrend({
    systemIds: scopedSystemIds,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    days: dateRange?.days ?? undefined,
    enabled: boundsReady && scopedSystemIds.length > 0,
  })

  const loading =
    productionSummaryQuery.isLoading ||
    systemsQuery.isLoading ||
    growthTrendQuery.isLoading ||
    appConfigQuery.isLoading
  const errorMessages = getCombinedQueryMessages(
    { error: productionSummaryQuery.error, result: productionSummaryQuery.data },
    { error: systemsQuery.error, result: systemsQuery.data },
    { error: growthTrendQuery.error, result: growthTrendQuery.data },
    { error: appConfigQuery.error, result: appConfigQuery.data },
  )
  const latestUpdatedAt = Math.max(
    productionSummaryQuery.dataUpdatedAt ?? 0,
    systemsQuery.dataUpdatedAt ?? 0,
    growthTrendQuery.dataUpdatedAt ?? 0,
    appConfigQuery.dataUpdatedAt ?? 0,
  )

  const chartRows = useMemo(
    () => buildGrowthChartRows(productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []),
    [productionSummaryQuery.data],
  )
  const abwChartRows = useMemo(
    () => buildGrowthAbwChartRows(productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []),
    [productionSummaryQuery.data],
  )

  const latest = useMemo(() => {
    const latestOverall = chartRows[chartRows.length - 1] ?? null
    const latestAbw = abwChartRows[abwChartRows.length - 1]?.average_body_weight ?? null
    if (!latestOverall && latestAbw == null) return null
    return {
      ...(latestOverall ?? {
        date: null,
        biomass_increase_period: null,
        total_biomass: null,
        total_feed_amount_period: null,
      }),
      average_body_weight: latestAbw,
    }
  }, [abwChartRows, chartRows])

  const systemNameById = useMemo(() => {
    const map = new Map<number, string>()
    if (systemsQuery.data?.status === "success") {
      systemsQuery.data.data.forEach((row) => {
        if (row.id == null) return
        map.set(row.id, row.label ?? `Cage ${row.id}`)
      })
    }
    return map
  }, [systemsQuery.data])

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

  const targetHarvestWeightValue = Number(configMap.get("target_harvest_weight_g") ?? "")
  const targetHarvestWeightG = Number.isFinite(targetHarvestWeightValue) && targetHarvestWeightValue > 0 ? targetHarvestWeightValue : null

  const growthIntervalRows = (growthTrendQuery.data?.status === "success" ? growthTrendQuery.data.data : [])
    .filter((row) => {
      if (!row.sample_date) return false
      if (dateRange?.from && row.sample_date < dateRange.from) return false
      if (dateRange?.to && row.sample_date > dateRange.to) return false
      return row.abw_g != null
    })
    .map((row) => ({
      system_id: row.system_id,
      system_name: systemNameById.get(row.system_id) ?? `Cage ${row.system_id}`,
      sample_date: row.sample_date,
      abw_g: row.abw_g!,
      weight_gain_g: row.weight_gain_g ?? null,
      days_interval: row.days_interval ?? null,
      sgr_pct_day: row.sgr_pct_day ?? null,
      adg_g_day: row.adg_g_day ?? null,
      days_to_harvest: projectDaysToHarvest(row.abw_g!, row.adg_g_day ?? 0, row.sgr_pct_day ?? 0, targetHarvestWeightG),
    }))
    .sort((left, right) => {
      if (left.sample_date === right.sample_date) return left.system_name.localeCompare(right.system_name)
      return right.sample_date.localeCompare(left.sample_date)
    })

  const latestInterval = growthIntervalRows[0] ?? null

  return (
    <AnalyticsSection
      errorTitle="Unable to load growth report"
      errorMessage={errorMessages[0]}
      onRetry={() => {
        productionSummaryQuery.refetch()
        systemsQuery.refetch()
        growthTrendQuery.refetch()
        appConfigQuery.refetch()
      }}
      updatedAt={latestUpdatedAt}
      isFetching={
        productionSummaryQuery.isFetching ||
        systemsQuery.isFetching ||
        growthTrendQuery.isFetching ||
        appConfigQuery.isFetching
      }
      isLoading={loading}
    >
      <GrowthSummaryCards latest={latest} />
      <GrowthAbwSection loading={loading} chartRows={abwChartRows} />
      <GrowthBiomassSection loading={loading} chartRows={chartRows} />
      <GrowthRecordsSection
        showGrowthRecords={showGrowthRecords}
        onToggleRecords={() => setShowGrowthRecords((prev) => !prev)}
        loading={loading}
        rows={growthIntervalRows}
        dateRange={dateRange}
        farmName={farmName}
        latestInterval={latestInterval}
        targetHarvestWeightG={targetHarvestWeightG}
      />
    </AnalyticsSection>
  )
}
