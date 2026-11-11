import { validDate, workbookWeightRates } from "./feed-model"
import type { StockLossChartRow } from "./types"

export type StockLossEvent = {
  batch_id: number; system_id: number | null; date: string; delta: number; received: number
  kind: "stocking" | "mortality" | "harvest" | "transfer" | "mix" | "discard" | "adjustment" | "harvest_adjustment" | "sampling" | "ambiguous"
  abw: number | null; sample_n: number
}
export type StockLossSources = {
  batches: {
    batch_id: number; batch_name: string; date_in: string
    active_periods?: { from: string; to: string | null }[]
    record_dates?: string[]
  }[]
  events: StockLossEvent[]
}
type Weight = { date: string; abw: number }
const key = (batch: number, system: number | null) => `${batch}:${system}`
const nextMonth = (date: string) => new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 1)).toISOString().slice(0, 10)

/** Same netting as Analytics calcs F:G; extra fish increase, rather than reduce, the denominator. */
export function workbookStockLoss(population: number, deaths: number, transfer: number, harvest: number) {
  if (![population, deaths, transfer, harvest].every(Number.isFinite) || population <= 0 || deaths < 0) return null
  const denominator = population - Math.min(transfer + harvest, 0)
  return {
    population: denominator,
    mortality: deaths / denominator * 100,
    adjustment: Math.max(0, transfer + Math.min(harvest, 0)) / denominator * 100,
    harvest: Math.max(0, harvest + Math.min(transfer, 0)) / denominator * 100,
  }
}

function observations(events: StockLossEvent[]) {
  const groups = new Map<string, { date: string; priority: number; weight: number; count: number }>()
  for (const event of events) {
    if (event.abw == null || !Number.isFinite(event.abw) || event.abw <= 0) continue
    const priority = event.kind === "sampling" ? 4 : event.kind === "harvest" ? 3 : event.kind === "stocking" ? 1 : 2
    const count = event.sample_n > 0 ? event.sample_n : Math.abs(event.delta)
    if (count <= 0) continue
    const id = `${key(event.batch_id, event.system_id)}:${event.date}`
    const old = groups.get(id)
    if (!old || priority > old.priority) groups.set(id, { date: event.date, priority, weight: count * event.abw, count })
    else if (priority === old.priority) { old.weight += count * event.abw; old.count += count }
  }
  const result = new Map<string, Weight[]>()
  for (const [id, group] of groups) {
    const series = id.slice(0, id.lastIndexOf(":"))
    const values = result.get(series) ?? []
    values.push({ date: group.date, abw: group.weight / group.count })
    result.set(series, values)
  }
  for (const values of result.values()) values.sort((a, b) => a.date.localeCompare(b.date))
  return result
}

function latestWeight(weights: Weight[], date: string) {
  return weights.findLast(weight => weight.date <= date)
}

function projectWeight(weight: Weight, date: string) {
  let abw = weight.abw
  let from = weight.date
  while (from < date) {
    const until = nextMonth(from) < date ? nextMonth(from) : date
    const days = (Date.parse(until) - Date.parse(from)) / 86_400_000
    abw *= Math.pow(1 + workbookWeightRates(abw).dailyGrowth, days)
    from = until
  }
  return abw
}

/** Workbook Expected rows 5:204: round monthly opening fish × the opening weight's mortality rate, then accumulate. */
function expectedDeaths(events: StockLossEvent[], weights: Map<string, Weight[]>, cutoff: string): number | null {
  const receipts = events.filter(event => event.received > 0)
  if (!receipts.length || receipts.some(event => event.system_id == null)) return null
  const bySystem = new Map<number, StockLossEvent[]>()
  for (const event of events) {
    if (event.system_id == null) continue
    const values = bySystem.get(event.system_id) ?? []
    values.push(event); bySystem.set(event.system_id, values)
  }
  let total = 0
  for (const [system, history] of bySystem) {
    const ownWeights = weights.get(key(history[0].batch_id, system)) ?? []
    const first = history.find(event => event.received > 0 || event.delta > 0)
    if (!first) continue
    for (let month = `${first.date.slice(0, 7)}-01`; month <= cutoff; month = nextMonth(month)) {
      const end = nextMonth(month)
      const opening = history.filter(event => event.date < month).reduce((sum, event) => sum + event.delta, 0)
      if (opening < -0.5) return null
      let prediction = 0
      if (opening > 0) {
        const observed = latestWeight(ownWeights, month)
        if (!observed) return null
        prediction += opening * workbookWeightRates(projectWeight(observed, month)).mortality
      }
      // Only genuine batch receipts add exposure; moving existing fish between cages does not count them twice.
      for (const entry of history.filter(event => event.received > 0 && event.date >= month && event.date < end)) {
        const observed = entry.abw != null && entry.abw > 0 ? { date: entry.date, abw: entry.abw } : latestWeight(ownWeights, entry.date)
        if (!observed) return null
        prediction += entry.received * workbookWeightRates(projectWeight(observed, entry.date)).mortality
      }
      total += Math.round(prediction)
    }
  }
  return total
}

export function buildStockLossRows(source: StockLossSources | null, cutoff: string, monthStart?: string): StockLossChartRow[] {
  if (!validDate(cutoff)) throw new Error("Choose a valid stock loss cutoff.")
  if (monthStart && (!validDate(monthStart) || monthStart > cutoff)) throw new Error("Choose a valid stock loss month.")
  const events = (source?.events ?? []).filter(event => event.date <= cutoff).map(event => ({ ...event }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const initialWeights = observations(events)
  // Paired mixing entries carry the source fish's measured weight; mixing itself is not a loss.
  for (const receipt of events.filter(event => event.kind === "mix" && event.received > 0 && !event.abw)) {
    const sources = events.filter(event => event.kind === "mix" && event.delta < 0 && event.system_id === receipt.system_id && event.date === receipt.date)
    const totalReceived = events.filter(event => event.kind === "mix" && event.received > 0 && event.batch_id === receipt.batch_id && event.system_id === receipt.system_id && event.date === receipt.date).reduce((sum, event) => sum + event.received, 0)
    if (sources.reduce((sum, event) => sum - event.delta, 0) !== totalReceived) continue
    let biomass = 0
    let complete = sources.length > 0
    for (const event of sources) {
      const observed = latestWeight(initialWeights.get(key(event.batch_id, event.system_id)) ?? [], event.date)
      if (!observed) { complete = false; break }
      biomass += -event.delta * projectWeight(observed, event.date)
    }
    if (complete) receipt.abw = biomass / totalReceived
  }
  const weights = observations(events)
  const byBatch = new Map<number, StockLossEvent[]>()
  for (const event of events) {
    const history = byBatch.get(event.batch_id) ?? []
    history.push(event); byBatch.set(event.batch_id, history)
  }
  return (source?.batches ?? []).map(batch => ({ ...batch, batch_name: batch.batch_name?.trim() || `Batch #${batch.batch_id}` }))
    .filter(batch => batch.date_in <= cutoff && !/^(BATCH-|INFERRED-)/i.test(batch.batch_name))
    .filter(batch => !monthStart
      || batch.active_periods?.some(period => period.from <= cutoff && (period.to == null || period.to >= monthStart))
      || batch.record_dates?.some(date => date >= monthStart && date <= cutoff)
      || byBatch.get(batch.batch_id)?.some(event => event.date >= monthStart))
    .sort((a, b) => b.date_in.localeCompare(a.date_in) || a.batch_name.localeCompare(b.batch_name))
    .map(batch => {
      const history = (byBatch.get(batch.batch_id) ?? []).filter(event => event.date >= batch.date_in)
      const sum = (read: (event: StockLossEvent) => number) => history.reduce((total, event) => total + read(event), 0)
      const population = sum(event => event.received)
      const losses = history.some(event => event.kind === "ambiguous") ? null : workbookStockLoss(population,
        sum(event => event.kind === "mortality" || event.kind === "discard" ? -event.delta : 0),
        sum(event => event.kind === "adjustment" ? -event.delta : 0),
        sum(event => event.kind === "harvest_adjustment" ? -event.delta : 0))
      const expected = losses ? expectedDeaths(history, weights, cutoff) : null
      return {
        batch_id: batch.batch_id, batch_name: batch.batch_name, stock_loss_pct: null,
        stock_loss_mortality_pct: losses?.mortality ?? null,
        stock_loss_adjustment_pct: losses?.adjustment ?? null,
        stock_loss_harvest_pct: losses?.harvest ?? null,
        stock_loss_chart_pct: losses ? losses.mortality + losses.adjustment + losses.harvest : null,
        stock_loss_expected_pct: expected != null && population > 0 ? expected / population * 100 : null,
      }
    })
}
