"use client"

import { useCycleBenchmarks } from "@/lib/hooks/use-analytics"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import type { BenchmarkLabel, CycleBenchmarkRow } from "@/lib/types/insights"

// ── Benchmark label badge ─────────────────────────────────────────────────────

const benchmarkStyles: Record<BenchmarkLabel, { label: string; bg: string; text: string }> = {
  best_ever:  { label: "Best Ever",   bg: "bg-primary/12",     text: "text-primary" },
  above_avg:  { label: "Above Avg",   bg: "bg-primary/12",     text: "text-primary" },
  average:    { label: "Average",     bg: "bg-muted/40",       text: "text-muted-foreground" },
  below_avg:  { label: "Below Avg",   bg: "bg-warning/12",     text: "text-warning" },
  no_history: { label: "No History",  bg: "bg-muted/30",       text: "text-muted-foreground/60" },
}

// ── Delta chip ────────────────────────────────────────────────────────────────

function DeltaChip({
  delta,
  invert = false,
  unit = "",
}: {
  delta: number | null
  invert?: boolean
  unit?: string
}) {
  if (delta == null) return <span className="text-muted-foreground/50 text-xs">—</span>
  const positive = delta > 0
  const good = invert ? !positive : positive
  const sign = positive ? "+" : ""
  const colorClass = good ? "text-primary" : "text-destructive"
  return (
    <span className={`text-xs font-semibold ${colorClass}`}>
      {sign}{delta.toFixed(2)}{unit}
    </span>
  )
}

// ── Metric column ─────────────────────────────────────────────────────────────

function MetricCol({
  label,
  current,
  best,
  delta,
  unit,
  decimals = 2,
  invertDelta = false,
}: {
  label: string
  current: number | null
  best: number | null
  delta: number | null
  unit: string
  decimals?: number
  invertDelta?: boolean
}) {
  const fmt = (v: number | null) => (v != null ? v.toFixed(decimals) : "—")
  return (
    <td className="px-3 py-3 text-center hidden sm:table-cell">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold text-foreground">{fmt(current)}<span className="text-[10px] text-muted-foreground ml-0.5">{unit}</span></p>
      {best != null && (
        <p className="text-[10px] text-muted-foreground mt-0.5">Best {fmt(best)}{unit}</p>
      )}
      <div className="mt-0.5">
        <DeltaChip delta={delta} invert={invertDelta} unit={unit} />
      </div>
    </td>
  )
}

// ── Single system row ─────────────────────────────────────────────────────────

function BenchmarkRow({ row }: { row: CycleBenchmarkRow }) {
  const style = benchmarkStyles[row.benchmark_label]
  const daysIn = row.current_days_in_cycle != null ? `${row.current_days_in_cycle}d in cycle` : ""
  const cycleStart = row.current_cycle_start
    ? new Date(row.current_cycle_start).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : null

  return (
    <tr className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
      {/* System name */}
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-foreground leading-tight">{row.system_name}</p>
        {cycleStart && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Started {cycleStart}{daysIn ? ` · ${daysIn}` : ""}
          </p>
        )}
        {row.current_abw_g != null && (
          <p className="text-[11px] text-muted-foreground">ABW {row.current_abw_g.toFixed(0)} g</p>
        )}
      </td>
      {/* FCR */}
      <MetricCol
        label="eFCR"
        current={row.current_efcr}
        best={row.best_efcr}
        delta={row.efcr_vs_best}
        unit=""
        invertDelta
      />
      {/* ADG */}
      <MetricCol
        label="ADG"
        current={row.current_adg_g_day}
        best={row.best_adg_g_day}
        delta={row.adg_vs_best}
        unit="g/d"
      />
      {/* Survival */}
      <MetricCol
        label="Survival"
        current={row.current_survival_pct}
        best={row.best_survival_pct}
        delta={row.survival_vs_best}
        unit="%"
        decimals={1}
      />
      {/* Label badge */}
      <td className="px-4 py-3 text-right">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </td>
    </tr>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export default function CycleBenchmarks({
  farmId: initialFarmId,
  systemId,
}: {
  farmId?: string | null
  systemId?: number
}) {
  const { farmId: activeFarmId } = useActiveFarm()
  const farmId = activeFarmId ?? initialFarmId

  const query = useCycleBenchmarks({ farmId, systemId })
  const rows = query.data?.status === "success" ? query.data.data : []
  const errorMsg = getErrorMessage(query.error) ?? getQueryResultError(query.data)

  if (query.isError) {
    return (
      <DataErrorState
        title="Unable to load cycle benchmarks"
        description={errorMsg ?? "Please retry or check your connection."}
        onRetry={() => query.refetch()}
      />
    )
  }

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
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
        <EmptyState title="No benchmark data" description="Benchmarks compare the current production cycle against historical bests. At least one completed prior cycle is needed." />
      ) : (
        <div className="panel-surface rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">System</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground hidden sm:table-cell">eFCR</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground hidden sm:table-cell">ADG</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground hidden sm:table-cell">Survival</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">vs History</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => <BenchmarkRow key={row.system_id} row={row} />)}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-border/40 text-[10px] text-muted-foreground/70">
            Deltas show current vs best-ever cycle. eFCR lower is better; ADG and survival higher is better.
          </div>
        </div>
      )}
    </div>
  )
}
