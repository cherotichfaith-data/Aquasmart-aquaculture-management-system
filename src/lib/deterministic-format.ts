const STABLE_LOCALE = "en-US"
const STABLE_TIME_ZONE = "UTC"

export function formatStableDate(value: string | number | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(STABLE_LOCALE, {
    timeZone: STABLE_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(new Date(value))
}

export function formatStableDateTime(value: string | number | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(STABLE_LOCALE, {
    timeZone: STABLE_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(new Date(value))
}

export function formatStableNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(STABLE_LOCALE, options).format(value)
}

export function getUtcDateInput(value = new Date()) {
  return value.toISOString().slice(0, 10)
}

export function getUtcDateInputDaysAgo(days: number, value = new Date()) {
  const base = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
  base.setUTCDate(base.getUTCDate() - days)
  return getUtcDateInput(base)
}
