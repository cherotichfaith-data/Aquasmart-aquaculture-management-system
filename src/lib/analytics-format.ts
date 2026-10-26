type NumberFormatOptions = {
  decimals?: number
  minimumDecimals?: number
  fallback?: string
}

const STABLE_LOCALE = "en-US"
const STABLE_TIME_ZONE = "UTC"

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

export const formatStableDateTime = (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(STABLE_LOCALE, {
    timeZone: STABLE_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(new Date(value))

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

const scaleFractionToPercent = (value: number | null | undefined) =>
  value == null || Number.isNaN(value) || !Number.isFinite(value) ? null : value * 100

export const formatPercentRateValue = (
  value: number | null | undefined,
  decimals: number,
  unit: string,
  fallback = "--",
) => {
  const scaled = scaleFractionToPercent(value)
  return formatUnitValue(scaled, decimals, unit, fallback)
}

export const formatAsOfDate = (value: string | null | undefined) =>
  value ? formatDateOnly(value, value, { year: "numeric", month: "short", day: "2-digit" }) : null

export const formatCompactDate = (value: string) =>
  formatDateOnly(value, value, { month: "short", day: "numeric" })

