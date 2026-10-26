export type AnalyticsPeriod = {
  from: string
  to: string
  month: string
  mode: "month" | "cycle"
}

/** Calendar reporting uses the farm's day, never a rolling 30-day window. */
export function parseAnalyticsPeriod(
  params: Record<string, string | string[] | undefined>,
  today = new Date(),
): AnalyticsPeriod {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(today)
  const part = (type: string) => parts.find(p => p.type === type)!.value
  const currentDay = `${part("year")}-${part("month")}-${part("day")}`
  const currentMonth = currentDay.slice(0, 7)
  // Old custom links open the calendar month containing their end date.
  const requested = typeof params.month === "string" ? params.month
    : typeof params.to === "string" ? params.to.slice(0, 7) : currentMonth
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) && requested <= currentMonth
    ? requested : currentMonth
  const [year, monthNumber] = month.split("-").map(Number)
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`
  return {
    from: `${month}-01`,
    to: monthEnd < currentDay ? monthEnd : currentDay,
    month: `${month}-01`,
    mode: params.period === "cycle" ? "cycle" : "month",
  }
}
