"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/app-ui/badge"
import type { BatchStockingInfo, DashboardBatchRpcRow } from "@/features/batches/types"
import { formatDateOnly, formatNumberValue } from "@/lib/analytics-format"
import { formatGrowthStage } from "@/lib/stage-filter"
import { toTimePeriodUrlValue, type TimePeriod } from "@/lib/time-period"
import { MetricCell, NoData, formatLastDate, isFiniteNumber } from "@/features/dashboard/lib/table-cells"

export function buildBatchLineageColumns(params: {
  timePeriod?: TimePeriod
  stockingByBatchId: Record<number, BatchStockingInfo>
}): Array<ColumnDef<DashboardBatchRpcRow, unknown>> {
  const { timePeriod, stockingByBatchId } = params

  const productionHref = (batchId: number) => {
    const query = new URLSearchParams()
    query.set("batch", String(batchId))
    if (timePeriod) query.set("date", toTimePeriodUrlValue(timePeriod))
    return `/production?${query.toString()}`
  }

  const metricValue = (value: number | null | undefined, decimals: number) =>
    isFiniteNumber(value) ? formatNumberValue(value, { decimals, minimumDecimals: decimals }) : null

  return [
    {
      id: "batch",
      header: "Batch",
      accessorFn: (row) => (row.batch_name?.trim() || `Batch #${row.batch_id}`).toLowerCase(),
      sortDescFirst: false,
      meta: { width: "180px" },
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
      accessorFn: (row) => stockingByBatchId[row.batch_id]?.supplierName ?? "",
      meta: { width: "150px" },
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{stockingByBatchId[row.original.batch_id]?.supplierName ?? "--"}</span>
      ),
    },
    {
      id: "stock_date",
      header: "Stock Date",
      accessorFn: (row) => stockingByBatchId[row.batch_id]?.dateOfDelivery ?? "",
      meta: { width: "120px" },
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
      meta: { width: "110px" },
      cell: ({ row }) => (
        <span className="text-sm">{formatNumberValue(stockingByBatchId[row.original.batch_id]?.numberOfFish)}</span>
      ),
    },
    {
      id: "fish",
      header: "Live Count",
      accessorFn: (row) => row.fish_end ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "100px" },
      cell: ({ row }) => {
        const value = metricValue(row.original.fish_end, 0)
        return value == null ? <NoData /> : <span className="text-sm text-foreground">{value}</span>
      },
    },
    {
      id: "abw_at_stock",
      header: "ABW at Stock",
      accessorFn: (row) => stockingByBatchId[row.batch_id]?.abw ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "120px", unit: "g" },
      cell: ({ row }) => {
        const value = metricValue(stockingByBatchId[row.original.batch_id]?.abw, 2)
        return value == null ? <NoData /> : <span className="text-sm">{value} g</span>
      },
    },
    {
      id: "abw",
      header: "ABW",
      accessorFn: (row) => row.abw ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "110px", unit: "g" },
      cell: ({ row }) => {
        const data = row.original
        const value = metricValue(data.abw, 1)
        if (value == null) return <NoData />
        return (
          <MetricCell
            href={productionHref(data.batch_id)}
            value={value}
            arrow={data.abw_arrow}
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
      meta: { width: "100px" },
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
            subtext={formatLastDate(data.efcr_latest_date)}
          />
        )
      },
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
      meta: { width: "100px", unit: "%" },
      cell: ({ row }) => {
        const stocked = stockingByBatchId[row.original.batch_id]?.numberOfFish
        const survival =
          isFiniteNumber(stocked) && stocked > 0 && isFiniteNumber(row.original.fish_end)
            ? (row.original.fish_end / stocked) * 100
            : null
        const value = metricValue(survival, 1)
        return value == null ? <NoData /> : <span className="text-sm">{value}%</span>
      },
    },
    {
      id: "mortality_rate",
      header: "Mortality",
      accessorFn: (row) => row.mortality_rate ?? undefined,
      sortUndefined: "last",
      sortDescFirst: true,
      meta: { width: "110px", unit: "%" },
      cell: ({ row }) => {
        const data = row.original
        const value = metricValue(data.mortality_rate, 2)
        if (value == null) return <NoData />
        const rising = String(data.mortality_rate_arrow ?? "").toLowerCase() === "up"
        return (
          <MetricCell
            href={productionHref(data.batch_id)}
            value={<span className={rising ? "text-destructive" : undefined}>{value}</span>}
            arrow={data.mortality_rate_arrow}
            invertArrow
            subtext={formatLastDate(data.mortality_rate_latest_date)}
          />
        )
      },
    },
    {
      id: "stage",
      header: "Stage",
      accessorFn: (row) => row.growth_stage ?? "",
      meta: { width: "110px" },
      cell: ({ row }) => <Badge variant="secondary">{formatGrowthStage(row.original.growth_stage)}</Badge>,
    },
  ]
}
