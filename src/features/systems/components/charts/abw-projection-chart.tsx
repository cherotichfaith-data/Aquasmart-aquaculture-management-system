"use client"

import { useMemo } from "react"
import type { ChartData } from "chart.js"
import { Line } from "@/components/charts/chartjs"
import { buildCartesianOptions, getChartPalette } from "@/components/charts/chartjs-theme"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { EmptyState } from "@/components/shared/data-states"
import type { GrowthTrendRow } from "@/features/shared/queries.server"
import { median } from "@/features/dashboard/lib/table-cells"
import {
  MULTI_LINE_STYLE,
  buildShortDateTickFormatter,
  buildSharedDateDomain,
  cageColor,
  withPerLineTooltip,
  withRotatedDateAxis,
} from "./chart-utils"

/** Used only when there's no real interval to learn from yet (a single sample so far). */
const FALLBACK_INTERVAL_DAYS = 30

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function diffDays(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number)
  const [ty, tm, td] = to.split("-").map(Number)
  const a = Date.UTC(fy, (fm ?? 1) - 1, fd ?? 1)
  const b = Date.UTC(ty, (tm ?? 1) - 1, td ?? 1)
  return Math.round((b - a) / 86_400_000)
}

/**
 * Historical points are real sampling days only (no filled-in calendar dates).
 * The single projected point sits at the farm's next *expected* sampling date --
 * the last sample date plus the farm's own typical interval between samples
 * (median gap across all recorded sample dates), not a fixed 30/60/90-day grid.
 * If the farm samples around the same day each month, this naturally lands
 * there. Each cage's projected ABW still comes from extrapolating that cage's
 * own latest observed growth rate (SGR) out to that shared date -- real data,
 * not invented, but clearly an estimate so it's rendered dashed.
 */
export default function AbwProjectionChart({
  growthSeries,
  systemLabels,
}: {
  growthSeries: GrowthTrendRow[]
  systemLabels: Record<number, string>
}) {
  const palette = getChartPalette()
  // Only real weighing events -- api_production_summary also emits 'stocking',
  // 'transfer', and a carried-forward 'current' row for today, none of which
  // are an actual sample. The projection should extrapolate from real data too.
  const samplingRows = useMemo(() => growthSeries.filter((row) => row.activity === "sampling"), [growthSeries])
  const historicalDomain = useMemo(
    () => buildSharedDateDomain(samplingRows.map((row) => row.sample_date)),
    [samplingRows],
  )
  const lastSampleDate = historicalDomain[historicalDomain.length - 1] ?? null
  // The interval must come from each cage's OWN consecutive samples, not gaps
  // in the farm-wide merged date list -- with many cages sampling on staggered
  // days, that union is densely packed (gaps of a few days) even though every
  // individual cage only samples about once a month.
  const typicalIntervalDays = useMemo(() => {
    const datesBySystem = new Map<number, Set<string>>()
    for (const row of samplingRows) {
      if (!datesBySystem.has(row.system_id)) datesBySystem.set(row.system_id, new Set())
      datesBySystem.get(row.system_id)!.add(row.sample_date)
    }
    const gaps: number[] = []
    for (const dates of datesBySystem.values()) {
      const sorted = Array.from(dates).sort()
      for (let i = 1; i < sorted.length; i += 1) {
        gaps.push(diffDays(sorted[i - 1], sorted[i]))
      }
    }
    return Math.round(median(gaps) ?? FALLBACK_INTERVAL_DAYS)
  }, [samplingRows])
  const nextSamplingDate = lastSampleDate ? addDays(lastSampleDate, typicalIntervalDays) : null
  const fullDomain = useMemo(
    () => (nextSamplingDate ? [...historicalDomain, nextSamplingDate] : historicalDomain),
    [historicalDomain, nextSamplingDate],
  )

  const data = useMemo<ChartData<"line">>(() => {
    const bySystem = new Map<number, GrowthTrendRow[]>()
    for (const row of samplingRows) {
      if (row.abw_g == null) continue
      if (!bySystem.has(row.system_id)) bySystem.set(row.system_id, [])
      bySystem.get(row.system_id)!.push(row)
    }

    return {
      labels: fullDomain,
      datasets: Array.from(bySystem.entries()).map(([systemId, rows]) => {
        const sorted = [...rows].sort((left, right) => left.sample_date.localeCompare(right.sample_date))
        const historicalByDate = new Map(sorted.map((row) => [row.sample_date, row.abw_g]))
        const latest = sorted[sorted.length - 1] ?? null
        const sgrPerDay = latest?.sgr_pct_day != null ? latest.sgr_pct_day / 100 : null

        let projectedAbw: number | null = null
        if (latest?.abw_g != null && sgrPerDay != null && nextSamplingDate) {
          const days = diffDays(latest.sample_date, nextSamplingDate)
          projectedAbw = latest.abw_g * Math.exp(sgrPerDay * days)
        }

        const color = cageColor(systemId)
        return {
          label: systemLabels[systemId] ?? `Cage ${systemId}`,
          data: fullDomain.map((date) => {
            if (historicalByDate.has(date)) return historicalByDate.get(date) ?? null
            return date === nextSamplingDate ? projectedAbw : null
          }),
          borderColor: color,
          backgroundColor: color,
          spanGaps: true,
          borderWidth: MULTI_LINE_STYLE.borderWidth,
          pointHoverRadius: MULTI_LINE_STYLE.pointHoverRadius,
          // The projected point sits a touch larger than the historical ones so
          // it still reads as the estimate anchor at this smaller line weight.
          pointRadius: (ctx: { dataIndex: number }) =>
            ctx.dataIndex >= historicalDomain.length ? MULTI_LINE_STYLE.pointRadius + 1 : MULTI_LINE_STYLE.pointRadius,
          segment: {
            borderDash: (ctx: { p1DataIndex: number }) => (ctx.p1DataIndex >= historicalDomain.length ? [6, 4] : undefined),
          },
        }
      }),
    }
  }, [fullDomain, samplingRows, historicalDomain.length, nextSamplingDate, systemLabels])

  if (historicalDomain.length === 0 || !lastSampleDate) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-1">
          <CardTitle>ABW Projection — Next Sampling (estimated)</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <EmptyState
            title="Not enough growth history"
            description="A projection needs at least one recent growth sample per cage."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-1">
        <CardTitle>ABW Projection — Next Sampling (estimated)</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[220px] sm:h-[260px]">
          <Line
            data={data}
            options={withRotatedDateAxis(
              withPerLineTooltip(
                buildCartesianOptions({
                  palette,
                  legend: false,
                  yTitle: "ABW (g)",
                  xMaxTicksLimit: 10,
                  xTickFormatter: buildShortDateTickFormatter(fullDomain),
                }),
              ),
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}
