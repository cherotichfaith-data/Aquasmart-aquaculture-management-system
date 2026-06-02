import type { SystemTimelineBoundsRow } from "@/lib/api/system-timeline"

export type WindowedSystemTimeline = {
  periodSource: string | null
  fullStart: string | null
  fullEnd: string | null
  displayStart: string | null
  displayEnd: string | null
  queryStart: string | null
  queryEnd: string | null
  snapshotAsOf: string | null
  hasTimeline: boolean
  hasDataInWindow: boolean
}

const maxDate = (...values: Array<string | null | undefined>) => {
  const dates = values.filter((value): value is string => typeof value === "string" && value.length > 0)
  if (!dates.length) return null
  return dates.reduce((latest, current) => (current > latest ? current : latest))
}

const minDate = (...values: Array<string | null | undefined>) => {
  const dates = values.filter((value): value is string => typeof value === "string" && value.length > 0)
  if (!dates.length) return null
  return dates.reduce((earliest, current) => (current < earliest ? current : earliest))
}

const hasDateRangeOverlap = (start: string | null, end: string | null) => {
  if (!start) return false
  if (!end) return true
  return start <= end
}

export function resolveSystemTimelineWindow(
  row: SystemTimelineBoundsRow | null | undefined,
  params?: {
    windowStart?: string | null
    windowEnd?: string | null
  },
): WindowedSystemTimeline | null {
  if (!row) return null

  const fullStart = row.resolved_start ?? row.first_stocking_date ?? row.first_activity_date ?? row.configured_cycle_start ?? null
  const fullEnd = row.resolved_end ?? row.final_harvest_date ?? row.last_activity_date ?? row.configured_cycle_end ?? null
  const windowStart = params?.windowStart ?? null
  const windowEnd = params?.windowEnd ?? null

  const displayStart = maxDate(fullStart, windowStart)
  const displayEnd = minDate(fullEnd, windowEnd) ?? (fullEnd ?? null)
  const queryStart = maxDate(fullStart, windowStart)
  const queryEnd = windowEnd ?? fullEnd ?? null
  const hasTimeline = Boolean(fullStart)
  const hasDataInWindow = hasTimeline && hasDateRangeOverlap(displayStart, displayEnd)

  return {
    periodSource: row.period_source ?? null,
    fullStart,
    fullEnd,
    displayStart: hasDataInWindow ? displayStart : null,
    displayEnd: hasDataInWindow ? displayEnd : null,
    queryStart: hasDataInWindow ? queryStart : null,
    queryEnd: hasDataInWindow ? queryEnd : null,
    snapshotAsOf: row.snapshot_as_of ?? null,
    hasTimeline,
    hasDataInWindow,
  }
}
