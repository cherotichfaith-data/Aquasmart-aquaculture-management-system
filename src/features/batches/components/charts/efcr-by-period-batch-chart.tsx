"use client"

import { useMemo } from "react"
import type { ChartData } from "chart.js"
import { Line } from "@/components/charts/chartjs"
import { buildCartesianOptions, getChartPalette } from "@/components/charts/chartjs-theme"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { EmptyState } from "@/components/shared/data-states"
import type { GrowthTrendRow } from "@/features/shared/queries.server"
import {
  MULTI_LINE_STYLE,
  buildShortDateTickFormatter,
  buildSharedDateDomain,
  cageColor,
  withPerLineTooltip,
  withRotatedDateAxis,
} from "@/features/systems/components/charts/chart-utils"
import { aggregateGrowthByBatch } from "./batch-chart-utils"

export default function EfcrByPeriodBatchChart({
  growthSeries,
  systemIdToBatchId,
  batchLabels,
}: {
  growthSeries: GrowthTrendRow[]
  systemIdToBatchId: Record<number, number>
  batchLabels: Record<number, string>
}) {
  const palette = getChartPalette()
  // Only real weighing events -- api_production_summary also emits 'stocking',
  // 'transfer', and a carried-forward 'current' row for today, none of which
  // are an actual sample.
  const samplingRows = useMemo(() => growthSeries.filter((row) => row.activity === "sampling"), [growthSeries])
  const points = useMemo(
    () =>
      aggregateGrowthByBatch(samplingRows, systemIdToBatchId).filter(
        (point) => point.efcr_period != null && Number.isFinite(point.efcr_period),
      ),
    [samplingRows, systemIdToBatchId],
  )
  const domain = useMemo(() => buildSharedDateDomain(points.map((point) => point.sample_date)), [points])

  const data = useMemo<ChartData<"line">>(() => {
    const byBatch = new Map<number, Map<string, number | null>>()
    for (const point of points) {
      if (!byBatch.has(point.batch_id)) byBatch.set(point.batch_id, new Map())
      byBatch.get(point.batch_id)!.set(point.sample_date, point.efcr_period)
    }

    return {
      labels: domain,
      datasets: Array.from(byBatch.entries()).map(([batchId, pointsByDate]) => ({
        label: batchLabels[batchId] ?? `Batch #${batchId}`,
        data: domain.map((date) => pointsByDate.get(date) ?? null),
        borderColor: cageColor(batchId),
        backgroundColor: cageColor(batchId),
        spanGaps: true,
        ...MULTI_LINE_STYLE,
      })),
    }
  }, [batchLabels, domain, points])

  if (domain.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-1">
          <CardTitle>eFCR by Period — By Batch</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <EmptyState title="No eFCR data yet" description="eFCR appears once feeding and growth records exist." />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-1">
        <CardTitle>eFCR by Period — By Batch</CardTitle>
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
                  yTitle: "eFCR",
                  xMaxTicksLimit: 10,
                  xTickFormatter: buildShortDateTickFormatter(domain),
                }),
              ),
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}
