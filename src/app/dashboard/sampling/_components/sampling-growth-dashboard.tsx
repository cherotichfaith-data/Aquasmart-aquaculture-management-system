"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Bar as ChartBar, Line as ChartLine } from "@/components/charts/chartjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import {
  buildCartesianOptions,
  buildMetricAxisBounds,
  createVerticalGradient,
  getChartPalette,
} from "@/components/charts/chartjs-theme"
import { formatWithUnit } from "../_lib/formatters"

export type SamplingPoint = {
  systemId: number
  systemLabel: string
  date: string
  abw: number
  fishSampled: number | null
  totalWeight: number | null
}

export type BackendGrowthPoint = {
  systemId: number
  systemLabel: string
  sampleDate: string
  abwG: number
  adgGDay: number | null
  sgrPctDay: number | null
  ageDays: number | null
  expectedAbwG: number | null
  growthDeviationPct: number | null
}

type SystemSummaryRow = {
  systemId: number
  label: string
  abw: number | null
  expectedAbw: number | null
  deviationPct: number | null
  sgrPctDay: number | null
  adgGDay: number | null
}

const chartCardClass = "rounded-2xl border border-border/80 bg-card"
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">{label}</div>
}

function average(values: Array<number | null | undefined>) {
  const numeric = values.filter(isFiniteNumber)
  if (numeric.length === 0) return null
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length
}

function formatPercent(value: number | null | undefined, decimals = 0) {
  if (!isFiniteNumber(value)) return "N/A"
  return `${value > 0 ? "+" : ""}${value.toFixed(decimals)}%`
}

function latestBySystem<T extends { systemId: number; sampleDate?: string; date?: string }>(rows: T[]) {
  const map = new Map<number, T>()
  rows.forEach((row) => {
    const rowDate = row.sampleDate ?? row.date ?? ""
    const current = map.get(row.systemId)
    const currentDate = current?.sampleDate ?? current?.date ?? ""
    if (!current || rowDate.localeCompare(currentDate) > 0) {
      map.set(row.systemId, row)
    }
  })
  return map
}

function deviationTone(value: number | null) {
  if (!isFiniteNumber(value)) return "text-muted-foreground"
  if (value > 3) return "text-primary"
  if (value < -3) return "text-destructive"
  return "text-muted-foreground"
}

function buildSystemSummaryRows(
  samplingPoints: SamplingPoint[],
  growthPoints: BackendGrowthPoint[],
): SystemSummaryRow[] {
  const latestSamples = latestBySystem(samplingPoints)
  const latestGrowth = latestBySystem(growthPoints)
  const ids = new Set<number>([
    ...Array.from(latestSamples.keys()),
    ...Array.from(latestGrowth.keys()),
  ])

  return Array.from(ids)
    .map((systemId) => {
      const sample = latestSamples.get(systemId) ?? null
      const growth = latestGrowth.get(systemId) ?? null
      return {
        systemId,
        label: growth?.systemLabel ?? sample?.systemLabel ?? `System ${systemId}`,
        abw: growth?.abwG ?? sample?.abw ?? null,
        expectedAbw: growth?.expectedAbwG ?? null,
        deviationPct: growth?.growthDeviationPct ?? null,
        sgrPctDay: growth?.sgrPctDay ?? null,
        adgGDay: growth?.adgGDay ?? null,
      }
    })
    .sort((left, right) => left.label.localeCompare(right.label))
}

function buildCurveChart(
  params: {
    points: BackendGrowthPoint[]
    chartColors: string[]
    expectedColor: string
    maxAbw?: number
  },
) {
  const filtered = params.points.filter((point) => {
    if (!isFiniteNumber(point.ageDays)) return false
    if (!isFiniteNumber(point.expectedAbwG)) return false
    if (params.maxAbw == null) return true
    return point.abwG < params.maxAbw || (point.expectedAbwG ?? 0) < params.maxAbw
  })
  const ageDomain = Array.from(new Set(filtered.map((point) => point.ageDays as number))).sort((a, b) => a - b)
  const byAge = new Map<number, Record<string, string | number | null>>()
  filtered.forEach((point) => {
    const age = point.ageDays as number
    const current = byAge.get(age) ?? { age }
    current[`actual_${point.systemId}`] = point.abwG
    current.expectedAbwG = point.expectedAbwG
    byAge.set(age, current)
  })
  const series = Array.from(new Map(filtered.map((point) => [point.systemId, point.systemLabel])).entries()).map(
    ([systemId, label], index) => ({
      systemId,
      label,
      color: params.chartColors[index % params.chartColors.length],
    }),
  )
  const bounds = buildMetricAxisBounds(
    filtered.flatMap((point) => [point.abwG, point.expectedAbwG]).filter(isFiniteNumber),
    { minFloor: 0 },
  )
  const data: ChartData<"line"> = {
    labels: ageDomain.map((age) => String(age)),
    datasets: [
      {
        label: "Expected curve",
        data: ageDomain.map((age) => {
          const value = byAge.get(age)?.expectedAbwG
          return typeof value === "number" ? value : null
        }),
        borderColor: params.expectedColor,
        backgroundColor: createVerticalGradient(params.expectedColor, 0.14, 0.02),
        borderDash: [6, 4],
        borderWidth: 2.4,
        pointRadius: 0,
        pointHoverRadius: 3,
        spanGaps: true,
      },
      ...series.map((item) => ({
        label: item.label,
        data: ageDomain.map((age) => {
          const value = byAge.get(age)?.[`actual_${item.systemId}`]
          return typeof value === "number" ? value : null
        }),
        borderColor: item.color,
        backgroundColor: createVerticalGradient(item.color, 0.2, 0.03),
        borderWidth: 2.4,
        pointRadius: 2,
        pointHoverRadius: 4,
        spanGaps: true,
      })),
    ],
  }

  return { data, bounds, count: filtered.length, ageDomain }
}

export function SamplingGrowthDashboard({
  sampleCount,
  latestAbw,
  latestSampleSize,
  loading,
  samplingPoints,
  growthPoints,
}: {
  sampleCount: number
  latestAbw: number | null
  latestSampleSize: number | null
  loading: boolean
  samplingPoints: SamplingPoint[]
  growthPoints: BackendGrowthPoint[]
}) {
  const palette = getChartPalette()
  const chartColors = [palette.chart1, palette.chart2, palette.chart3, palette.chart4, palette.chart5]
  const summaryRows = useMemo(
    () => buildSystemSummaryRows(samplingPoints, growthPoints),
    [growthPoints, samplingPoints],
  )

  const averageAbw = average(summaryRows.map((row) => row.abw)) ?? latestAbw
  const averageDeviation = average(summaryRows.map((row) => row.deviationPct))
  const averageSgr = average(summaryRows.map((row) => row.sgrPctDay))
  const averageAdg = average(summaryRows.map((row) => row.adgGDay))
  const curveAll = useMemo(
    () => buildCurveChart({ points: growthPoints, chartColors, expectedColor: palette.chart2 }),
    [chartColors, growthPoints, palette.chart2],
  )
  const curveUnder100 = useMemo(
    () => buildCurveChart({ points: growthPoints, chartColors, expectedColor: palette.chart2, maxAbw: 100 }),
    [chartColors, growthPoints, palette.chart2],
  )
  const curveOptions = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        min: curveAll.bounds.min,
        max: curveAll.bounds.max,
        xTitle: "Age (days)",
        yTitle: "ABW (g)",
        tooltip: {
          callbacks: {
            title: (items: any) => `Age ${curveAll.ageDomain[items[0]?.dataIndex ?? 0] ?? "-"} days`,
            label: (context: any) => `${context.dataset.label}: ${Number(context.parsed.y).toFixed(1)} g`,
          },
        },
      }),
    [curveAll.ageDomain, curveAll.bounds.max, curveAll.bounds.min, palette],
  )
  const curveUnder100Options = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        min: curveUnder100.bounds.min,
        max: Math.min(120, curveUnder100.bounds.max ?? 120),
        xTitle: "Age (days)",
        yTitle: "ABW (g)",
        tooltip: {
          callbacks: {
            title: (items: any) => `Age ${curveUnder100.ageDomain[items[0]?.dataIndex ?? 0] ?? "-"} days`,
            label: (context: any) => `${context.dataset.label}: ${Number(context.parsed.y).toFixed(1)} g`,
          },
        },
      }),
    [curveUnder100.ageDomain, curveUnder100.bounds.max, curveUnder100.bounds.min, palette],
  )

  const deviationRows = summaryRows.filter((row) => isFiniteNumber(row.deviationPct))
  const deviationMax = Math.max(10, Math.max(...deviationRows.map((row) => Math.abs(row.deviationPct ?? 0)), 10) * 1.15)
  const deviationData = useMemo<ChartData<"bar">>(
    () => ({
      labels: deviationRows.map((row) => row.label),
      datasets: [
        {
          label: "Deviation",
          data: deviationRows.map((row) => row.deviationPct),
          backgroundColor: deviationRows.map((row) =>
            (row.deviationPct ?? 0) >= 0 ? palette.chart1 : palette.chart4,
          ),
          borderRadius: 6,
        },
      ],
    }),
    [deviationRows, palette.chart1, palette.chart4],
  )
  const deviationOptions = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        min: -deviationMax,
        max: deviationMax,
        xTitle: "System",
        yTitle: "Deviation (%)",
        yTickFormatter: (value) => `${Number(value).toFixed(0)}%`,
      }),
    [deviationMax, palette],
  )

  const sgrRows = summaryRows.filter((row) => isFiniteNumber(row.sgrPctDay))
  const sgrMax = Math.max(0.25, Math.max(...sgrRows.map((row) => row.sgrPctDay ?? 0), 0.25) * 1.15)
  const sgrData = useMemo<ChartData<"bar">>(
    () => ({
      labels: sgrRows.map((row) => row.label),
      datasets: [
        {
          label: "SGR",
          data: sgrRows.map((row) => row.sgrPctDay),
          backgroundColor: sgrRows.map((_, index) => chartColors[index % chartColors.length]),
          borderRadius: 6,
        },
      ],
    }),
    [chartColors, sgrRows],
  )
  const sgrOptions = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        min: 0,
        max: sgrMax,
        xTitle: "System",
        yTitle: "SGR (%/day)",
        yTickFormatter: (value) => `${Number(value).toFixed(2)}%`,
      }),
    [palette, sgrMax],
  )

  return (
    <div className="space-y-6">
      <div className="kpi-grid md:grid-cols-4">
        <div className="kpi-card p-4">
          <p className="kpi-card-title">Average ABW</p>
          <p className="kpi-card-value">{formatWithUnit(averageAbw, 1, "g")}</p>
          <p className="kpi-card-meta">{`${sampleCount.toLocaleString()} samples`}</p>
        </div>
        <div className="kpi-card p-4">
          <p className="kpi-card-title">Growth deviation</p>
          <p className={`kpi-card-value ${deviationTone(averageDeviation)}`}>{formatPercent(averageDeviation)}</p>
          <p className="kpi-card-meta">DB benchmark</p>
        </div>
        <div className="kpi-card p-4">
          <p className="kpi-card-title">SGR / ADG</p>
          <p className="kpi-card-value">
            {isFiniteNumber(averageSgr) ? `${averageSgr.toFixed(2)}%` : "N/A"}
          </p>
          <p className="kpi-card-meta">
            {isFiniteNumber(averageAdg) ? `${averageAdg.toFixed(2)} g/day` : "No ADG"}
          </p>
        </div>
        <div className="kpi-card p-4">
          <p className="kpi-card-title">Latest sample size</p>
          <p className="kpi-card-value">
            {latestSampleSize != null ? latestSampleSize.toLocaleString() : "N/A"}
          </p>
          <p className="kpi-card-meta">Fish in latest sample</p>
        </div>
      </div>

      <Card className={chartCardClass}>
        <CardHeader className="space-y-1 border-b border-border/70 pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Growth vs Expected
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <EmptyChart label="Loading growth curve..." />
          ) : curveAll.count === 0 ? (
            <EmptyChart label="No DB-owned expected growth curve available for the selected scope." />
          ) : (
            <div className="chart-canvas-shell h-[340px]">
              <ChartLine data={curveAll.data} options={curveOptions} />
            </div>
          )}
        </CardContent>
      </Card>

      {curveUnder100.count > 0 ? (
        <Card className={chartCardClass}>
          <CardHeader className="space-y-1 border-b border-border/70 pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Growth vs Expected (&lt;100g)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="chart-canvas-shell h-[260px]">
              <ChartLine data={curveUnder100.data} options={curveUnder100Options} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className={chartCardClass}>
          <CardHeader className="space-y-1 border-b border-border/70 pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Growth deviation
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {deviationRows.length === 0 ? (
              <EmptyChart label="No DB-owned growth deviation values in the selected scope." />
            ) : (
              <div className="chart-canvas-shell h-[260px]">
                <ChartBar data={deviationData} options={deviationOptions} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={chartCardClass}>
          <CardHeader className="space-y-1 border-b border-border/70 pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              SGR comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {sgrRows.length === 0 ? (
              <EmptyChart label="No backend SGR values in the selected scope." />
            ) : (
              <div className="chart-canvas-shell h-[260px]">
                <ChartBar data={sgrData} options={sgrOptions} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={chartCardClass}>
        <CardHeader className="space-y-1 border-b border-border/70 pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            System growth table
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border/70 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="py-3 pr-4 text-left font-semibold">System</th>
                <th className="px-4 py-3 text-right font-semibold">ABW</th>
                <th className="px-4 py-3 text-right font-semibold">Expected ABW</th>
                <th className="px-4 py-3 text-right font-semibold">Deviation</th>
                <th className="px-4 py-3 text-right font-semibold">SGR</th>
                <th className="px-4 py-3 text-right font-semibold">ADG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {summaryRows.length === 0 ? (
                <tr>
                  <td className="py-5 text-muted-foreground" colSpan={6}>
                    No system growth rows in the selected scope.
                  </td>
                </tr>
              ) : (
                summaryRows.map((row) => (
                  <tr key={row.systemId}>
                    <td className="py-3 pr-4 font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-right">{formatWithUnit(row.abw, 1, "g")}</td>
                    <td className="px-4 py-3 text-right">{formatWithUnit(row.expectedAbw, 1, "g")}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${deviationTone(row.deviationPct)}`}>
                      {formatPercent(row.deviationPct)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isFiniteNumber(row.sgrPctDay) ? `${row.sgrPctDay.toFixed(2)}%/day` : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-right">{formatWithUnit(row.adgGDay, 2, "g/day")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
