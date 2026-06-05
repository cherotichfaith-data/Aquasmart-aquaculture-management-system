"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Layers } from "lucide-react"
import { Scatter } from "@/components/charts/chartjs"
import { getChartPalette, buildCartesianOptions } from "@/components/charts/chartjs-theme"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/app-ui/select"
import { formatTimestamp } from "../_lib/water-quality-utils"
import type { DepthProfileRow } from "../_lib/water-quality-selectors"

export function WaterQualityDepthTab({
  selectedDepthProfileDate,
  onSelectDepthProfileDate,
  depthDates,
  isAllSystemsSelected,
  depthProfileData,
  depthProfileDoData,
  depthProfileTempData,
}: {
  selectedDepthProfileDate: string | null
  onSelectDepthProfileDate: (value: string) => void
  depthDates: string[]
  isAllSystemsSelected: boolean
  depthProfileData: DepthProfileRow[]
  depthProfileDoData: Array<DepthProfileRow & { dissolvedOxygen: number }>
  depthProfileTempData: Array<DepthProfileRow & { temperature: number }>
}) {
  const palette = getChartPalette()

  const scatterData = useMemo<ChartData<"scatter">>(
    () => ({
      datasets: [
        {
          label: "DO (mg/L)",
          data: depthProfileDoData.map((row) => ({ x: row.dissolvedOxygen, y: row.depth })),
          backgroundColor: palette.chart3,
          borderColor: palette.chart3,
          pointRadius: 5,
          pointHoverRadius: 6,
        },
        {
          label: "Temperature (deg C)",
          data: depthProfileTempData.map((row) => ({ x: row.temperature, y: row.depth })),
          backgroundColor: palette.chart4,
          borderColor: palette.chart4,
          pointRadius: 5,
          pointHoverRadius: 6,
        },
      ],
    }),
    [depthProfileDoData, depthProfileTempData, palette.chart3, palette.chart4],
  )

  const scatterOptions = useMemo<ChartOptions<"scatter">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        xGrid: true,
        yReverse: true,
        xTitle: "Measured value",
        yTitle: "Depth (m)",
        tooltip: {
          callbacks: {
            title: () => "",
            label: (context: any) => {
              const point = context.raw as { x: number; y: number }
              return `${context.dataset.label}: ${point.x.toFixed(2)} at ${point.y.toFixed(1)} m`
            },
          },
        },
      }),
    [palette],
  )

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Layers className="h-4 w-4 text-primary" />
            Depth profile
          </CardTitle>
          <Select value={selectedDepthProfileDate ?? ""} onValueChange={onSelectDepthProfileDate}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              {depthDates.map((date) => (
                <SelectItem key={date} value={date}>
                  {formatTimestamp(`${date}T00:00:00`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {isAllSystemsSelected ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Select a system to view depth profile.</div>
        ) : depthProfileData.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No depth profile measurements found for the selected system and date.</div>
        ) : (
          <div className="space-y-4">
            <div className="chart-canvas-shell h-[340px]">
              <Scatter data={scatterData} options={scatterOptions} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="border-b border-border/70 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Depth (m)</th>
                    <th className="px-4 py-3 text-right font-semibold">DO (mg/L)</th>
                    <th className="px-4 py-3 text-right font-semibold">Temp (deg C)</th>
                    <th className="px-4 py-3 text-right font-semibold">pH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {depthProfileData.map((row, index) => (
                    <tr key={`${row.depth}-${index}`}>
                      <td className="px-4 py-2.5">{row.depth.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{row.dissolvedOxygen != null ? row.dissolvedOxygen.toFixed(2) : "--"}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{row.temperature != null ? row.temperature.toFixed(2) : "--"}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{row.pH != null ? row.pH.toFixed(2) : "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
