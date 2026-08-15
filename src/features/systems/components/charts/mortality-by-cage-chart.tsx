"use client"

import { useMemo } from "react"
import type { ChartData } from "chart.js"
import { Bar } from "@/components/charts/chartjs"
import { buildCartesianOptions, getChartPalette, withAlpha } from "@/components/charts/chartjs-theme"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { EmptyState } from "@/components/shared/data-states"
import type { CageMortalityTotal } from "@/features/systems/types"
import { cageColor } from "./chart-utils"

export default function MortalityByCageChart({
  mortalityByCage,
  systemLabels,
}: {
  mortalityByCage: CageMortalityTotal[]
  systemLabels: Record<number, string>
}) {
  const palette = getChartPalette()
  const sorted = useMemo(() => [...mortalityByCage].sort((left, right) => right.total - left.total), [mortalityByCage])

  const data = useMemo<ChartData<"bar">>(
    () => ({
      labels: sorted.map((row) => systemLabels[row.system_id] ?? `Cage ${row.system_id}`),
      datasets: [
        {
          label: "Total mortalities",
          data: sorted.map((row) => row.total),
          backgroundColor: sorted.map((row) => withAlpha(cageColor(row.system_id), 0.75)),
          borderRadius: 4,
        },
      ],
    }),
    [sorted, systemLabels],
  )

  if (sorted.length === 0 || sorted.every((row) => row.total === 0)) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-1">
          <CardTitle>Total Mortality by Cage</CardTitle>
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
        <CardTitle>Total Mortality by Cage</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[260px]">
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
