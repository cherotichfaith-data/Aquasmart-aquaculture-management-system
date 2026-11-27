// Tanganyika Blue mortality outlook (3-5 months). RECORDED deaths only: fish that go missing without a mortality record
// (count corrections) are not forecast. Components come from the cohort x month ledger, 2025-01..2026-10
// (scripts/tb-feed-model/mortality_fit.py) and were backtested with scripts/tb-feed-model/mortality_backtest.py.
import { workbookWeightRates } from "./feed-model"
export const MORTALITY_FIT = {
  // Hazard per 30 days. Fish in their first 30 days after stocking are far more vulnerable.
  youngPer30: 0.016084,
  olderPer30: [{ below: 15, p: 0.001211 }, { below: 100, p: 0.001942 }, { below: 250, p: 0.00088 }, { below: Infinity, p: 0.000233 }],
  // Calendar-month multiplier (shrunk halfway toward 1; the cooler Jul-Aug period lost more fish in both 2025 and 2026).
  season: { "01": 0.872, "02": 0.527, "03": 0.916, "04": 0.674, "05": 0.727, "06": 0.833, "07": 1.301, "08": 1.61, "09": 0.928, "10": 1.007, "11": 0.861, "12": 0.64 } as Record<string, number>,
  // Range around the farm total, from actual/predicted in 7 rolling 3-month backtests (0.47 to 1.17). Months 4-5 are not validated.
  range3: { low: 0.5, high: 1.25 },
  range5: { low: 0.4, high: 1.5 },
} as const
export type MortalityCohort = { key: string; fish: number; abwG: number; ageDays: number }
export type MortalityMonth = { month: string; deaths: number; low: number; high: number; fish_end: number }
export type MortalityOutlook = { months: MortalityMonth[]; cumulative_pct: { low: number; expected: number; high: number }[]; per_cohort: { key: string; deaths: number; survival_pct: number }[]; start_fish: number }
const olderRate = (w: number) => MORTALITY_FIT.olderPer30.find(b => w < b.below)!.p
export function forecastMortality(cohorts: MortalityCohort[], startMonth: string, months: number): MortalityOutlook {
  if (!/^\d{4}-\d{2}$/.test(startMonth) || !Number.isInteger(months) || months < 1 || months > 5) throw new Error("Choose a start month and 1 to 5 months.")
  const state = cohorts.map(c => ({ ...c, deaths: 0, start: c.fish }))
  const out: MortalityMonth[] = []
  let cumLow = 0, cumHigh = 0, cumExp = 0
  const startFish = cohorts.reduce((n, c) => n + c.fish, 0)
  const cum: MortalityOutlook["cumulative_pct"] = []
  for (let m = 0; m < months; m++) {
    const d = new Date(Date.UTC(Number(startMonth.slice(0, 4)), Number(startMonth.slice(5, 7)) - 1 + m, 1))
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0"), label = `${d.getUTCFullYear()}-${mm}`
    const season = MORTALITY_FIT.season[mm] ?? 1
    let total = 0, fishEnd = 0
    for (const c of state) {
      if (c.fish <= 0) continue
      const youngDays = Math.max(0, Math.min(30, 30 - c.ageDays)), oldDays = 30 - youngDays
      const h = (MORTALITY_FIT.youngPer30 * youngDays / 30 + olderRate(c.abwG) * oldDays / 30) * season
      const dead = c.fish * Math.min(h, 0.5)
      c.fish -= dead; c.deaths += dead; total += dead
      // Use the existing TB workbook growth model; there is no separate tb-model module.
      let w = c.abwG
      for (let i = 0; i < 30; i++) w *= 1 + workbookWeightRates(w).dailyGrowth
      c.abwG = w; c.ageDays += 30; fishEnd += c.fish
    }
    const r = months <= 3 ? MORTALITY_FIT.range3 : MORTALITY_FIT.range5
    cumExp += total; cumLow += total * r.low; cumHigh += total * r.high
    out.push({ month: label, deaths: total, low: total * r.low, high: total * r.high, fish_end: fishEnd })
    cum.push({ low: cumLow / startFish * 100, expected: cumExp / startFish * 100, high: cumHigh / startFish * 100 })
  }
  return { months: out, cumulative_pct: cum, start_fish: startFish, per_cohort: state.map(c => ({ key: c.key, deaths: c.deaths, survival_pct: c.start ? (1 - c.deaths / c.start) * 100 : 100 })) }
}
