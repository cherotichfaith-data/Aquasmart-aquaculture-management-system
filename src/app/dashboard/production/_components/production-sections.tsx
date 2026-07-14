"use client"

import { useMemo } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/app-ui/button"
import ProductionChart from "@/components/production/production-chart"
import ProductionMetricFilter from "@/components/production/metrics-filter"
import { PRODUCTION_METRICS, type ProductionMetric } from "@/components/production/metrics"
import ProductionSummaryMetrics from "@/components/production/production-summary-metrics"
import ProductionTable from "@/components/production/production-table"
import { SectionHeading } from "@/components/shared/section-heading"
import type { ProductionChartRow } from "@/components/production/production-chart"
import { toDashboardPath } from "@/lib/app-entry"
import type { SystemOption } from "@/lib/system-options"
import type { Enums } from "@/lib/types/database"
import type { TimePeriod } from "@/lib/time-period"
import type { ProductionSummaryMetricsRow } from "@/features/production/types"
import type { ProductionPeriodViewRow } from "../_lib/production-page"

export function ProductionSections({
  scopeLabel,
  selectedBatch,
  selectedSystem,
  selectedStage,
  timePeriod,
  systemOptions,
  metricFilter,
  metricRows,
  chartLoading,
  chartFetching,
  chartUpdatedAt,
  chartError,
  onRetryChart,
  summaryMetrics,
  summaryLoading,
  summaryFetching,
  summaryUpdatedAt,
  summaryError,
  onRetrySummary,
  tableRows,
  tableLoading,
  tableFetching,
  tableUpdatedAt,
  tableError,
  onRetryTable,
}: {
  scopeLabel: string
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | Enums<"system_growth_stage">
  timePeriod: TimePeriod
  systemOptions: SystemOption[]
  metricFilter: ProductionMetric
  metricRows: ProductionChartRow[]
  chartLoading: boolean
  chartFetching: boolean
  chartUpdatedAt: number
  chartError: string | null
  onRetryChart: () => void
  summaryMetrics: ProductionSummaryMetricsRow | null
  summaryLoading: boolean
  summaryFetching: boolean
  summaryUpdatedAt: number
  summaryError: string | null
  onRetrySummary: () => void
  tableRows: ProductionPeriodViewRow[]
  tableLoading: boolean
  tableFetching: boolean
  tableUpdatedAt: number
  tableError: string | null
  onRetryTable: () => void
}) {
  const currentSystemLabel = useMemo(() => {
    if (selectedSystem === "all") return "All cages"
    const match = systemOptions.find((option) => String(option.id) === selectedSystem)
    return match?.label ?? scopeLabel
  }, [scopeLabel, selectedSystem, systemOptions])

  const chartTitle = useMemo(() => {
    return PRODUCTION_METRICS[metricFilter].label
  }, [metricFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={toDashboardPath("/")}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full border border-border/70 bg-background/70 text-muted-foreground shadow-none transition-colors hover:bg-muted/35 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        <SectionHeading
          title="Production Summary Metrics"
          description="Summary totals for period-start fish, mortalities, transfer adjustments, and harvest output."
        />
        <ProductionSummaryMetrics
          stage={selectedStage}
          batch={selectedBatch}
          system={selectedSystem}
          timePeriod={timePeriod}
          summary={summaryMetrics}
          isLoading={summaryLoading}
          isFetching={summaryFetching}
          updatedAt={summaryUpdatedAt}
          error={summaryError}
          onRetry={onRetrySummary}
          linkCards={false}
        />
      </div>

      <div className="space-y-3">
        <div className="flex justify-end">
          <ProductionMetricFilter />
        </div>
        <ProductionChart
          metric={metricFilter}
          title={chartTitle}
          rows={metricRows}
          isLoading={chartLoading}
          isFetching={chartFetching}
          updatedAt={chartUpdatedAt}
          error={chartError}
          onRetry={onRetryChart}
        />

        <div className="soft-panel overflow-hidden">
          <div className="border-b border-border/60 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">{currentSystemLabel}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Period-based production records for the selected scope.
                </p>
              </div>
            </div>
          </div>
          <ProductionTable
            rows={tableRows}
            isLoading={tableLoading}
            isFetching={tableFetching}
            updatedAt={tableUpdatedAt}
            error={tableError}
            onRetry={onRetryTable}
            showHeader={false}
            standalone
          />
        </div>
      </div>
    </div>
  )
}
