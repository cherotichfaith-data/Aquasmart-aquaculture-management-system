"use client"

import { useMemo, useState } from "react"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { sortByDateAsc } from "@/lib/utils"
import type { Enums } from "@/lib/types/database"
import { AnalyticsSection } from "@/components/shared/analytics-section"
import { getCombinedQueryMessages } from "@/lib/utils/query-result"
import {
  GrowthAbwSection,
  GrowthBiomassSection,
  GrowthRecordsSection,
  GrowthSummaryCards,
} from "./growth-report-sections"

export default function GrowthReport({
  dateRange,
  systemId,
  stage,
  farmName,
}: {
  dateRange?: { from: string; to: string }
  systemId?: number
  stage?: "all" | Enums<"system_growth_stage">
  farmName?: string | null
}) {
  const { farmId } = useActiveFarm()
  const boundsReady = Boolean(dateRange?.from && dateRange?.to)
  const productionSummaryQuery = useProductionSummary({
    systemId,
    stage: stage && stage !== "all" ? stage : undefined,
    limit: 100,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    farmId: farmId ?? null,
    enabled: boundsReady,
  })
  const rows = productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []
  const loading = productionSummaryQuery.isLoading
  const errorMessages = getCombinedQueryMessages({
    error: productionSummaryQuery.error,
    result: productionSummaryQuery.data,
  })
  const latestUpdatedAt = productionSummaryQuery.dataUpdatedAt ?? 0
  const [showGrowthRecords, setShowGrowthRecords] = useState(false)

  const chartRows = useMemo(() => {
    const byDate = new Map<
      string,
      {
        totalBiomass: number
        totalFeed: number
        totalBiomassIncrease: number
        weightedAbw: number
        abwWeight: number
        fallbackAbw: number
        fallbackAbwCount: number
      }
    >()
    rows.forEach((row) => {
      if (!row.date) return
      const current = byDate.get(row.date) ?? {
        totalBiomass: 0,
        totalFeed: 0,
        totalBiomassIncrease: 0,
        weightedAbw: 0,
        abwWeight: 0,
        fallbackAbw: 0,
        fallbackAbwCount: 0,
      }
      current.totalBiomass += row.total_biomass ?? 0
      current.totalFeed += row.total_feed_amount_period ?? 0
      current.totalBiomassIncrease += row.biomass_increase_period ?? 0
      if (typeof row.average_body_weight === "number") {
        const weight = row.number_of_fish_inventory ?? 0
        if (weight > 0) {
          current.weightedAbw += row.average_body_weight * weight
          current.abwWeight += weight
        } else {
          current.fallbackAbw += row.average_body_weight
          current.fallbackAbwCount += 1
        }
      }
      byDate.set(row.date, current)
    })

    return sortByDateAsc(
      Array.from(byDate.entries()).map(([date, current]) => ({
        date,
        average_body_weight:
          current.abwWeight > 0
            ? current.weightedAbw / current.abwWeight
            : current.fallbackAbwCount > 0
              ? current.fallbackAbw / current.fallbackAbwCount
              : null,
        biomass_increase_period: current.totalBiomassIncrease,
        total_biomass: current.totalBiomass,
        total_feed_amount_period: current.totalFeed,
      })),
      (row) => row.date,
    )
  }, [rows])
  const latest = chartRows[chartRows.length - 1]

  return (
    <AnalyticsSection
      errorTitle="Unable to load growth report"
      errorMessage={errorMessages[0]}
      onRetry={() => productionSummaryQuery.refetch()}
      updatedAt={latestUpdatedAt}
      isFetching={productionSummaryQuery.isFetching}
      isLoading={loading}
    >
      <GrowthSummaryCards latest={latest} />
      <GrowthAbwSection loading={loading} chartRows={chartRows} />
      <GrowthBiomassSection loading={loading} chartRows={chartRows} />
      <GrowthRecordsSection
        showGrowthRecords={showGrowthRecords}
        onToggleRecords={() => setShowGrowthRecords((prev) => !prev)}
        loading={loading}
        rows={rows}
        dateRange={dateRange}
        farmName={farmName}
        latest={latest}
      />
    </AnalyticsSection>
  )
}
