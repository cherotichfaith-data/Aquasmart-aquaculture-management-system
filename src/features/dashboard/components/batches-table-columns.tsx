"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { BatchSummaryRow } from "@/features/dashboard/types"
import { formatNumberValue } from "@/lib/analytics-format"
import { isFiniteNumber } from "@/features/dashboard/lib/table-cells"

/**
 * Batches view columns — mirrors the cage table's column shape
 * (buildDashboardSystemColumns) so the two views feel like the same table
 * with a different scope, not a different product. The row data itself is
 * the same period-scoped metrics as the systems table, rolled up by
 * batch_id (see BatchSummaryRow).
 */

const identityDotColor = (batchId: number) => `var(--chart-${(Math.abs(batchId) % 5) + 1})`

const formatPercent = (value: number | null | undefined, decimals = 1) =>
  isFiniteNumber(value) ? `${formatNumberValue(value, { decimals, minimumDecimals: decimals })}%` : "--"

const formatWeight = (value: number | null | undefined, unit: string, decimals = 1) =>
  isFiniteNumber(value) ? `${formatNumberValue(value, { decimals, minimumDecimals: decimals })} ${unit}` : "--"

export function buildBatchSummaryColumns(): Array<ColumnDef<BatchSummaryRow, unknown>> {
  return [
    {
      id: "batch",
      header: "Batch",
      accessorFn: (row) => row.batch_name.toLowerCase(),
      sortDescFirst: false,
      meta: { width: "210px" },
      cell: ({ row }) => {
        const data = row.original
        const systemsLabel =
          data.current_system_names.length > 0 ? data.current_system_names.join(", ") : "No active cages"
        return (
          <span className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: identityDotColor(data.batch_id) }}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-5 text-foreground">
                {data.batch_name}
              </span>
              <span className="block truncate text-xs leading-4 text-muted-foreground">{systemsLabel}</span>
            </span>
          </span>
        )
      },
    },
    {
      id: "cycle_day",
      header: "Cycle day",
      accessorFn: (row) => row.cycle_day ?? undefined,
      sortUndefined: "last",
      meta: { width: "100px" },
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {isFiniteNumber(row.original.cycle_day) ? `Day ${row.original.cycle_day}` : "--"}
        </span>
      ),
    },
    {
      id: "fish_count",
      header: "Fish count",
      accessorFn: (row) => row.fish_end ?? undefined,
      sortUndefined: "last",
      meta: { width: "110px" },
      cell: ({ row }) => (
        <span className="text-sm text-foreground">{formatNumberValue(row.original.fish_end, { decimals: 0 })}</span>
      ),
    },
    {
      id: "abw",
      header: "ABW",
      accessorFn: (row) => row.abw ?? undefined,
      sortUndefined: "last",
      meta: { width: "100px" },
      cell: ({ row }) => <span className="text-sm text-foreground">{formatWeight(row.original.abw, "g")}</span>,
    },
    {
      id: "biomass",
      header: "Biomass",
      accessorFn: (row) => row.biomass_end ?? undefined,
      sortUndefined: "last",
      meta: { width: "110px" },
      cell: ({ row }) => (
        <span className="text-sm text-foreground">{formatWeight(row.original.biomass_end, "kg")}</span>
      ),
    },
    {
      id: "efcr",
      header: "eFCR",
      accessorFn: (row) => row.efcr ?? undefined,
      sortUndefined: "last",
      meta: { width: "90px" },
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {isFiniteNumber(row.original.efcr)
            ? formatNumberValue(row.original.efcr, { decimals: 2, minimumDecimals: 2 })
            : "--"}
        </span>
      ),
    },
    {
      id: "mortality_rate",
      header: "Daily mortality",
      accessorFn: (row) => row.mortality_rate ?? undefined,
      sortUndefined: "last",
      meta: { width: "110px" },
      cell: ({ row }) => (
        <span className="text-sm text-foreground">{formatPercent(row.original.mortality_rate, 2)}</span>
      ),
    },
    {
      id: "target_progress",
      header: "Target progress",
      accessorFn: (row) => row.target_weight_progress_pct ?? undefined,
      sortUndefined: "last",
      meta: { width: "180px" },
      cell: ({ row }) => {
        const pct = row.original.target_weight_progress_pct
        const target = row.original.target_weight_g
        if (!isFiniteNumber(pct) || !isFiniteNumber(target)) {
          return <span className="text-sm text-muted-foreground">--</span>
        }
        const clampedWidth = Math.max(0, Math.min(100, pct))
        return (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${clampedWidth}%` }}
              />
            </span>
            <span className="text-xs text-muted-foreground">
              {formatPercent(pct, 0)} of {formatNumberValue(target, { decimals: 0 })}g
            </span>
          </span>
        )
      },
    },
  ]
}
