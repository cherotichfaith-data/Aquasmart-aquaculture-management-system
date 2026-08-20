"use client"

import { useMemo } from "react"
import type { ChartData } from "chart.js"
import { Bar } from "@/components/charts/chartjs"
import { buildCartesianOptions, getChartPalette, withAlpha } from "@/components/charts/chartjs-theme"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { EmptyState } from "@/components/shared/data-states"
import { cageColor } from "@/features/systems/components/charts/chart-utils"
import type { BatchMortalityTotal } from "@/features/batches/types"

export default function MortalityByBatchChart({
  mortalityByBatch,
  batchLabels,
}: {
  mortalityByBatch: BatchMortalityTotal[]
  batchLabels: Record<number, string>
}) {
  const palette = getChartPalette()
  const sorted = useMemo(
    () => [...mortalityByBatch].sort((left, right) => right.total - left.total),
    [mortalityByBatch],
  )

  const data = useMemo<ChartData<"bar">>(
    () => ({
      labels: sorted.map((row) => batchLabels[row.batch_id] ?? `Batch #${row.batch_id}`),
      datasets: [
        {
          label: "Total mortalities",
          data: sorted.map((row) => row.total),
          backgroundColor: sorted.map((row) => withAlpha(cageColor(row.batch_id), 0.75)),
          borderRadius: 4,
        },
      ],
    }),
    [batchLabels, sorted],
  )

  if (sorted.length === 0 || sorted.every((row) => row.total === 0)) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-1">
          <CardTitle>Total Mortality by Batch</CardTitle>
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
        <CardTitle>Total Mortality by Batch</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[220px] sm:h-[260px]">
          <Bar
            data={data}
            options={buildCartesianOptions({
              palette,
              legend: false,
              yTitle: "Fish",
            })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
