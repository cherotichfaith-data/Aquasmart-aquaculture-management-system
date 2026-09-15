"use client"

import { useMemo } from "react"
import type { ChartData } from "chart.js"
import { Bar } from "@/components/charts/chartjs"
import { buildCartesianOptions, getChartPalette, withAlpha } from "@/components/charts/chartjs-theme"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { EmptyState } from "@/components/shared/data-states"
import { cageColor } from "@/features/systems/components/charts/chart-utils"
import type { DashboardBatchRpcRow } from "@/features/batches/types"

/** Same per-batch rows the lineage table's "Mortality" column reads
 * `mortality_rate` from (api_dashboard_batches, backend-computed) -- this
 * chart shows the same rate, not a separately-derived total/stocked ratio. */
export default function MortalityByBatchChart({
  rows,
  batchLabels,
}: {
  rows: DashboardBatchRpcRow[]
  batchLabels: Record<number, string>
}) {
  const palette = getChartPalette()
  const sorted = useMemo(
    () => [...rows].sort((left, right) => (right.mortality_rate ?? 0) - (left.mortality_rate ?? 0)),
    [rows],
  )

  const data = useMemo<ChartData<"bar">>(
    () => ({
      labels: sorted.map((row) => batchLabels[row.batch_id] ?? `Batch #${row.batch_id}`),
      datasets: [
        {
          label: "Mortality rate",
          data: sorted.map((row) => row.mortality_rate ?? 0),
          backgroundColor: sorted.map((row) => withAlpha(cageColor(row.batch_id), 0.75)),
          borderRadius: 4,
        },
      ],
    }),
    [batchLabels, sorted],
  )

  if (sorted.length === 0 || sorted.every((row) => !row.mortality_rate)) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-1">
          <CardTitle>Mortality Rate by Batch</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <EmptyState title="No mortalities recorded" description="Nothing recorded for any batch in this period." />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-1">
        <CardTitle>Mortality Rate by Batch</CardTitle>
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
