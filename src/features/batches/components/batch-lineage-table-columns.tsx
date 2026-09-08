"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/app-ui/badge"
import type { BatchStockingInfo, DashboardBatchRpcRow } from "@/features/batches/types"
import { formatDateOnly, formatNumberValue } from "@/lib/analytics-format"
import { formatGrowthStage } from "@/lib/stage-filter"
import { MetricCell, NoData, formatLastDate, isFiniteNumber } from "@/features/dashboard/lib/table-cells"

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

  const productionHref = (batchId: number) => `/production?batch=${batchId}`

  const metricValue = (value: number | null | undefined, decimals: number) =>
    isFiniteNumber(value) ? formatNumberValue(value, { decimals, minimumDecimals: decimals }) : null

  const num = (value: string | null) =>
    value == null ? <NoData /> : <span className="text-sm text-foreground">{value}</span>

  return [
    {
      id: "batch",
      header: "Batch",
      accessorFn: (row) => (row.batch_name?.trim() || `Batch #${row.batch_id}`).toLowerCase(),
      sortDescFirst: false,
      meta: { width: "150px" },
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
      meta: { width: "100px" },
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
      meta: { width: "105px" },
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateOnly(stockingByBatchId[row.original.batch_id]?.dateOfDelivery, "--")}
        </span>
      ),
    },
    {
      id: "qty_stocked",
      header: "Qty Stocked",
      accessorFn: (row) => stockingByBatchId[row.batch_id]?.numberOfFish ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "95px", align: "right" },
      cell: ({ row }) => num(metricValue(stockingByBatchId[row.original.batch_id]?.numberOfFish, 0)),
    },
    {
      id: "fish",
      header: "Live Count",
      accessorFn: (row) => row.fish_end ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "90px", align: "right" },
      cell: ({ row }) => num(metricValue(row.original.fish_end, 0)),
    },
    {
      id: "abw_at_stock",
      header: "ABW at Stock",
      accessorFn: (row) => stockingByBatchId[row.batch_id]?.abw ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "105px", unit: "g", align: "right" },
      cell: ({ row }) => num(metricValue(stockingByBatchId[row.original.batch_id]?.abw, 2)),
    },
    {
      id: "abw",
      header: "ABW",
      accessorFn: (row) => row.abw ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "95px", unit: "g", align: "right" },
      cell: ({ row }) => {
        const data = row.original
        const value = metricValue(data.abw, 1)
        if (value == null) return <NoData />
        return (
          <MetricCell
            href={productionHref(data.batch_id)}
            value={value}
            align="right"
            subtext={formatLastDate(data.abw_latest_date)}
          />
        )
      },
    },
    {
      id: "efcr",
      header: "eFCR",
      accessorFn: (row) => row.efcr ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "85px", align: "right" },
      cell: ({ row }) => {
        const data = row.original
        const value = metricValue(data.efcr, 2)
        if (value == null) return <NoData />
        return (
          <MetricCell
            href={productionHref(data.batch_id)}
            value={value}
            arrow={data.efcr_arrow}
            invertArrow
            align="right"
          />
        )
      },
    },
    {
      id: "efcr_acc",
      header: "Acc eFCR",
      accessorFn: (row) => row.efcr_acc ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "90px", align: "right" },
      cell: ({ row }) => num(metricValue(row.original.efcr_acc, 2)),
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
      meta: { width: "85px", unit: "%", align: "right" },
      cell: ({ row }) => {
        const stocked = stockingByBatchId[row.original.batch_id]?.numberOfFish
        const survival =
          isFiniteNumber(stocked) && stocked > 0 && isFiniteNumber(row.original.fish_end)
            ? (row.original.fish_end / stocked) * 100
            : null
        return num(metricValue(survival, 1))
      },
    },
    {
      id: "mortality_rate",
      header: "Mortality",
      accessorFn: (row) => row.mortality_rate ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "90px", unit: "%", align: "right" },
      cell: ({ row }) => {
        const value = metricValue(row.original.mortality_rate, 2)
        return num(value)
      },
    },
    {
      id: "stage",
      header: "Stage",
      accessorFn: (row) => row.growth_stage ?? "",
      meta: { width: "100px" },
      cell: ({ row }) => <Badge variant="secondary">{formatGrowthStage(row.original.growth_stage)}</Badge>,
    },
  ]
}
