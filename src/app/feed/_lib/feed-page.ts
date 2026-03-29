"use client"

import { formatFeedDayLabel, type FeedRatePoint } from "./feed-analytics"
import type { FeedExceptionItem } from "./feed-sections"
import type { FeedRunningStockRow } from "@/lib/api/reports"

export const buildDateWindow = (startDate: string, endDate: string, maxDays = 30) => {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return []
  const dates: string[] = []
  const cursor = new Date(end)
  while (cursor >= start && dates.length < maxDays) {
    dates.unshift(cursor.toISOString().split("T")[0])
    cursor.setDate(cursor.getDate() - 1)
  }
  return dates
}

export const formatFeedTypeLabel = (feedType: {
  id?: number | null
  feed_line?: string | null
  feed_pellet_size?: string | null
  crude_protein_percentage?: number | null
  label?: string | null
}) => {
  const parts = [
    feedType.feed_line,
    feedType.feed_pellet_size,
    feedType.crude_protein_percentage != null ? `CP ${feedType.crude_protein_percentage}%` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(" | ") : feedType.label ?? `Feed ${feedType.id ?? "N/A"}`
}

export const formatMetricNumber = (value: number | null | undefined, decimals = 1) =>
  value == null || Number.isNaN(value)
    ? "N/A"
    : value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })

export function buildLatestFeedRateBySystem(feedRatePoints: FeedRatePoint[]) {
  const latest = new Map<number, FeedRatePoint>()
  feedRatePoints
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .forEach((point) => {
      if (!latest.has(point.systemId)) latest.set(point.systemId, point)
    })
  return latest
}

export function buildLatestRowBySystem<T extends { system_id: number }>(
  rows: T[],
  getDateValue: (row: T) => string,
) {
  const latest = new Map<number, T>()
  rows
    .slice()
    .sort((a, b) => getDateValue(b).localeCompare(getDateValue(a)))
    .forEach((row) => {
      if (!latest.has(row.system_id)) latest.set(row.system_id, row)
    })
  return latest
}

export function buildLatestDoBySystem(
  measurements: Array<{ system_id: number | null; date: string | null; parameter_value: number | null; created_at?: string | null }>,
) {
  const latest = new Map<number, { date: string; value: number }>()
  measurements
    .slice()
    .sort((a, b) => {
      const aStamp = String(a.created_at ?? a.date ?? "")
      const bStamp = String(b.created_at ?? b.date ?? "")
      return bStamp.localeCompare(aStamp)
    })
    .forEach((row) => {
      if (row.system_id == null || row.date == null || row.parameter_value == null) return
      if (!latest.has(row.system_id)) {
        latest.set(row.system_id, { date: row.date, value: row.parameter_value })
      }
    })
  return latest
}

export function buildFeedExceptionItems(params: {
  latestDoBySystem: Map<number, { date: string; value: number }>
  latestFeedRateBySystem: Map<number, FeedRatePoint>
  latestGrowthBySystem: Map<number, { system_id: number; sample_date: string; sgr_pct_day: number }>
  latestSurvivalBySystem: Map<number, { system_id: number; event_date: string; survival_pct: number | null }>
  poorAlerts: Array<{ systemId: number; date: string; message: string }>
  runningStockRows: FeedRunningStockRow[]
  systemNameById: Map<number, string>
  lowDoThreshold?: number | null
}) {
  const items: FeedExceptionItem[] = []
  const lowDoThreshold = params.lowDoThreshold ?? 5

  Array.from(params.latestFeedRateBySystem.values())
    .filter((point) => point.feedRatePct != null && (point.upperBand != null || point.lowerBand != null))
    .forEach((point) => {
      const systemLabel = params.systemNameById.get(point.systemId) ?? `System ${point.systemId}`
      if (point.upperBand != null && point.feedRatePct != null && point.feedRatePct > point.upperBand) {
        items.push({
          id: `feed-rate-above-${point.systemId}`,
          severity: point.feedRatePct > point.upperBand * 1.15 ? "critical" : "warning",
          title: `${systemLabel} above target`,
          detail: `${point.feedRatePct.toFixed(2)}% vs target ${point.upperBand.toFixed(1)}% on ${point.label}.`,
          systemId: point.systemId,
        })
      } else if (point.lowerBand != null && point.feedRatePct != null && point.feedRatePct < point.lowerBand) {
        items.push({
          id: `feed-rate-below-${point.systemId}`,
          severity: "warning",
          title: `${systemLabel} below target`,
          detail: `${point.feedRatePct.toFixed(2)}% vs target ${point.lowerBand.toFixed(1)}% on ${point.label}.`,
          systemId: point.systemId,
        })
      }
    })

  params.poorAlerts.slice(0, 4).forEach((alert) => {
    items.push({
      id: `poor-${alert.systemId}-${alert.date}`,
      severity: "warning",
      title: params.systemNameById.get(alert.systemId) ?? `System ${alert.systemId}`,
      detail: alert.message,
      systemId: alert.systemId,
    })
  })

  Array.from(params.latestGrowthBySystem.values())
    .filter((row) => row.sgr_pct_day < 0.7)
    .forEach((row) => {
      items.push({
        id: `growth-${row.system_id}`,
        severity: "warning",
        title: `${params.systemNameById.get(row.system_id) ?? `System ${row.system_id}`} low growth`,
        detail: `SGR ${row.sgr_pct_day.toFixed(2)}%/day on ${formatFeedDayLabel(row.sample_date)}.`,
        systemId: row.system_id,
      })
    })

  Array.from(params.latestSurvivalBySystem.values())
    .filter((row) => row.survival_pct != null && row.survival_pct < 95)
    .forEach((row) => {
      const survivalPct = row.survival_pct
      if (survivalPct == null) return
      items.push({
        id: `survival-${row.system_id}`,
        severity: survivalPct < 90 ? "critical" : "warning",
        title: `${params.systemNameById.get(row.system_id) ?? `System ${row.system_id}`} survival risk`,
        detail: `Survival ${survivalPct.toFixed(1)}% on ${formatFeedDayLabel(row.event_date)}.`,
        systemId: row.system_id,
      })
    })

  Array.from(params.latestDoBySystem.entries()).forEach(([systemId, reading]) => {
    if (reading.value >= lowDoThreshold) return
    items.push({
      id: `do-${systemId}`,
      severity: reading.value < lowDoThreshold - 1 ? "critical" : "warning",
      title: `${params.systemNameById.get(systemId) ?? `System ${systemId}`} low DO`,
      detail: `DO ${reading.value.toFixed(1)} mg/L on ${formatFeedDayLabel(reading.date)}.`,
      systemId,
    })
  })

  params.runningStockRows
    .filter((row) => (row.days_remaining ?? 999) < 30)
    .sort((a, b) => (a.days_remaining ?? 999) - (b.days_remaining ?? 999))
    .slice(0, 3)
    .forEach((row) => {
      items.push({
        id: `stock-${row.feed_type_name}`,
        severity: (row.days_remaining ?? 999) < 14 ? "critical" : "warning",
        title: `${row.feed_type_name} stock cover`,
        detail: `${formatMetricNumber(row.days_remaining, 0)} days remaining at ${formatMetricNumber(row.avg_daily_usage_kg, 1)} kg/day.`,
      })
    })

  const severityRank = { critical: 0, warning: 1, info: 2 } as const
  return items
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.title.localeCompare(b.title))
    .slice(0, 10)
}
