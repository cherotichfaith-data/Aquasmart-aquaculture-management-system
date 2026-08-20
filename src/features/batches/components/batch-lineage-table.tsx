"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/app-ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { DataTable } from "@/components/shared/data-table"
import { DataErrorState } from "@/components/shared/data-states"
import type { BatchStockingInfo, DashboardBatchRpcRow } from "@/features/batches/types"
import { formatDateOnly, formatNumberValue, formatUnitValue } from "@/lib/analytics-format"
import { formatGrowthStage } from "@/lib/stage-filter"
import { toTimePeriodUrlValue, type TimePeriod } from "@/lib/time-period"
import { isFiniteNumber } from "@/features/dashboard/lib/table-cells"
import { buildBatchLineageColumns } from "./batch-lineage-table-columns"

interface BatchLineageTableProps {
  rows: DashboardBatchRpcRow[]
  stockingByBatchId: Record<number, BatchStockingInfo>
  isError?: boolean
  errorMessage?: string | null
  onRetry?: () => void
  timePeriod?: TimePeriod
  showHeader?: boolean
}

const formatPercent = (value: number | null | undefined, decimals = 2) =>
  isFiniteNumber(value) ? `${formatNumberValue(value, { decimals, minimumDecimals: decimals })}%` : "--"

export default function BatchLineageTable({
  rows,
  stockingByBatchId,
  isError = false,
  errorMessage,
  onRetry,
  timePeriod = "all history",
  showHeader = true,
}: BatchLineageTableProps) {
  const router = useRouter()
  const columns = useMemo(
    () => buildBatchLineageColumns({ timePeriod, stockingByBatchId }),
    [timePeriod, stockingByBatchId],
  )

  const openProductionPage = (batchId: number) => {
    const params = new URLSearchParams()
    params.set("batch", String(batchId))
    if (timePeriod) params.set("date", toTimePeriodUrlValue(timePeriod))
    router.push(`/production?${params.toString()}`)
  }

  if (isError) {
    return (
      <DataErrorState
        title="Unable to load batches"
        description={errorMessage ?? "Please retry or check your connection."}
        onRetry={onRetry}
      />
    )
  }

  return (
    <Card className="production-records-card rounded-2xl">
      {showHeader ? (
        <CardHeader className="pb-1">
          <CardTitle>Batch Lineage & Status</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="pt-2">
        <DataTable<DashboardBatchRpcRow>
          columns={columns}
          data={rows}
          rowKey={(row) => row.batch_id}
          onRowClick={(row) => openProductionPage(row.batch_id)}
          emptyMessage="No batches found."
          initialSorting={[{ id: "batch", desc: false }]}
          shellClassName="production-records-table max-h-[560px]"
          tableClassName="min-w-[1320px] table-fixed"
          headerVariant="plain"
          renderMobileCard={(row) => <BatchCardBody row={row} stockingByBatchId={stockingByBatchId} />}
        />
      </CardContent>
    </Card>
  )
}

function BatchCardBody({
  row,
  stockingByBatchId,
}: {
  row: DashboardBatchRpcRow
  stockingByBatchId: Record<number, BatchStockingInfo>
}) {
  const title = row.batch_name?.trim() || `Batch #${row.batch_id}`
  const stocking = stockingByBatchId[row.batch_id]
  const stockedCount = stocking?.numberOfFish
  const survivalRate =
    isFiniteNumber(stockedCount) && stockedCount > 0 && isFiniteNumber(row.fish_end)
      ? (row.fish_end / stockedCount) * 100
      : null

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold leading-5 text-foreground">{title}</p>
        <Badge variant="secondary">{formatGrowthStage(row.growth_stage)}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {stocking?.supplierName ?? "Unknown source"} · {formatDateOnly(stocking?.dateOfDelivery, "no stock date")}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <MobileMetric label="Qty Stocked" value={formatNumberValue(stocking?.numberOfFish)} />
        <MobileMetric label="Live Count" value={formatNumberValue(row.fish_end)} />
        <MobileMetric label="ABW at Stock" value={formatUnitValue(stocking?.abw ?? null, 2, "g")} />
        <MobileMetric label="Current ABW" value={formatUnitValue(row.abw, 1, "g")} />
        <MobileMetric label="eFCR" value={formatNumberValue(row.efcr, { decimals: 2 })} />
        <MobileMetric label="Survival Rate" value={formatPercent(survivalRate, 1)} />
        <MobileMetric label="Mortality" value={formatPercent(row.mortality_rate)} />
      </div>
    </>
  )
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/45 px-2.5 py-2">
      <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold text-foreground">{value}</p>
    </div>
  )
}
