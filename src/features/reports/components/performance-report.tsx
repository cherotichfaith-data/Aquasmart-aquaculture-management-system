"use client"

import { useMemo, useState } from "react"
import { useProductionSummary } from "@/features/production/hooks"
import { usePerformanceRecords, usePerformanceSummary } from "@/features/reports/hooks"
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

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

export default function PerformanceReport({
  farmId,
  dateRange,
  systemId,
  stage,
  farmName,
}: {
  farmId?: string | null
  dateRange?: { from: string; to: string }
  systemId?: number
  stage?: "all" | Enums<"system_growth_stage">
  farmName?: string | null
}) {
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
  const performanceTableQuery = usePerformanceRecords({
    systemId,
    stage: stage && stage !== "all" ? stage : undefined,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    farmId: farmId ?? null,
    limit: tableLimitValue,
    enabled: boundsReady && showPerformanceRecords,
  })
  const performanceSummaryQuery = usePerformanceSummary({
    farmId: farmId ?? null,
    systemId,
    stage,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    enabled: boundsReady,
  })
  const rows = useMemo(
    () => (productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []),
    [productionSummaryQuery.data],
  )
  const tableRows = performanceTableQuery.data?.status === "success" ? performanceTableQuery.data.data : []
  const summary = performanceSummaryQuery.data?.status === "success" ? performanceSummaryQuery.data.data[0] ?? null : null
  const loading = productionSummaryQuery.isLoading || performanceSummaryQuery.isLoading
  const tableLoading = performanceTableQuery.isLoading
  const errorMessages = getCombinedQueryMessages(
    { error: productionSummaryQuery.error, result: productionSummaryQuery.data },
    { error: performanceSummaryQuery.error, result: performanceSummaryQuery.data },
    { error: performanceTableQuery.error, result: performanceTableQuery.data },
  )
  const latestUpdatedAt = Math.max(
    productionSummaryQuery.dataUpdatedAt ?? 0,
    performanceSummaryQuery.dataUpdatedAt ?? 0,
    performanceTableQuery.dataUpdatedAt ?? 0,
  )
  const chartRows = useMemo(() => {
    const byDate = new Map<string, { totalBiomass: number; efcrPeriod: number | null }>()
    rows.forEach((row) => {
      if (!row.date) return
      const current = byDate.get(row.date) ?? { totalBiomass: 0, efcrPeriod: null }
      current.totalBiomass += row.total_biomass ?? 0
      if (isFiniteNumber(row.efcr_period)) {
        current.efcrPeriod = row.efcr_period
      }
      byDate.set(row.date, current)
    })

    return sortByDateAsc(
      Array.from(byDate.entries()).map(([date, current]) => ({
        date,
        efcr_period: current.efcrPeriod,
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
        performanceSummaryQuery.refetch()
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
        rows={tableRows}
        tableRows={tableRows}
        tableLimitValue={tableLimitValue}
        tableLoading={tableLoading}
      />
    </AnalyticsSection>
  )
}
