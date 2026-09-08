"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/app-ui/badge"
import type { BatchStockingInfo, DashboardBatchRpcRow } from "@/features/batches/types"
import { formatDateOnly, formatNumberValue } from "@/lib/analytics-format"
import { formatGrowthStage } from "@/lib/stage-filter"
import { NoData, isFiniteNumber } from "@/features/dashboard/lib/table-cells"

/** "KIPILI FARM" -> "Kipili", "KIMBWELA HATCHERY" -> "Kimbwela". */
export function shortSourceName(name: string | null | undefined): string {
  const first = name?.trim().split(/[\s-]+/)[0]
  if (!first) return "--"
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

export function buildBatchLineageColumns(params: {
  stockingByBatchId: Record<number, BatchStockingInfo>
}): Array<ColumnDef<DashboardBatchRpcRow, unknown>> {
  const { stockingByBatchId } = params

  const metricText = (value: number | null | undefined, decimals: number) =>
    isFiniteNumber(value) ? formatNumberValue(value, { decimals, minimumDecimals: decimals }) : null

  /** Right-aligned plain number cell -- one consistent style for every metric. */
  const numCell = (value: number | null | undefined, decimals: number, suffix = "") => {
    const text = metricText(value, decimals)
    return text == null ? (
      <NoData />
    ) : (
      <span className="text-sm tabular-nums text-foreground">
        {text}
        {suffix}
      </span>
    )
  }

  return [
    {
      id: "batch",
      header: "Batch",
      accessorFn: (row) => (row.batch_name?.trim() || `Batch #${row.batch_id}`).toLowerCase(),
      sortDescFirst: false,
      meta: { width: "116px" },
      cell: ({ row }) => {
        const data = row.original
        const title = data.batch_name?.trim() || `Batch #${data.batch_id}`
        return (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-5 text-foreground">{title}</span>
            {isFiniteNumber(data.cycle_day) ? (
              <span className="block text-tag text-muted-foreground">Day {data.cycle_day}</span>
            ) : null}
          </span>
        )
      },
    },
    {
      id: "source",
      header: "Source",
      accessorFn: (row) => shortSourceName(stockingByBatchId[row.batch_id]?.supplierName),
      meta: { width: "72px" },
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {shortSourceName(stockingByBatchId[row.original.batch_id]?.supplierName)}
        </span>
      ),
    },
    {
      id: "stock_date",
      header: "Stock Date",
      accessorFn: (row) => stockingByBatchId[row.batch_id]?.dateOfDelivery ?? "",
      meta: { width: "86px" },
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateOnly(stockingByBatchId[row.original.batch_id]?.dateOfDelivery, "--")}
        </span>
      ),
    },
    {
      id: "qty_stocked",
      header: "Stocked",
      accessorFn: (row) => stockingByBatchId[row.batch_id]?.numberOfFish ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "74px", align: "right" },
      cell: ({ row }) => numCell(stockingByBatchId[row.original.batch_id]?.numberOfFish, 0),
    },
    {
      id: "fish",
      header: "Live",
      accessorFn: (row) => row.fish_end ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "74px", align: "right" },
      cell: ({ row }) => numCell(row.original.fish_end, 0),
    },
    {
      id: "abw_at_stock",
      header: "Stock ABW",
      accessorFn: (row) => stockingByBatchId[row.batch_id]?.abw ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "84px", align: "right" },
      cell: ({ row }) => numCell(stockingByBatchId[row.original.batch_id]?.abw, 2),
    },
    {
      id: "abw",
      header: "ABW",
      accessorFn: (row) => row.abw ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "70px", align: "right" },
      cell: ({ row }) => numCell(row.original.abw, 1),
    },
    {
      id: "efcr",
      header: "eFCR",
      accessorFn: (row) => row.efcr ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "64px", align: "right" },
      cell: ({ row }) => numCell(row.original.efcr, 2),
    },
    {
      id: "efcr_acc",
      header: "Acc eFCR",
      accessorFn: (row) => row.efcr_acc ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "76px", align: "right" },
      cell: ({ row }) => numCell(row.original.efcr_acc, 2),
    },
    {
      id: "survival_rate",
      header: "Survival",
      accessorFn: (row) => {
        const stocked = stockingByBatchId[row.batch_id]?.numberOfFish
        return isFiniteNumber(stocked) && stocked > 0 && isFiniteNumber(row.fish_end)
          ? (row.fish_end / stocked) * 100
          : undefined
      },
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "76px", align: "right" },
      cell: ({ row }) => {
        const stocked = stockingByBatchId[row.original.batch_id]?.numberOfFish
        const survival =
          isFiniteNumber(stocked) && stocked > 0 && isFiniteNumber(row.original.fish_end)
            ? (row.original.fish_end / stocked) * 100
            : null
        return numCell(survival, 1, "%")
      },
    },
    {
      id: "mortality_rate",
      header: "Mortality",
      accessorFn: (row) => row.mortality_rate ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "80px", align: "right" },
      cell: ({ row }) => numCell(row.original.mortality_rate, 2, "%"),
    },
    {
      id: "stage",
      header: "Stage",
      accessorFn: (row) => row.growth_stage ?? "",
      meta: { width: "92px" },
      cell: ({ row }) => <Badge variant="secondary">{formatGrowthStage(row.original.growth_stage)}</Badge>,
    },
  ]
}
