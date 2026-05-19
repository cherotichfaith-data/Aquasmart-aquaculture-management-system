"use client"

import { useFeedDemandForecast } from "@/lib/hooks/use-analytics"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import type { FeedDemandRow, FeedStockStatus } from "@/lib/types/insights"

// ── Stock status styling ──────────────────────────────────────────────────────

const statusStyles: Record<FeedStockStatus, { label: string; bg: string; text: string; bar: string }> = {
  ok:       { label: "OK",       bg: "bg-success/12",      text: "text-success",        bar: "bg-success" },
  low:      { label: "Low",      bg: "bg-warning/12",      text: "text-warning",         bar: "bg-warning" },
  critical: { label: "Critical", bg: "bg-destructive/12",  text: "text-destructive",     bar: "bg-destructive" },
  unknown:  { label: "Unknown",  bg: "bg-muted/40",        text: "text-muted-foreground", bar: "bg-muted" },
}

// ── Single row ────────────────────────────────────────────────────────────────

function DemandRow({ row }: { row: FeedDemandRow }) {
  const style = statusStyles[row.stock_status]
  const daysStock = row.days_of_stock != null ? `${Math.floor(row.days_of_stock)}d` : "—"
  return (
    <tr className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
      {/* Feed type */}
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-foreground leading-tight">{row.feed_category}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {[row.feed_line, row.feed_pellet_size].filter(Boolean).join(" · ")}
        </p>
      </td>
      {/* Avg daily kg */}
      <td className="px-3 py-3 text-right hidden sm:table-cell">
        <span className="text-sm font-medium text-foreground">{row.avg_daily_kg.toFixed(1)}</span>
        <span className="text-[11px] text-muted-foreground ml-1">kg/d</span>
      </td>
      {/* 7-day forecast */}
      <td className="px-3 py-3 text-right hidden md:table-cell">
        <span className="text-sm font-medium text-foreground">{row.forecast_7d_kg.toFixed(0)}</span>
        <span className="text-[11px] text-muted-foreground ml-1">kg</span>
      </td>
      {/* 14-day forecast */}
      <td className="px-3 py-3 text-right hidden md:table-cell">
        <span className="text-sm font-medium text-foreground">{row.forecast_total_kg.toFixed(0)}</span>
        <span className="text-[11px] text-muted-foreground ml-1">kg</span>
      </td>
      {/* Current stock + days bar */}
      <td className="px-3 py-3 hidden sm:table-cell">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-[4rem]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">{row.current_stock_kg.toFixed(0)} kg</span>
              <span className="text-[11px] text-muted-foreground">{daysStock}</span>
            </div>
            <div className={`h-1.5 w-full rounded-full ${style.bar}`} />
          </div>
        </div>
      </td>
      {/* Status badge */}
      <td className="px-4 py-3 text-right">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </td>
    </tr>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export default function FeedDemandForecast({
  farmId: initialFarmId,
  daysAhead = 14,
}: {
  farmId?: string | null
  daysAhead?: number
}) {
  const { farmId: activeFarmId } = useActiveFarm()
  const farmId = activeFarmId ?? initialFarmId

  const query = useFeedDemandForecast({ farmId, daysAhead })
  const rows = query.data?.status === "success" ? query.data.data : []
  const errorMsg = getErrorMessage(query.error) ?? getQueryResultError(query.data)

  if (query.isError) {
    return (
      <DataErrorState
        title="Unable to load feed demand forecast"
        description={errorMsg ?? "Please retry or check your connection."}
        onRetry={() => query.refetch()}
      />
    )
  }

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <DataUpdatedAt updatedAt={query.dataUpdatedAt} />
        <DataFetchingBadge isFetching={query.isFetching} isLoading={query.isLoading} />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No feed demand data" description="Feed demand is calculated from active systems with current fish populations." />
      ) : (
        <div className="panel-surface rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Feed Type</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground hidden sm:table-cell">Daily Avg</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground hidden md:table-cell">7-Day</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground hidden md:table-cell">{daysAhead}-Day</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground hidden sm:table-cell">Stock / Days Left</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => <DemandRow key={row.feed_type_id} row={row} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
