import { calculateFeed, validDate } from "./feed-model"
import type { ForwardPlanRow } from "./types"

export type PlanningSource = {
  system_id: number; cage_name: string; batch_name: string; stock_no: number; stock_date: string
  abw_g: number | null; sampled_on: string | null; actual_feed_kg: number; actual_mortality: number
}
export type PlannedHarvest = { system_id: number; date: string; fish: number }
export type PlanningOptions = { month: string; months: number; asOf: string; plannedFish: number; plannedAbwG: number; stockingDay?: number; harvestWeightG?: number; harvests?: PlannedHarvest[] }
export const PELLETS = ["0.5–1 mm", "0.9–1.6 mm", "2 mm", "3 mm", "4 mm", "6 mm"] as const
export type CageProjection = { key: string; cage: string; batch: string; planned: boolean; start_fish: number; start_abw_g: number; end_fish: number; end_abw_g: number; feed_kg: number; deaths: number; harvest_fish: number; harvest_kg: number; pellets: number[] }
export type PlanningMonth = { summary: ForwardPlanRow; rows: CageProjection[] }
export type PlanningResult = { months: PlanningMonth[]; issues: string[]; warnings: string[] }
export const addDays = (day: string, n: number) => new Date(Date.parse(day) + n * 86400000).toISOString().slice(0, 10)
export const monthEnd = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10)
export const addMonths = (month: string, n: number) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + n, 1)).toISOString().slice(0, 10)
export function nairobiToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now)
  const value = (type: string) => parts.find(p => p.type === type)!.value
  return `${value("year")}-${value("month")}-${value("day")}`
}
const pellet = (abw: number) => abw <= 3 ? 0 : abw <= 12 ? 1 : abw <= 45 ? 2 : abw < 100 ? 3 : abw < 500 ? 4 : 5
// Keep the TB starting-phase rates fixed within each calendar month. Split its
// total feed by the projected daily weight, rather than using a second feed model.
function segment(fish: number, abw: number, start: string, end: string) {
  const result = calculateFeed(fish, abw, start, end)
  const pellets = Array<number>(6).fill(0)
  for (let d = 1; d <= result.days; d++) pellets[pellet(abw * Math.pow(1 + result.growth_pct / 100, d))] += result.feed_kg / result.days
  return { ...result, pellets }
}
function advance(fish: number, abw: number, from: string, through: string) {
  let day = from
  while (day <= through) {
    const end = monthEnd(day) < through ? monthEnd(day) : through
    const x = segment(fish, abw, day, end)
    fish = x.end_fish; abw = x.end_abw_g; day = addDays(end, 1)
    if (abw > 1000) throw new Error("Projected weight exceeds the TB model range. Review the sample or add a harvest.")
  }
  return { fish, abw }
}
export function buildFeedPlan(sources: PlanningSource[], options: PlanningOptions): PlanningResult {
  const { month, months, asOf, plannedFish, plannedAbwG } = options
  if (!validDate(month) || !month.endsWith("-01") || !validDate(asOf) || !Number.isInteger(months) || months < 1 || months > 24 || asOf > monthEnd(month)) throw new Error("Choose a valid planning month and source date.")
  if (!Number.isInteger(plannedFish) || plannedFish < 0 || plannedFish > 10000000 || !Number.isFinite(plannedAbwG) || plannedAbwG < .3 || plannedAbwG > 100) throw new Error("Check planned stocking: a whole fish count and weight from 0.3 to 100 g.")
  const target = options.harvestWeightG ?? 500
  if (!Number.isFinite(target) || target < 100 || target > 1000) throw new Error("Choose a harvest target from 100 to 1,000 g.")
  const stockingDay = options.stockingDay ?? 15
  if (!Number.isInteger(stockingDay) || stockingDay < 1 || stockingDay > 28) throw new Error("Choose a stocking day between 1 and 28.")
  const issues: string[] = [], warnings: string[] = []
  type Cohort = { key: string; system: number; cage: string; batch: string; fish: number; abw: number; day: string; planned: boolean }
  const cohorts: Cohort[] = []
  const ids = new Set<number>()
  for (const s of sources) {
    if (ids.has(s.system_id)) { issues.push(`${s.cage_name}: duplicate stock source.`); continue }
    ids.add(s.system_id)
    if (!Number.isInteger(s.stock_no) || s.stock_no < 0 || !validDate(s.stock_date) || s.stock_date > asOf) { issues.push(`${s.cage_name}: check the recorded fish count and stock date.`); continue }
    if (!s.stock_no) continue
    if (s.abw_g == null || !Number.isFinite(s.abw_g) || s.abw_g < .3 || s.abw_g > 1000 || !s.sampled_on || !validDate(s.sampled_on) || s.sampled_on > asOf) { issues.push(`${s.cage_name}: record a valid sampling weight before forecasting.`); continue }
    if ((Date.parse(asOf) - Date.parse(s.stock_date)) / 86400000 > 14) { issues.push(`${s.cage_name}: stock records are over 14 days old. Update production records.`); continue }
    if ((Date.parse(asOf) - Date.parse(s.sampled_on)) / 86400000 > 35) warnings.push(`${s.cage_name}: sampling is over 35 days old; the starting weight is projected.`)
    try {
      // Stock is already net of recorded mortality, transfers and harvests.
      // Only weight is projected from the measured date to the stock date.
      const measuredThrough = s.stock_date > s.sampled_on ? s.stock_date : s.sampled_on
      const weight = advance(0, s.abw_g, addDays(s.sampled_on, 1), measuredThrough).abw
      const start = advance(s.stock_no, weight, addDays(measuredThrough, 1), month > addDays(measuredThrough, 1) ? addDays(month, -1) : measuredThrough)
      cohorts.push({ key: String(s.system_id), system: s.system_id, cage: s.cage_name, batch: s.batch_name, fish: start.fish, abw: start.abw, day: month > addDays(measuredThrough, 1) ? month : addDays(measuredThrough, 1), planned: false })
    } catch (error) { issues.push(`${s.cage_name}: ${error instanceof Error ? error.message : "Check the source weight."}`) }
  }
  const harvests = options.harvests ?? []
  const seenHarvests = new Set<number>()
  for (const h of harvests) {
    if (!ids.has(h.system_id) || seenHarvests.has(h.system_id) || !validDate(h.date) || h.date <= asOf || h.date < month || h.date > monthEnd(addMonths(month, months - 1)) || !Number.isInteger(h.fish) || h.fish <= 0) issues.push("Check planned harvest dates, cages and whole fish counts.")
    seenHarvests.add(h.system_id)
  }
  const output: PlanningMonth[] = []
  for (let m = 0; m < months; m++) {
    const first = addMonths(month, m), last = monthEnd(first), rows: CageProjection[] = []
    const stockDate = `${first.slice(0, 7)}-${String(stockingDay).padStart(2, "0")}`
    // Do not add a forecast stocking that should already be in the actual records.
    const stocked = plannedFish > 0 && stockDate > asOf ? plannedFish : 0
    if (stocked) cohorts.push({ key: `stocking-${first}`, system: -m - 1, cage: "Planned stocking", batch: stockDate, fish: stocked, abw: plannedAbwG, day: stockDate, planned: true })
    for (const c of cohorts) {
      if (c.day > last || c.fish <= 0) continue
      const row: CageProjection = { key: c.key, cage: c.cage, batch: c.batch, planned: c.planned, start_fish: c.fish, start_abw_g: c.abw, end_fish: c.fish, end_abw_g: c.abw, feed_kg: 0, deaths: 0, harvest_fish: 0, harvest_kg: 0, pellets: Array<number>(6).fill(0) }
      let h = harvests.find(h => h.system_id === c.system && h.date >= c.day && h.date <= last)
      let automaticHarvest = false
      if (!h && !harvests.some(h => h.system_id === c.system && h.date >= c.day)) {
        const x = calculateFeed(c.fish, c.abw, c.day, last)
        if (x.end_abw_g >= target) {
          const days = c.abw >= target ? 0 : Math.ceil(Math.log(target / c.abw) / Math.log(1 + x.growth_pct / 100))
          h = { system_id: c.system, date: days === 0 ? c.day : addDays(c.day, days - 1), fish: c.fish }
          automaticHarvest = true
        }
      }
      const intervals = h ? [h.date, last].filter((day, i, all) => i === 0 || day !== all[0]) : [last]
      try {
        for (const end of intervals) {
          if (c.day <= end && c.fish > 0) {
            const x = segment(c.fish, c.abw, c.day, end)
            c.fish = x.end_fish; c.abw = x.end_abw_g; c.day = addDays(end, 1)
            row.feed_kg += x.feed_kg; row.deaths += x.deaths
            x.pellets.forEach((v, i) => row.pellets[i] += v)
          }
          if (h && end === h.date) {
            if (!automaticHarvest && h.fish > c.fish) issues.push(`${c.cage}: planned harvest exceeds projected surviving fish on ${h.date}.`)
            row.harvest_fish = automaticHarvest ? c.fish : Math.min(h.fish, c.fish); row.harvest_kg = row.harvest_fish * c.abw / 1000; c.fish -= row.harvest_fish
          }
        }
        row.end_fish = c.fish; row.end_abw_g = c.abw
        rows.push(row)
      } catch { issues.push(`${c.cage}: forecast exceeds the model range. Add a planned harvest or shorten the horizon.`) }
    }
    const sum = (fn: (r: CageProjection) => number) => rows.reduce((n, r) => n + fn(r), 0)
    const summary: ForwardPlanRow = { month_start: first, juvenile_stocking: stocked, harvest_fish: sum(r => r.harvest_fish), harvest_kg: sum(r => r.harvest_kg), biomass_end_kg: sum(r => r.end_fish * r.end_abw_g / 1000), total_feed_kg: sum(r => r.feed_kg), feed_0_5_1mm_kg: sum(r => r.pellets[0]), feed_0_9_1_6mm_kg: sum(r => r.pellets[1]), feed_2mm_kg: sum(r => r.pellets[2]), feed_3mm_kg: sum(r => r.pellets[3]), feed_4mm_kg: sum(r => r.pellets[4]), feed_6mm_kg: sum(r => r.pellets[5]) }
    output.push({ summary, rows })
  }
  return { months: output, issues: [...new Set(issues)], warnings: [...new Set(warnings)] }
}
