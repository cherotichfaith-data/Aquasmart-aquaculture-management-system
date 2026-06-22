"use client"

import { useMemo } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/app-ui/button"
import ProductionChart from "@/components/production/production-chart"
import ProductionEfcrChart from "@/components/production/production-efcr-chart"
import ProductionMetricFilter from "@/components/production/metrics-filter"
import ProductionSummaryMetrics from "@/components/production/production-summary-metrics"
import type { ProductionMetric } from "@/components/production/metrics"
import ProductionTable from "@/components/production/production-table"
import { SectionHeading } from "@/components/shared/section-heading"
import type { ProductionChartRow } from "@/components/production/production-chart"
import { toDashboardPath } from "@/lib/app-entry"
import type { SystemOption } from "@/lib/system-options"
import type { Enums } from "@/lib/types/database"
import type { TimePeriod } from "@/lib/time-period"
import type { ProductionSummaryMetricsRow } from "@/features/production/types"
import type { ProductionEfcrChartRow, ProductionPeriodViewRow } from "../_lib/production-page"

export function ProductionSections({
  scopeLabel,
  selectedBatch,
  selectedSystem,
  selectedStage,
  timePeriod,
  systemOptions,
  metricFilter,
  efcrRows,
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
  efcrRows: ProductionEfcrChartRow[]
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
    if (metricFilter === "efcr") return "eFCR periodic"
    return buildMetricChartTitle(metricFilter)
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
          description="Summary totals for stocked fish, mortalities, transfer adjustments, and harvest output."
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
        {metricFilter === "efcr" ? (
          <ProductionEfcrChart
            title={chartTitle}
            rows={efcrRows}
            isLoading={chartLoading}
            error={chartError}
            onRetry={onRetryChart}
          />
        ) : (
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
        )}

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

function buildMetricChartTitle(metric: ProductionMetric) {
  switch (metric) {
    case "abw":
      return "Average Body Weight"
    case "biomass":
      return "Biomass"
    case "mortality":
      return "Mortality"
    case "feeding_rate":
      return "Feeding rate"
    case "biomass_density":
      return "Biomass density"
    case "sgr":
      return "SGR"
    case "efcr":
      return "eFCR periodic"
  }
}
