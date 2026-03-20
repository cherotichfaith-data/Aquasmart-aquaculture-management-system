"use client"

import { useMemo, useState } from "react"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { sortByDateAsc } from "@/lib/utils"
import type { Enums } from "@/lib/types/database"
import { AnalyticsSection } from "@/components/shared/analytics-section"
import { getCombinedQueryMessages } from "@/lib/utils/query-result"
import {
  BenchmarkStatusSection,
  PerformanceRecordsSection,
  PerformanceSummaryCards,
  PerformanceTrendSection,
  SystemBiomassComparisonSection,
} from "./performance-report-sections"

export default function PerformanceReport({
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
  const chartLimit = 2000
  const [tableLimit, setTableLimit] = useState("100")
  const [showPerformanceRecords, setShowPerformanceRecords] = useState(false)
  const boundsReady = Boolean(dateRange?.from && dateRange?.to)
  const productionSummaryQuery = useProductionSummary({
    systemId,
    stage: stage && stage !== "all" ? stage : undefined,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    farmId: farmId ?? null,
    limit: chartLimit,
    enabled: boundsReady,
  })
  const tableLimitValue = Number.isFinite(Number(tableLimit)) ? Number(tableLimit) : 100
  const performanceTableQuery = useProductionSummary({
    systemId,
    stage: stage && stage !== "all" ? stage : undefined,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    farmId: farmId ?? null,
    limit: tableLimitValue,
    enabled: boundsReady && showPerformanceRecords,
  })
  const rows = productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []
  const tableRows = performanceTableQuery.data?.status === "success" ? performanceTableQuery.data.data : []
  const loading = productionSummaryQuery.isLoading
  const tableLoading = performanceTableQuery.isLoading
  const errorMessages = getCombinedQueryMessages(
    { error: productionSummaryQuery.error, result: productionSummaryQuery.data },
    { error: performanceTableQuery.error, result: performanceTableQuery.data },
  )
  const latestUpdatedAt = Math.max(
    productionSummaryQuery.dataUpdatedAt ?? 0,
    performanceTableQuery.dataUpdatedAt ?? 0,
  )
  const chartRows = useMemo(() => {
    const byDate = new Map<string, { totalBiomass: number; weightedEfcr: number; efcrWeight: number; efcrFallback: number; efcrCount: number }>()
    rows.forEach((row) => {
      if (!row.date) return
      const current = byDate.get(row.date) ?? { totalBiomass: 0, weightedEfcr: 0, efcrWeight: 0, efcrFallback: 0, efcrCount: 0 }
      current.totalBiomass += row.total_biomass ?? 0
      if (typeof row.efcr_period === "number") {
        const weight = row.total_feed_amount_period ?? 0
        if (weight > 0) {
          current.weightedEfcr += row.efcr_period * weight
          current.efcrWeight += weight
        } else {
          current.efcrFallback += row.efcr_period
          current.efcrCount += 1
        }
      }
      byDate.set(row.date, current)
    })

    return sortByDateAsc(
      Array.from(byDate.entries()).map(([date, current]) => ({
        date,
        efcr_period:
          current.efcrWeight > 0
            ? current.weightedEfcr / current.efcrWeight
            : current.efcrCount > 0
              ? current.efcrFallback / current.efcrCount
              : null,
        total_biomass: current.totalBiomass,
      })),
      (row) => row.date,
    )
  }, [rows])
  const latestBySystemRows = useMemo(() => {
    const bySystem = new Map<number, (typeof rows)[number]>()
    rows.forEach((row) => {
      if (row.system_id == null || !row.date) return
      const current = bySystem.get(row.system_id)
      if (!current || String(row.date) > String(current.date ?? "")) {
        bySystem.set(row.system_id, row)
      }
    })
    return Array.from(bySystem.values())
  }, [rows])

  const summary = useMemo(() => {
    if (!latestBySystemRows.length) return null
    const totals = latestBySystemRows.reduce(
      (acc, row) => {
        acc.totalBiomass += row.total_biomass ?? 0
        acc.totalFeed += row.total_feed_amount_period ?? 0
        acc.totalFish += row.number_of_fish_inventory ?? 0
        acc.totalMortality += row.daily_mortality_count ?? 0
        if (typeof row.efcr_period === "number") {
          const weight = row.total_feed_amount_period ?? 0
          if (weight > 0) {
            acc.efcrWeighted += row.efcr_period * weight
            acc.efcrWeight += weight
          } else {
            acc.efcrFallback += row.efcr_period
            acc.efcrFallbackCount += 1
          }
        }
        return acc
      },
      {
        totalBiomass: 0,
        totalFeed: 0,
        totalFish: 0,
        totalMortality: 0,
        efcrWeighted: 0,
        efcrWeight: 0,
        efcrFallback: 0,
        efcrFallbackCount: 0,
      },
    )

    const efcr =
      totals.efcrWeight > 0
        ? totals.efcrWeighted / totals.efcrWeight
        : totals.efcrFallbackCount > 0
          ? totals.efcrFallback / totals.efcrFallbackCount
          : null
    const feedingRate =
      totals.totalBiomass > 0 && totals.totalFeed > 0
        ? (totals.totalFeed * 1000) / totals.totalBiomass
        : null
    const mortalityRate =
      totals.totalFish > 0 ? totals.totalMortality / totals.totalFish : null

    return {
      efcr_period_consolidated: efcr,
      feeding_rate: feedingRate,
      average_biomass: totals.totalBiomass,
      mortality_rate: mortalityRate,
    }
  }, [latestBySystemRows])
  const efcrBenchmark = 1.5
  const mortalityBenchmark = 0.02

  const benchmarkCards = useMemo(() => {
    if (!summary) return []
    return [
      {
        metric: "eFCR",
        actual: summary.efcr_period_consolidated,
        benchmark: efcrBenchmark,
        status: typeof summary.efcr_period_consolidated === "number" && summary.efcr_period_consolidated <= efcrBenchmark ? "On target" : "Needs attention",
        tone:
          typeof summary.efcr_period_consolidated === "number" && summary.efcr_period_consolidated <= efcrBenchmark
            ? "good"
            : "warn",
      },
      {
        metric: "Mortality Rate",
        actual: summary.mortality_rate,
        benchmark: mortalityBenchmark,
        status: typeof summary.mortality_rate === "number" && summary.mortality_rate <= mortalityBenchmark ? "On target" : "Needs attention",
        tone:
          typeof summary.mortality_rate === "number" && summary.mortality_rate <= mortalityBenchmark
            ? "good"
            : "warn",
      },
    ]
  }, [summary])

  return (
    <AnalyticsSection
      errorTitle="Unable to load performance report"
      errorMessage={errorMessages[0]}
      onRetry={() => {
        productionSummaryQuery.refetch()
        performanceTableQuery.refetch()
      }}
      updatedAt={latestUpdatedAt}
      isFetching={productionSummaryQuery.isFetching || performanceTableQuery.isFetching}
      isLoading={loading}
    >
      <PerformanceSummaryCards summary={summary} />
      <PerformanceTrendSection loading={loading} chartRows={chartRows} />
      <SystemBiomassComparisonSection loading={loading} latestBySystemRows={latestBySystemRows} />
      <BenchmarkStatusSection benchmarkCards={benchmarkCards} />
      <PerformanceRecordsSection
        tableLimit={tableLimit}
        onTableLimitChange={setTableLimit}
        showPerformanceRecords={showPerformanceRecords}
        onToggleRecords={() => setShowPerformanceRecords((prev) => !prev)}
        dateRange={dateRange}
        farmName={farmName}
        summary={summary}
        rows={rows}
        tableRows={tableRows}
        tableLimitValue={tableLimitValue}
        tableLoading={tableLoading}
      />
    </AnalyticsSection>
  )
}
