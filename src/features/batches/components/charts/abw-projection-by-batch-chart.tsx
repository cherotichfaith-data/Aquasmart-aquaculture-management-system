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
} from "@/features/systems/components/charts/chart-utils"
import { aggregateGrowthByBatch, type BatchGrowthPoint } from "./batch-chart-utils"

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
 * Same technique as the Cages page's projection chart, applied to batch-level
 * points (aggregateGrowthByBatch) instead of per-cage rows -- a batch spread
 * across several cages projects as one line, not one per cage. The single
 * projected point sits at the farm's next expected sampling date (median gap
 * between each batch's own consecutive aggregated samples), extrapolating
 * each batch's latest combined growth rate forward -- real data, clearly an
 * estimate so it's rendered dashed.
 */
export default function AbwProjectionByBatchChart({
  growthSeries,
  systemIdToBatchId,
  batchLabels,
}: {
  growthSeries: GrowthTrendRow[]
  systemIdToBatchId: Record<number, number>
  batchLabels: Record<number, string>
}) {
  const palette = getChartPalette()
  const samplingRows = useMemo(() => growthSeries.filter((row) => row.activity === "sampling"), [growthSeries])
  const batchPoints = useMemo(
    () => aggregateGrowthByBatch(samplingRows, systemIdToBatchId),
    [samplingRows, systemIdToBatchId],
  )
  const historicalDomain = useMemo(
    () => buildSharedDateDomain(batchPoints.map((point) => point.sample_date)),
    [batchPoints],
  )
  const lastSampleDate = historicalDomain[historicalDomain.length - 1] ?? null
  const typicalIntervalDays = useMemo(() => {
    const datesByBatch = new Map<number, Set<string>>()
    for (const point of batchPoints) {
      if (!datesByBatch.has(point.batch_id)) datesByBatch.set(point.batch_id, new Set())
      datesByBatch.get(point.batch_id)!.add(point.sample_date)
    }
    const gaps: number[] = []
    for (const dates of datesByBatch.values()) {
      const sorted = Array.from(dates).sort()
      for (let i = 1; i < sorted.length; i += 1) {
        gaps.push(diffDays(sorted[i - 1], sorted[i]))
      }
    }
    return Math.round(median(gaps) ?? FALLBACK_INTERVAL_DAYS)
  }, [batchPoints])
  const nextSamplingDate = lastSampleDate ? addDays(lastSampleDate, typicalIntervalDays) : null
  const fullDomain = useMemo(
    () => (nextSamplingDate ? [...historicalDomain, nextSamplingDate] : historicalDomain),
    [historicalDomain, nextSamplingDate],
  )

  const data = useMemo<ChartData<"line">>(() => {
    const byBatch = new Map<number, BatchGrowthPoint[]>()
    for (const point of batchPoints) {
      if (point.abw_g == null) continue
      if (!byBatch.has(point.batch_id)) byBatch.set(point.batch_id, [])
      byBatch.get(point.batch_id)!.push(point)
    }

    return {
      labels: fullDomain,
      datasets: Array.from(byBatch.entries()).map(([batchId, points]) => {
        const sorted = [...points].sort((left, right) => left.sample_date.localeCompare(right.sample_date))
        const historicalByDate = new Map(sorted.map((point) => [point.sample_date, point.abw_g]))
        const latest = sorted[sorted.length - 1] ?? null
        const sgrPerDay = latest?.sgr_pct_day != null ? latest.sgr_pct_day / 100 : null

        let projectedAbw: number | null = null
        if (latest?.abw_g != null && sgrPerDay != null && nextSamplingDate) {
          const days = diffDays(latest.sample_date, nextSamplingDate)
          projectedAbw = latest.abw_g * Math.exp(sgrPerDay * days)
        }

        const color = cageColor(batchId)
        return {
          label: batchLabels[batchId] ?? `Batch #${batchId}`,
          data: fullDomain.map((date) => {
            if (historicalByDate.has(date)) return historicalByDate.get(date) ?? null
            return date === nextSamplingDate ? projectedAbw : null
          }),
          borderColor: color,
          backgroundColor: color,
          spanGaps: true,
          borderWidth: MULTI_LINE_STYLE.borderWidth,
          pointHoverRadius: MULTI_LINE_STYLE.pointHoverRadius,
          pointRadius: (ctx: { dataIndex: number }) =>
            ctx.dataIndex >= historicalDomain.length ? MULTI_LINE_STYLE.pointRadius + 1 : MULTI_LINE_STYLE.pointRadius,
          segment: {
            borderDash: (ctx: { p1DataIndex: number }) => (ctx.p1DataIndex >= historicalDomain.length ? [6, 4] : undefined),
          },
        }
      }),
    }
  }, [batchLabels, batchPoints, fullDomain, historicalDomain.length, nextSamplingDate])

  if (historicalDomain.length === 0 || !lastSampleDate) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-1">
          <CardTitle>ABW Projection — Next Sampling (estimated)</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <EmptyState
            title="Not enough growth history"
            description="A projection needs at least one recent growth sample per batch."
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
