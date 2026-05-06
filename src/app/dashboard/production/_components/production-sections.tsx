"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/app-ui/button"
import ProductionMetricFilter from "@/components/production/metrics-filter"
import ProductionChart from "@/components/production/production-chart"
import ProductionSummaryMetrics from "@/components/production/production-summary-metrics"
import ProductionTable from "@/components/production/production-table"
import CycleBenchmarks from "@/components/production/cycle-benchmarks"
import { SectionHeading } from "@/components/shared/section-heading"
import { toDashboardPath } from "@/lib/app-entry"
import type { Enums } from "@/lib/types/database"
import type { TimePeriod } from "@/lib/time-period"

export function ProductionSections({
  farmId,
  systemId,
  selectedBatch,
  selectedSystem,
  selectedStage,
  timePeriod,
  dateFrom,
  dateTo,
  scopedSystemIds,
  formattedChartRows,
  metricFilter,
  chartLoading,
  chartFetching,
  chartUpdatedAt,
  chartError,
  onRetryChart,
  tableRows,
  tableLoading,
  tableFetching,
  tableUpdatedAt,
  summaryError,
  onRetryTable,
}: {
  farmId?: string | null
  systemId?: number
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | Enums<"system_growth_stage">
  timePeriod: TimePeriod
  dateFrom?: string
  dateTo?: string
  scopedSystemIds?: number[] | null
  formattedChartRows: any[]
  metricFilter: any
  chartLoading: boolean
  chartFetching: boolean
  chartUpdatedAt: number
  chartError: string | null
  onRetryChart: () => void
  tableRows: any[]
  tableLoading: boolean
  tableFetching: boolean
  tableUpdatedAt: number
  summaryError: string | null
  onRetryTable: () => void
}) {
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
          rows={tableRows}
          isLoading={tableLoading}
          isFetching={tableFetching}
          updatedAt={tableUpdatedAt}
          error={summaryError}
          onRetry={onRetryTable}
          linkCards={false}
        />
      </div>

      <div className="space-y-3">
        <div className="flex justify-end">
          <ProductionMetricFilter />
        </div>
        <ProductionChart
          metric={metricFilter}
          rows={formattedChartRows}
          isLoading={chartLoading}
          isFetching={chartFetching}
          updatedAt={chartUpdatedAt}
          error={chartError}
          onRetry={onRetryChart}
        />
        <ProductionTable
          rows={tableRows}
          isLoading={tableLoading}
          isFetching={tableFetching}
          updatedAt={tableUpdatedAt}
          error={summaryError}
          onRetry={onRetryTable}
        />
      </div>

      <div className="space-y-4">
        <SectionHeading
          title="Cycle Benchmarks"
          description="Current production cycle performance vs your historical best for FCR, daily growth, and survival."
        />
        <CycleBenchmarks farmId={farmId} systemId={systemId} />
      </div>
    </div>
  )
}

