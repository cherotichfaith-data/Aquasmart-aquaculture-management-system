"use client"

import { useMemo } from "react"
import type { ChartData } from "chart.js"
import { Chart } from "@/components/charts/chartjs"
import { buildCartesianOptions, getChartPalette, withAlpha } from "@/components/charts/chartjs-theme"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { EmptyState } from "@/components/shared/data-states"
import type { WaterQualityMonthlyPoint } from "@/features/systems/types"

export default function WaterQualityMonthlyChart({ points }: { points: WaterQualityMonthlyPoint[] }) {
  const palette = getChartPalette()

  const data = useMemo<ChartData<"bar" | "line">>(
    () => ({
      labels: points.map((point) => point.month),
      datasets: [
        {
          type: "bar" as const,
          label: "Temperature (°C)",
          data: points.map((point) => point.tempAvg),
          backgroundColor: withAlpha(palette.chart2, 0.6),
          borderRadius: 4,
          yAxisID: "y",
        },
        {
          type: "line" as const,
          label: "Dissolved O₂ (mg/L)",
          data: points.map((point) => point.doAvg),
          borderColor: palette.chart3,
          backgroundColor: palette.chart3,
          yAxisID: "y1",
          spanGaps: true,
          pointRadius: 4,
        },
      ],
    }),
    [palette.chart2, palette.chart3, points],
  )

  if (points.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-1">
          <CardTitle>Water Quality — Monthly Averages</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <EmptyState title="No water quality readings" description="Averages appear once measurements are logged for this period." />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-1">
        <CardTitle>Water Quality — Monthly Averages</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[220px] sm:h-[260px]">
          <Chart
            type="bar"
            data={data}
            options={buildCartesianOptions({
              palette,
              legend: true,
              yTitle: "Temp (°C)",
              yRightTitle: "DO (mg/L)",
            })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
