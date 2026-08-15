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
} from "./chart-utils"

export default function AbwGrowthChart({
  growthSeries,
  systemLabels,
}: {
  growthSeries: GrowthTrendRow[]
  systemLabels: Record<number, string>
}) {
  const palette = getChartPalette()
  // Only real weighing events -- api_production_summary also emits 'stocking',
  // 'transfer', and a carried-forward 'current' row for today, none of which
  // are an actual sample.
  const samplingRows = useMemo(() => growthSeries.filter((row) => row.activity === "sampling"), [growthSeries])
  const domain = useMemo(() => buildSharedDateDomain(samplingRows.map((row) => row.sample_date)), [samplingRows])

  const data = useMemo<ChartData<"line">>(() => {
    const bySystem = new Map<number, Map<string, number | null>>()
    for (const row of samplingRows) {
      if (!bySystem.has(row.system_id)) bySystem.set(row.system_id, new Map())
      bySystem.get(row.system_id)!.set(row.sample_date, row.abw_g)
    }

    return {
      labels: domain,
      datasets: Array.from(bySystem.entries()).map(([systemId, pointsByDate]) => ({
        label: systemLabels[systemId] ?? `Cage ${systemId}`,
        data: domain.map((date) => pointsByDate.get(date) ?? null),
        borderColor: cageColor(systemId),
        backgroundColor: cageColor(systemId),
        spanGaps: true,
        ...MULTI_LINE_STYLE,
      })),
    }
  }, [domain, samplingRows, systemLabels])

  if (domain.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-1">
          <CardTitle>ABW Growth — All Cages</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <EmptyState title="No growth samples yet" description="Growth data will appear once cages have samples in this period." />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-1">
        <CardTitle>ABW Growth — All Cages</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[260px]">
          <Line
            data={data}
            options={withRotatedDateAxis(
              withPerLineTooltip(
                buildCartesianOptions({
                  palette,
                  legend: false,
                  yTitle: "ABW (g)",
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
