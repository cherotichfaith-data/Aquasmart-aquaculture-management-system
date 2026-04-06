"use client"

import { useMemo, useState } from "react"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { sortByDateAsc } from "@/lib/utils"
import type { Database, Enums } from "@/lib/types/database"
import { AnalyticsSection } from "@/components/shared/analytics-section"
import { getCombinedQueryMessages } from "@/lib/utils/query-result"
import { computeEfcrFromProductionRows } from "@/features/dashboard/analytics-shared"
import {
  BenchmarkStatusSection,
  PerformanceRecordsSection,
  PerformanceSummaryCards,
  PerformanceTrendSection,
  SystemBiomassComparisonSection,
} from "./performance-report-sections"

type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]

const selectLatestRowsPerCycle = (rows: ProductionSummaryRow[]) => {
  const byCycle = new Map<string, ProductionSummaryRow>()

  rows.forEach((row) => {
    const cycleKey = `${row.cycle_id ?? "no-cycle"}-${row.system_id ?? "no-system"}`
    const current = byCycle.get(cycleKey)
    if (!current || String(row.date ?? "") > String(current.date ?? "")) {
      byCycle.set(cycleKey, row)
    }
  })

  return Array.from(byCycle.values()).sort((left, right) => String(right.date ?? "").localeCompare(String(left.date ?? "")))
}

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
  const chartLimit = 5000
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
  const latestCycleRows = useMemo(() => selectLatestRowsPerCycle(rows), [rows])
  const latestCycleTableRows = useMemo(() => selectLatestRowsPerCycle(tableRows), [tableRows])
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
    const byDate = new Map<string, { totalBiomass: number; efcrRows: typeof rows }>()
    rows.forEach((row) => {
      if (!row.date) return
      const current = byDate.get(row.date) ?? { totalBiomass: 0, efcrRows: [] }
      current.totalBiomass += row.total_biomass ?? 0
      current.efcrRows.push(row)
      byDate.set(row.date, current)
    })

    return sortByDateAsc(
      Array.from(byDate.entries()).map(([date, current]) => ({
        date,
        efcr_period: computeEfcrFromProductionRows(current.efcrRows),
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
    if (!latestCycleRows.length) return null
    const totals = latestCycleRows.reduce(
      (acc, row) => {
        acc.totalBiomass += row.total_biomass ?? 0
        acc.totalFeed += row.total_feed_amount_period ?? 0
        acc.totalFish += row.number_of_fish_inventory ?? 0
        acc.totalMortality += row.daily_mortality_count ?? 0
        acc.totalHarvestKg += row.total_weight_harvested_aggregated ?? 0
        acc.totalHarvestFish += row.number_of_fish_harvested ?? 0
        acc.totalStockedFish += row.number_of_fish_stocked ?? 0
        acc.totalCumulativeMortality += row.cumulative_mortality ?? 0
        acc.totalTransferOutFish += row.number_of_fish_transfer_out ?? 0
        if (typeof row.efcr_aggregated === "number") {
          const weight = row.biomass_increase_aggregated ?? 0
          if (weight > 0) {
            acc.efcrWeighted += row.efcr_aggregated * weight
            acc.efcrWeight += weight
          } else {
            acc.efcrFallback += row.efcr_aggregated
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
        totalHarvestKg: 0,
        totalHarvestFish: 0,
        totalStockedFish: 0,
        totalCumulativeMortality: 0,
        totalTransferOutFish: 0,
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
        ? totals.totalFeed / totals.totalBiomass
        : null
    const mortalityRate =
      totals.totalFish > 0 ? totals.totalMortality / totals.totalFish : null
    const survivalRatePct =
      totals.totalStockedFish > 0
        ? ((totals.totalStockedFish - totals.totalCumulativeMortality - totals.totalTransferOutFish) / totals.totalStockedFish) * 100
        : null

    return {
      efcr_aggregated_consolidated: efcr,
      feeding_rate: feedingRate,
      average_biomass: totals.totalBiomass,
      mortality_rate: mortalityRate,
      survival_rate_pct: survivalRatePct,
      total_harvest_kg: totals.totalHarvestKg,
      total_harvest_fish: totals.totalHarvestFish,
    }
  }, [latestCycleRows])
  const efcrAppTarget = 1.5
  const efcrIndustryBenchmark = 2
  const mortalityBenchmark = 0.0002

  const benchmarkCards = useMemo(() => {
    if (!summary) return []
    return [
      {
        metric: "eFCR (App target)",
        actual: summary.efcr_aggregated_consolidated,
        benchmark: efcrAppTarget,
        status: typeof summary.efcr_aggregated_consolidated === "number" && summary.efcr_aggregated_consolidated <= efcrAppTarget ? "On target" : "Needs attention",
        tone:
          typeof summary.efcr_aggregated_consolidated === "number" && summary.efcr_aggregated_consolidated <= efcrAppTarget
            ? "good"
            : "warn",
      },
      {
        metric: "eFCR (Industry ceiling)",
        actual: summary.efcr_aggregated_consolidated,
        benchmark: efcrIndustryBenchmark,
        status:
          typeof summary.efcr_aggregated_consolidated === "number" && summary.efcr_aggregated_consolidated < efcrIndustryBenchmark
            ? "Within range"
            : "Above ceiling",
        tone:
          typeof summary.efcr_aggregated_consolidated === "number" && summary.efcr_aggregated_consolidated < efcrIndustryBenchmark
            ? "good"
            : "warn",
      },
      {
        metric: "Daily Mortality Rate",
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
        rows={latestCycleRows}
        tableRows={latestCycleTableRows}
        tableLimitValue={tableLimitValue}
        tableLoading={tableLoading}
      />
    </AnalyticsSection>
  )
}
