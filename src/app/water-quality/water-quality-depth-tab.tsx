"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { AlertTriangle, CheckCircle, Layers } from "lucide-react"
import { Scatter } from "@/components/charts/chartjs"
import { getChartPalette, buildCartesianOptions } from "@/components/charts/chartjs-theme"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatTimestamp } from "./_lib/water-quality-utils"
import type { DepthProfileRow } from "./_lib/water-quality-selectors"

export function WaterQualityDepthTab({
  selectedDepthProfileDate,
  onSelectDepthProfileDate,
  depthDates,
  isAllSystemsSelected,
  depthProfileData,
  depthProfileDoData,
  depthProfileTempData,
  isStratified,
  surfaceDo,
  bottomDo,
  doGradient,
  tempGradient,
}: {
  selectedDepthProfileDate: string | null
  onSelectDepthProfileDate: (value: string) => void
  depthDates: string[]
  isAllSystemsSelected: boolean
  depthProfileData: DepthProfileRow[]
  depthProfileDoData: Array<DepthProfileRow & { dissolvedOxygen: number }>
  depthProfileTempData: Array<DepthProfileRow & { temperature: number }>
  isStratified: boolean
  surfaceDo: number | null
  bottomDo: number | null
  doGradient: number | null
  tempGradient: number | null
}) {
  const palette = getChartPalette()

  const scatterData = useMemo<ChartData<"scatter">>(
    () => ({
      datasets: [
        {
          label: "DO (mg/L)",
          data: depthProfileDoData.map((row) => ({
            x: row.dissolvedOxygen,
            y: row.depth,
          })),
          backgroundColor: palette.chart3,
          borderColor: palette.chart3,
          pointRadius: 5,
          pointHoverRadius: 6,
        },
        {
          label: "Temperature (deg C)",
          data: depthProfileTempData.map((row) => ({
            x: row.temperature,
            y: row.depth,
          })),
          backgroundColor: "#F59E0B",
          borderColor: "#F59E0B",
          pointRadius: 5,
          pointHoverRadius: 6,
        },
      ],
    }),
    [depthProfileDoData, depthProfileTempData, palette.chart3],
  )

  const scatterOptions = useMemo<ChartOptions<"scatter">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        xGrid: true,
        yReverse: true,
        xTitle: "Measured value (mg/L or deg C)",
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
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 shadow-[0_14px_32px_-26px_rgba(168,85,247,0.42)]">
            <Layers className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Stratification Analysis</h2>
            <p className="text-sm text-muted-foreground">Depth profile scatter of dissolved oxygen and temperature by depth.</p>
          </div>
        </div>
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

      {isAllSystemsSelected ? (
        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground">Select a system to view stratification analysis.</CardContent>
        </Card>
      ) : depthProfileData.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground">No stratification profile measurements found for the selected system and date.</CardContent>
        </Card>
      ) : (
        <>
          <Card className={isStratified ? "border-red-500/30 bg-red-500/10" : "border-emerald-500/30 bg-emerald-500/10"}>
            <CardContent className="flex items-start gap-3 p-4">
              {isStratified ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-300" />
              ) : (
                <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              )}
              <div>
                <p className={`text-sm font-semibold ${isStratified ? "text-red-600 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                  {isStratified ? "Stratified" : "Not stratified"}
                </p>
                <p className={`mt-1 text-xs ${isStratified ? "text-red-600/80 dark:text-red-300/80" : "text-emerald-700/80 dark:text-emerald-300/80"}`}>
                  Stratified when bottom DO is below 4.0 mg/L and surface DO is above 6.0 mg/L. Consider adding a 5 m measurement where cage depth allows.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="kpi-grid md:grid-cols-5">
            <Card className="kpi-card"><CardHeader className="kpi-card-header"><CardTitle className="kpi-card-title">Surface DO</CardTitle></CardHeader><CardContent className="kpi-card-content"><div className="kpi-card-value">{surfaceDo != null ? surfaceDo.toFixed(2) : "--"}</div><p className="kpi-card-meta">mg/L</p></CardContent></Card>
            <Card className="kpi-card"><CardHeader className="kpi-card-header"><CardTitle className="kpi-card-title">Bottom DO</CardTitle></CardHeader><CardContent className="kpi-card-content"><div className="kpi-card-value">{bottomDo != null ? bottomDo.toFixed(2) : "--"}</div><p className="kpi-card-meta">mg/L</p></CardContent></Card>
            <Card className="kpi-card"><CardHeader className="kpi-card-header"><CardTitle className="kpi-card-title">DO Gradient</CardTitle></CardHeader><CardContent className="kpi-card-content"><div className="kpi-card-value">{doGradient != null ? doGradient.toFixed(2) : "--"}</div><p className="kpi-card-meta">Surface - bottom</p></CardContent></Card>
            <Card className="kpi-card"><CardHeader className="kpi-card-header"><CardTitle className="kpi-card-title">Temp Gradient</CardTitle></CardHeader><CardContent className="kpi-card-content"><div className="kpi-card-value">{tempGradient != null ? tempGradient.toFixed(2) : "--"}</div><p className="kpi-card-meta">deg C, surface - bottom</p></CardContent></Card>
            <Card className="kpi-card"><CardHeader className="kpi-card-header"><CardTitle className="kpi-card-title">Flag</CardTitle></CardHeader><CardContent className="kpi-card-content"><div className="kpi-card-value">{isStratified ? "YES" : "NO"}</div><p className="kpi-card-meta">Rule-based status</p></CardContent></Card>
          </div>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm font-medium">
                Depth Profile Scatter
                <Badge variant="outline" className={isStratified ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}>
                  {isStratified ? "STRATIFIED" : "NOT STRATIFIED"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="chart-canvas-shell h-[360px]">
                <Scatter data={scatterData} options={scatterOptions} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Depth Measurement Data</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/70">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Depth (m)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">DO (mg/L)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Temp (deg C)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">pH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depthProfileData.map((row, index) => (
                      <tr key={`${row.depth}-${index}`} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <td className="px-4 py-2.5 text-sm text-foreground">{row.depth.toFixed(1)}</td>
                        <td className="px-4 py-2.5 text-right text-sm font-mono text-foreground">{row.dissolvedOxygen != null ? row.dissolvedOxygen.toFixed(2) : "--"}</td>
                        <td className="px-4 py-2.5 text-right text-sm font-mono text-foreground">{row.temperature != null ? row.temperature.toFixed(2) : "--"}</td>
                        <td className="px-4 py-2.5 text-right text-sm font-mono text-foreground">{row.pH != null ? row.pH.toFixed(2) : "--"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
