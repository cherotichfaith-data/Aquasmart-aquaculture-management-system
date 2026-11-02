import type { CageHarvestRow, GrowthCurveRow, HarvestPointRow } from "./types"

const SCENARIOS = ["slow", "main", "potential"] as const
type Scenario = (typeof SCENARIOS)[number]

/** Fewer weights than this and a batch is not judged against the curves. */
const MIN_POINTS = 3
/** A batch further than this from every curve is described as outside them rather than "closest to". */
const OUTSIDE_TOLERANCE = 0.15

export type HarvestCurveVerdict = {
  /** Curve with the smallest average gap across the batch's weights; null when there are too few weights. */
  closest: Scenario | null
  /** Average gap to that curve, as a fraction (-0.2 = 20% below). */
  gap: number | null
  /** True when the batch sits clear of the curve range (below Slow or above Potential). */
  outside: boolean
  /** Final harvest weight against the Main curve at the same model age, as a fraction. */
  finalVsMain: number | null
  finalAbwG: number | null
  finalMainAbwG: number | null
  finalAgeDays: number | null
  /** Weights used for the comparison, excluding the stocking weight. */
  pointCount: number
}

function modelAbw(curve: GrowthCurveRow[], day: number): number | null {
  if (curve.length === 0) return null
  const first = curve[0]
  const last = curve[curve.length - 1]
  if (day < first.day || day > last.day) return null
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1]
    const b = curve[i]
    if (day <= b.day) {
      const span = b.day - a.day
      return span === 0 ? b.abw_g : a.abw_g + ((b.abw_g - a.abw_g) * (day - a.day)) / span
    }
  }
  return null
}

export function curvesByScenario(rows: GrowthCurveRow[]): Record<Scenario, GrowthCurveRow[]> {
  const out: Record<Scenario, GrowthCurveRow[]> = { slow: [], main: [], potential: [] }
  for (const row of rows) if (row.scenario in out) out[row.scenario as Scenario].push(row)
  for (const s of SCENARIOS) out[s].sort((a, b) => a.day - b.day)
  return out
}

export function judgeBatchAgainstCurves(points: HarvestPointRow[], curves: Record<Scenario, GrowthCurveRow[]>): HarvestCurveVerdict {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const judged = sorted.filter((p) => p.kind !== "stocking")
  const finalPoint = [...sorted].reverse().find((p) => p.kind === "harvest") ?? sorted[sorted.length - 1]
  const finalMain = finalPoint ? modelAbw(curves.main, finalPoint.model_age_days) : null
  const base = {
    finalAbwG: finalPoint?.abw_g ?? null,
    finalMainAbwG: finalMain,
    finalAgeDays: finalPoint?.age_days ?? null,
    finalVsMain: finalPoint && finalMain ? finalPoint.abw_g / finalMain - 1 : null,
    pointCount: judged.length,
  }
  if (judged.length < MIN_POINTS) return { ...base, closest: null, gap: null, outside: false }

  let best: { scenario: Scenario; gap: number } | null = null
  const gaps = new Map<Scenario, number>()
  for (const scenario of SCENARIOS) {
    const logs = judged.flatMap((p) => {
      const model = modelAbw(curves[scenario], p.model_age_days)
      return model && model > 0 && p.abw_g > 0 ? [Math.log(p.abw_g / model)] : []
    })
    if (logs.length < MIN_POINTS) continue
    const gap = Math.exp(logs.reduce((s, v) => s + v, 0) / logs.length) - 1
    gaps.set(scenario, gap)
    if (!best || Math.abs(gap) < Math.abs(best.gap)) best = { scenario, gap }
  }
  if (!best) return { ...base, closest: null, gap: null, outside: false }
  const outside =
    (best.scenario === "slow" && best.gap < -OUTSIDE_TOLERANCE) || (best.scenario === "potential" && best.gap > OUTSIDE_TOLERANCE)
  return { ...base, closest: best.scenario, gap: best.gap, outside }
}

const SCENARIO_NAME: Record<Scenario, string> = { slow: "Slow", main: "Main", potential: "Potential" }

/** Short text for the table cell and the card pill. */
export function verdictLabel(v: HarvestCurveVerdict): string {
  if (!v.closest || v.gap === null) return "Too few weights"
  if (v.outside) return v.closest === "slow" ? "Below Slow" : "Above Potential"
  return SCENARIO_NAME[v.closest]
}

export function signedPct(fraction: number | null, digits = 0): string {
  if (fraction === null || !Number.isFinite(fraction)) return "-"
  const v = fraction * 100
  return `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`
}

type StockingSource = { batch_id: number | null; date: string; number_of_fish_stocking: number | null; total_weight_stocking: number | null }
type SamplingSource = { batch_id: number | null; date: string; number_of_fish_sampling: number | null; abw: number | null }
type HarvestSource = { batch_id: number | null; cycle_id: number | null; date: string; number_of_fish_harvest: number | null; total_weight_harvest: number | null }

function dayDiff(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/**
 * Weights on each harvested batch's history, from the stocking, sampling and harvest records. The stocking weight sets where the
 * batch starts on the growth model (the first day the curve reaches it), as on the Growth tab; model age then advances one day
 * per day. `curve` is the selected scenario's curve.
 */
export function buildHarvestPoints(
  batches: CageHarvestRow[],
  stocking: StockingSource[],
  sampling: SamplingSource[],
  harvests: HarvestSource[],
  curve: GrowthCurveRow[],
): HarvestPointRow[] {
  const out: HarvestPointRow[] = []
  for (const batch of batches) {
    const stock = stocking.filter((s) => s.batch_id === batch.batch_id)
    if (stock.length === 0) continue
    const d0 = stock.reduce((min, s) => (s.date < min ? s.date : min), stock[0].date)
    const fish = stock.reduce((sum, s) => sum + (s.number_of_fish_stocking ?? 0), 0)
    const kg = stock.reduce((sum, s) => sum + (s.total_weight_stocking ?? 0), 0)
    const abw0 = fish > 0 && kg > 0 ? (kg / fish) * 1000 : null
    const age0 = abw0 === null ? 0 : (curve.find((c) => c.abw_g >= abw0)?.day ?? 0)
    const push = (kind: HarvestPointRow["kind"], date: string, abw: number | null) => {
      if (abw === null || !(abw > 0) || date < d0 || date > batch.harvest_date) return
      const age = dayDiff(d0, date)
      out.push({ cycle_id: batch.cycle_id, batch_id: batch.batch_id, batch_name: batch.batch_name, kind, date, age_days: age, model_age_days: age0 + age, abw_g: abw })
    }
    push("stocking", d0, abw0)

    const sampled = new Map<string, { weight: number; n: number; plain: number[] }>()
    for (const s of sampling.filter((r) => r.batch_id === batch.batch_id && r.abw !== null)) {
      const entry = sampled.get(s.date) ?? { weight: 0, n: 0, plain: [] }
      const n = s.number_of_fish_sampling ?? 0
      entry.weight += (s.abw as number) * n
      entry.n += n
      entry.plain.push(s.abw as number)
      sampled.set(s.date, entry)
    }
    for (const [date, e] of sampled) push("sampling", date, e.n > 0 ? e.weight / e.n : e.plain.reduce((a, b) => a + b, 0) / e.plain.length)

    const harvested = new Map<string, { n: number; kg: number }>()
    for (const h of harvests.filter((r) => r.cycle_id === batch.cycle_id)) {
      const entry = harvested.get(h.date) ?? { n: 0, kg: 0 }
      entry.n += h.number_of_fish_harvest ?? 0
      entry.kg += h.total_weight_harvest ?? 0
      harvested.set(h.date, entry)
    }
    for (const [date, e] of harvested) push("harvest", date, e.n > 0 && e.kg > 0 ? (e.kg / e.n) * 1000 : null)
  }
  return out.sort((a, b) => a.cycle_id - b.cycle_id || a.date.localeCompare(b.date))
}
