"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { DataTable } from "@/components/shared/data-table"
import type { BatchSummaryRow } from "@/features/dashboard/types"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { formatNumberValue } from "@/lib/analytics-format"
import { buildBatchSummaryColumns } from "./batches-table-columns"
import { isFiniteNumber } from "@/features/dashboard/lib/table-cells"

/**
 * Batches view of the dashboard's Cages|Batches toggle. Sibling of
 * SystemsTable: same card/table chrome, one row per production batch instead
 * of per cage. Presentational — the page owns the `api_dashboard` query and
 * passes its `batches` array down (populated when `includeBatches` is set).
 */
interface BatchesTableProps {
  rows: BatchSummaryRow[]
  isLoading: boolean
  isFetching: boolean
  isError?: boolean
  errorMessage?: string | null
  updatedAt?: number
  onRetry?: () => void
  farmId?: string | null
  showHeader?: boolean
}

export default function BatchesTable({
  rows,
  isLoading,
  isFetching,
  isError = false,
  errorMessage,
  updatedAt,
  onRetry,
  farmId,
  showHeader = true,
}: BatchesTableProps) {
  const router = useRouter()
  const columns = useMemo(() => buildBatchSummaryColumns(), [])

  const openBatchOnDashboard = (row: BatchSummaryRow) => {
    const params = new URLSearchParams()
    if (farmId) params.set("farmId", farmId)
    params.set("batch", String(row.batch_id))
    params.set("view", "cage")
    router.push(`/dashboard${params.toString() ? `?${params.toString()}` : ""}`)
  }

  if (isError) {
    return (
      <DataErrorState
        title="Unable to load batch table"
        description={errorMessage ?? "Please retry or check your connection."}
        onRetry={onRetry}
      />
    )
  }

  return (
    <Card className="rounded-2xl">
      {showHeader ? (
        <CardHeader className="pb-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Batches</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Each active batch, rolled up across every cage it currently occupies
              </p>
            </div>
            <DataFetchingBadge isFetching={isFetching} isLoading={isLoading} />
          </div>
          <DataUpdatedAt updatedAt={updatedAt ?? 0} />
        </CardHeader>
      ) : null}

      <CardContent className="pt-2">
        {isLoading ? (
          <div className="h-[240px] animate-pulse rounded-lg bg-muted/50" />
        ) : (
          <>
            <MobileBatchCards rows={rows} onOpenBatch={openBatchOnDashboard} />

            <div className="hidden md:block">
              <DataTable<BatchSummaryRow>
                columns={columns}
                data={rows}
                rowKey={(row) => row.batch_id}
                onRowClick={openBatchOnDashboard}
                emptyMessage="No active batches found"
                initialSorting={[{ id: "batch", desc: false }]}
                shellClassName="max-h-[520px]"
                tableClassName="min-w-[960px] table-fixed"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MobileBatchCards({
  rows,
  onOpenBatch,
}: {
  rows: BatchSummaryRow[]
  onOpenBatch: (row: BatchSummaryRow) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="grid gap-3 md:hidden">
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No active batches found
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:hidden">
      {rows.map((row) => (
        <button
          key={row.batch_id}
          type="button"
          onClick={() => onOpenBatch(row)}
          className="w-full rounded-lg border border-border/70 bg-background p-3 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-5 text-foreground">{row.batch_name}</p>
            <p className="mt-1 truncate text-[11px] leading-4 text-muted-foreground">
              {row.current_system_names.length > 0 ? row.current_system_names.join(", ") : "No active cages"}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <MobileMetric label="Cycle day" value={isFiniteNumber(row.cycle_day) ? `Day ${row.cycle_day}` : "--"} />
            <MobileMetric label="Fish" value={formatNumberValue(row.fish_end, { decimals: 0 })} />
            <MobileMetric
              label="ABW"
              value={isFiniteNumber(row.abw) ? `${formatNumberValue(row.abw, { decimals: 1 })} g` : "--"}
            />
            <MobileMetric
              label="Biomass"
              value={`${formatNumberValue(row.biomass_end, { decimals: 1 })} kg`}
            />
            <MobileMetric
              label="eFCR"
              value={isFiniteNumber(row.efcr) ? formatNumberValue(row.efcr, { decimals: 2 }) : "--"}
            />
            <MobileMetric
              label="Daily mortality"
              value={isFiniteNumber(row.mortality_rate) ? `${formatNumberValue(row.mortality_rate, { decimals: 2 })}%` : "--"}
            />
          </div>
        </button>
      ))}
    </div>
  )
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/45 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold text-foreground">{value}</p>
    </div>
  )
}
