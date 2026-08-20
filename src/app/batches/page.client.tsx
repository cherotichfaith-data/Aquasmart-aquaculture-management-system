"use client"

import { useMemo } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import CommandCentreBanner from "@/features/systems/components/command-centre-banner"
import BatchesKpis from "@/features/batches/components/batches-kpis"
import BatchLineageTable from "@/features/batches/components/batch-lineage-table"
import AbwGrowthByBatchChart from "@/features/batches/components/charts/abw-growth-by-batch-chart"
import MortalityByBatchChart from "@/features/batches/components/charts/mortality-by-batch-chart"
import EfcrByPeriodBatchChart from "@/features/batches/components/charts/efcr-by-period-batch-chart"
import AbwProjectionByBatchChart from "@/features/batches/components/charts/abw-projection-by-batch-chart"
import type { BatchesPageFilters, BatchesPageInitialData } from "@/features/batches/types"

export default function BatchesPageClient({
  initialFarmId,
  initialFarmName,
  initialFarmRole,
  initialFilters,
  initialData,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFarmRole?: string | null
  initialFilters: BatchesPageFilters
  initialData: BatchesPageInitialData
}) {
  const rows = useMemo(
    () => (initialData.batches.status === "success" ? initialData.batches.data : []),
    [initialData.batches],
  )
  const isError = initialData.batches.status === "error"
  const errorMessage = initialData.batches.status === "error" ? initialData.batches.error : null

  const batchLabels = useMemo(
    () =>
      Object.fromEntries(rows.map((row) => [row.batch_id, row.batch_name?.trim() || `Batch #${row.batch_id}`])),
    [rows],
  )

  return (
    <DashboardLayout
      initialFarmId={initialFarmId}
      initialFarmName={initialFarmName}
      headerDataOverrides={{ role: initialFarmRole ?? null }}
    >
      <div className="page-shell">
        <CommandCentreBanner alerts={initialData.alerts} />

        <BatchesKpis batches={rows} stockingByBatchId={initialData.stockingByBatchId} />

        <BatchLineageTable
          rows={rows}
          stockingByBatchId={initialData.stockingByBatchId}
          isError={isError}
          errorMessage={errorMessage}
          timePeriod={initialFilters.timePeriod}
          showHeader
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AbwGrowthByBatchChart
            growthSeries={initialData.growthSeries}
            systemIdToBatchId={initialData.systemIdToBatchId}
            batchLabels={batchLabels}
          />
          <MortalityByBatchChart mortalityByBatch={initialData.mortalityByBatch} batchLabels={batchLabels} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EfcrByPeriodBatchChart
            growthSeries={initialData.growthSeries}
            systemIdToBatchId={initialData.systemIdToBatchId}
            batchLabels={batchLabels}
          />
          <AbwProjectionByBatchChart
            growthSeries={initialData.growthSeries}
            systemIdToBatchId={initialData.systemIdToBatchId}
            batchLabels={batchLabels}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
