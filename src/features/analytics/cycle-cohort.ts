import type { BatchReportRow } from "./types"
import type { StockLossSources } from "./stock-loss"

export type ReportCycle = { cycle_id: number; batch_id: number; cycle_start: string; cycle_end: string | null
  system_id?: number | null
  production_cycle_system?: { system_id: number; started_at: string; ended_at: string | null }[] }

/** Select by the calendar month, independently of the lifetime calculation window. */
export function monthCycles(cycles: ReportCycle[], month: string, cutoff: string) {
  return cycles.filter(c => c.cycle_start <= cutoff && (c.cycle_end == null || c.cycle_end >= month))
}

export function monthSystemIds(cycles: ReportCycle[], month: string, cutoff: string) {
  return new Set(cycles.flatMap(c => c.production_cycle_system?.length
    ? c.production_cycle_system.filter(p => p.started_at.slice(0, 10) <= cutoff && (p.ended_at == null || p.ended_at.slice(0, 10) >= month)).map(p => p.system_id)
    : c.system_id == null ? [] : [c.system_id]))
}

/** Rebuild the SQL total after selecting a cohort; never retain a total of hidden batches. */
export function cohortBatchRows(rows: BatchReportRow[], ids: Set<number>, sources: StockLossSources | null) {
  const selected = rows.filter(r => r.batch_id != null && ids.has(r.batch_id))
  if (!selected.length) return []
  const total = { ...selected[0], batch_id: null, batch_name: "Total", date_in: null, age_days: null } as BatchReportRow
  const sum = (field: keyof BatchReportRow, complete = false) => complete && selected.some(r => r[field] == null) ? null
    : selected.some(r => typeof r[field] === "number") ? selected.reduce((n, r) => n + (typeof r[field] === "number" ? r[field] as number : 0), 0) : null
  for (const field of ["total_stocked", "stock_end", "harvest_number", "harvest_kg", "cage_corrections", "mortality", "growth_kg", "efcr_feed_kg", "efcr_growth_kg", "acc_efcr_feed_kg", "acc_efcr_growth_kg"] as const) total[field] = sum(field)
  total.biomass_kg = sum("biomass_kg", true)
  total.feed_kg = sum("feed_kg", true)
  const ratio = (n: number | null | undefined, d: number | null | undefined, scale = 1) => n != null && d != null && d > 0 ? n / d * scale : null
  total.abw_g = ratio(total.biomass_kg, total.stock_end, 1000)
  total.harvest_abw_g = ratio(total.harvest_kg, total.harvest_number, 1000)
  total.efcr = ratio(total.efcr_feed_kg, total.efcr_growth_kg)
  total.acc_efcr = ratio(total.acc_efcr_feed_kg, total.acc_efcr_growth_kg)
  let population = 0, lost = 0
  let known = sources != null
  for (const row of selected) {
    const events = sources?.events.filter(e => e.batch_id === row.batch_id) ?? []
    const received = events.reduce((n, e) => n + e.received, 0)
    const adjustments = -events.filter(e => e.kind === "adjustment" || e.kind === "harvest_adjustment").reduce((n, e) => n + e.delta, 0)
    const deaths = -events.filter(e => e.kind === "mortality" || e.kind === "discard").reduce((n, e) => n + e.delta, 0)
    known &&= received > 0 && !events.some(e => e.kind === "ambiguous")
    population += received - Math.min(adjustments, 0)
    lost += deaths + Math.max(adjustments, 0)
  }
  total.stock_loss_pct = known ? ratio(lost, population, 100) : null
  // These charts have their own cohort rows; no percentage may be inherited from the first batch.
  for (const field of ["stock_loss_chart_pct", "stock_loss_mortality_pct", "stock_loss_adjustment_pct", "stock_loss_harvest_pct", "stock_loss_expected_pct"] as const) total[field] = null
  return [...selected, total]
}
