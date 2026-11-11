export type MeasuredInterval = {
  batch_id: number
  cycle_id: number
  system_id: number
  date: string
  previous_date: string
  previous_fish: number
  previous_biomass: number
  feed: number
  gain: number
}

export function summarizeMeasuredIntervals(intervals: MeasuredInterval[]) {
  if (!intervals.length) return { feedKg: null, growthKg: null, efcr: null }
  const feedKg = intervals.reduce((sum, row) => sum + row.feed, 0)
  const growthKg = intervals.reduce((sum, row) => sum + row.gain, 0)
  return { feedKg, growthKg, efcr: growthKg > 0 && feedKg >= 0 ? feedKg / growthKg : null }
}
