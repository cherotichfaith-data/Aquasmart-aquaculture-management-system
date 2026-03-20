type NumberFormatOptions = {
  decimals?: number
  minimumDecimals?: number
  fallback?: string
}

const parseDateInput = (value: string | number, dateOnly: boolean) => {
  const raw = String(value)
  const parsed =
    dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(`${raw}T00:00:00`)
      : new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const formatChartDate = (
  value: string | number,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
) => {
  const parsed = parseDateInput(value, false)
  if (!parsed) return String(value)
  return new Intl.DateTimeFormat(undefined, options).format(parsed)
}

export const formatDateOnly = (
  value: string | null | undefined,
  fallback = "--",
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
) => {
  if (!value) return fallback
  const parsed = parseDateInput(value, true)
  if (!parsed) return value
  return new Intl.DateTimeFormat(undefined, options).format(parsed)
}

export const formatDateTimeValue = (value: string | null | undefined, fallback = "--") => {
  if (!value) return fallback
  const parsed = parseDateInput(value, false)
  if (!parsed) return value
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}

export const formatNumberValue = (
  value: number | null | undefined,
  options: NumberFormatOptions = {},
) => {
  const { decimals = 0, minimumDecimals = 0, fallback = "--" } = options
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return fallback
  return value.toLocaleString(undefined, {
    minimumFractionDigits: minimumDecimals,
    maximumFractionDigits: decimals,
  })
}

export const formatUnitValue = (
  value: number | null | undefined,
  decimals: number,
  unit: string,
  fallback = "--",
) => {
  const base = formatNumberValue(value, { decimals, fallback })
  return base === fallback ? fallback : `${base} ${unit}`
}

export const formatRateValue = (
  value: number | null | undefined,
  decimals = 4,
  unit = "rate/day",
  fallback = "--",
) => {
  const base = formatNumberValue(value, { decimals, fallback })
  return base === fallback ? fallback : `${base} ${unit}`
}

export const formatAsOfDate = (value: string | null | undefined) =>
  value ? formatDateOnly(value, value, { year: "numeric", month: "short", day: "2-digit" }) : null

export const formatCompactDate = (value: string) =>
  formatDateOnly(value, value, { month: "short", day: "numeric" })

export const formatProductionPeriod = (
  start: string | null | undefined,
  end: string | null | undefined,
  ongoing = false,
) => {
  if (!start && !end) return null
  const formattedStart = formatAsOfDate(start)
  const formattedEnd = formatAsOfDate(end)
  if (formattedStart && formattedEnd) {
    return formattedStart === formattedEnd ? formattedStart : `${formattedStart} to ${formattedEnd}`
  }
  if (formattedStart && ongoing) return `${formattedStart} to Ongoing`
  return formattedStart ?? formattedEnd
}

export const timelineSourceLabel = (source: string | null | undefined) => {
  if (source === "cycle_closed") return "Cycle"
  if (source === "cycle_ongoing") return "Cycle"
  if (source === "planned_cycle") return "Planned cycle"
  if (source === "observed_activity") return "Observed activity"
  return null
}
