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

export default function EfcrByPeriodChart({
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
  const efcrRows = useMemo(
    () =>
      growthSeries.filter(
        (row) => row.activity === "sampling" && row.efcr_period != null && Number.isFinite(row.efcr_period),
      ),
    [growthSeries],
  )
  const domain = useMemo(() => buildSharedDateDomain(efcrRows.map((row) => row.sample_date)), [efcrRows])

  const data = useMemo<ChartData<"line">>(() => {
    const bySystem = new Map<number, Map<string, number | null>>()
    for (const row of efcrRows) {
      if (!bySystem.has(row.system_id)) bySystem.set(row.system_id, new Map())
      bySystem.get(row.system_id)!.set(row.sample_date, row.efcr_period)
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
  }, [domain, efcrRows, systemLabels])

  if (domain.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-1">
          <CardTitle>eFCR by Period</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <EmptyState title="No eFCR data yet" description="eFCR appears once feeding and growth records exist for this period." />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-1">
        <CardTitle>eFCR by Period</CardTitle>
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
