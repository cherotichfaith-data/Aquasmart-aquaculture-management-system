"use client"

import { useMemo } from "react"
import type { ChartData } from "chart.js"
import { Bar } from "@/components/charts/chartjs"
import { buildCartesianOptions, getChartPalette, withAlpha } from "@/components/charts/chartjs-theme"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { EmptyState } from "@/components/shared/data-states"
import type { DashboardSystemRow } from "@/features/dashboard/types"
import { cageColor } from "./chart-utils"

/** Same per-cage rows the Cage Status table's "Mortality" column reads
 * `mortality_rate` from (api_dashboard_systems, backend-computed) -- this
 * chart shows the same rate, not a separately-derived total/stocked ratio. */
export default function MortalityByCageChart({
  rows,
  systemLabels,
}: {
  rows: DashboardSystemRow[]
  systemLabels: Record<number, string>
}) {
  const palette = getChartPalette()
  const sorted = useMemo(
    () => [...rows].sort((left, right) => (right.mortality_rate ?? 0) - (left.mortality_rate ?? 0)),
    [rows],
  )

  const data = useMemo<ChartData<"bar">>(
    () => ({
      labels: sorted.map((row) => systemLabels[row.system_id] ?? `Cage ${row.system_id}`),
      datasets: [
        {
          label: "Mortality rate",
          data: sorted.map((row) => row.mortality_rate ?? 0),
          backgroundColor: sorted.map((row) => withAlpha(cageColor(row.system_id), 0.75)),
          borderRadius: 4,
        },
      ],
    }),
    [sorted, systemLabels],
  )

  if (sorted.length === 0 || sorted.every((row) => !row.mortality_rate)) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-1">
          <CardTitle>Mortality Rate by Cage</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <EmptyState title="No mortalities recorded" description="Nothing recorded for any cage in this period." />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-1">
        <CardTitle>Mortality Rate by Cage</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[220px] sm:h-[260px]">
          <Bar
            data={data}
            options={buildCartesianOptions({
              palette,
              legend: false,
              yTitle: "Mortality rate (%)",
              yTickFormatter: (value) => `${value}%`,
              tooltip: {
                callbacks: {
                  label: (context: { parsed: { y: number } }) => `${context.parsed.y.toFixed(2)}%`,
                },
              },
            })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
