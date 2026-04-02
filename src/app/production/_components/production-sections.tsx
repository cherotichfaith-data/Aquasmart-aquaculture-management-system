"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import ProductionMetricFilter from "@/components/production/metrics-filter"
import ProductionChart from "@/components/production/production-chart"
import ProductionTable from "@/components/production/production-table"

export function ProductionSections({
  systemId,
  startDate,
  endDate,
  formattedChartRows,
  metricFilter,
  inventoryEnabled,
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
  systemId?: number
  startDate: string | null
  endDate: string | null
  formattedChartRows: any[]
  metricFilter: any
  inventoryEnabled: boolean
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <ProductionMetricFilter />
        </div>
      </div>

      <div className="space-y-3">
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
    </div>
  )
}
