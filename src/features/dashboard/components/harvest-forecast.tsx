"use client"

import { useHarvestForecast } from "@/lib/hooks/use-analytics"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import { formatStableDate } from "@/lib/deterministic-format"
import type { HarvestForecastRow, HarvestForecastStatus } from "@/lib/types/insights"

// ── Status badge styling ──────────────────────────────────────────────────────

const statusStyles: Record<HarvestForecastStatus, { label: string; bg: string; text: string }> = {
  ready:       { label: "Ready",       bg: "bg-primary/12", text: "text-primary" },
  on_track:    { label: "On Track",    bg: "bg-chart-1/12", text: "text-chart-1" },
  slow_growth: { label: "Slow Growth", bg: "bg-destructive/12", text: "text-destructive" },
  no_data:     { label: "No Data",     bg: "bg-muted/40",   text: "text-muted-foreground" },
}

// ── Confidence dot ────────────────────────────────────────────────────────────

function ConfidenceDot({ confidence }: { confidence: "high" | "low" }) {
  return (
    <span
      title={confidence === "high" ? "High confidence (recent sampling)" : "Low confidence (sampling > 14 days ago)"}
      className={`inline-block h-2 w-2 rounded-full ${confidence === "high" ? "bg-primary" : "bg-muted-foreground"}`}
    />
  )
}

// ── Single row ────────────────────────────────────────────────────────────────

function ForecastRow({ row }: { row: HarvestForecastRow }) {
  const style = statusStyles[row.status]
  const abw = row.current_abw_g != null ? `${row.current_abw_g.toFixed(0)} g` : "—"
  const adg = row.adg_g_day != null ? `${row.adg_g_day.toFixed(2)} g/day` : "—"
  const daysLeft = row.days_to_target != null ? `${Math.ceil(row.days_to_target)}d` : "—"
  const harvestDate = row.projected_harvest_date
    ? formatStableDate(row.projected_harvest_date, { day: "numeric", month: "short", year: "numeric" })
    : "—"

  return (
    <div className="flex items-center gap-4 rounded-xl px-3 py-3 hover:bg-muted/30 transition-colors">
      {/* System name + confidence */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <ConfidenceDot confidence={row.confidence} />
          <p className="min-w-0 truncate text-sm font-semibold text-foreground">{row.system_name}</p>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">ABW {abw} · ADG {adg}</p>
      </div>
      {/* Days to harvest */}
      <div className="text-center hidden sm:block w-16 shrink-0">
        <p className="text-base font-bold text-foreground">{daysLeft}</p>
        <p className="text-[10px] text-muted-foreground">to harvest</p>
      </div>
      {/* Projected date */}
      <div className="text-right hidden md:block w-28 shrink-0">
        <p className="text-sm font-medium text-foreground">{harvestDate}</p>
        <p className="text-[10px] text-muted-foreground">est. harvest</p>
      </div>
      {/* Status badge */}
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export default function HarvestForecast({
  farmId: initialFarmId,
  systemId,
}: {
  farmId?: string | null
  systemId?: number
}) {
  const { farmId: activeFarmId } = useActiveFarm()
  const farmId = activeFarmId ?? initialFarmId

  const query = useHarvestForecast({ farmId, systemId })
  const rows = query.data?.status === "success" ? query.data.data : []
  const errorMsg = getErrorMessage(query.error) ?? getQueryResultError(query.data)

  if (query.isError) {
    return (
      <DataErrorState
        title="Unable to load harvest forecast"
        description={errorMsg ?? "Please retry or check your connection."}
        onRetry={() => query.refetch()}
      />
    )
  }

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array(4).fill(0).map((_, i) => (
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
        <EmptyState title="No harvest forecast data" description="Record fish sampling data to generate harvest projections." />
      ) : (
        <div className="panel-surface rounded-2xl overflow-hidden divide-y divide-border/50">
          {/* Header */}
          <div className="flex items-center gap-4 px-3 py-2 bg-muted/20">
            <p className="flex-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">System</p>
            <p className="hidden sm:block w-16 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Days Left</p>
            <p className="hidden md:block w-28 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Harvest Date</p>
            <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Status</p>
          </div>
          {rows.map((row) => <ForecastRow key={row.system_id} row={row} />)}
          {/* Legend */}
          <div className="px-3 py-2 flex items-center gap-4 text-[10px] text-muted-foreground/70">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-primary" /> High confidence</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" /> Low confidence (stale sample)</span>
          </div>
        </div>
      )}
    </div>
  )
}
