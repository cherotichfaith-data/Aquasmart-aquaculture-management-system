"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import {
  Bar as ChartBar,
  Line as ChartLine,
} from "@/components/charts/chartjs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  buildCartesianOptions,
  createVerticalGradient,
  getChartPalette,
} from "@/components/charts/chartjs-theme"
import { formatFullDate, formatWithUnit } from "@/app/sampling/_lib/formatters"

type TrajectoryRow = {
  date: string
  label: string
  abw: number
}

type AbwRow = {
  systemId: number
  label: string
  abw: number
}

type SgrRow = {
  systemId: number
  label: string
  sgr: number
}

type HarvestTimelineSystem = {
  systemId: number
  label: string
}

const chartCardClass = "rounded-2xl border border-border/80 bg-card shadow-sm"

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">{label}</div>
}

const getMaxNumber = (values: Array<number | null | undefined>, fallback = 1) => {
  const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  return numeric.length ? Math.max(...numeric) : fallback
}

export function SamplingGrowthDashboard({
  filteredRowCount,
  latestAbw,
  abwCv,
  avgSampleSize,
  growthEfficiency,
  efficiencyActionRequired,
  projectionLabel,
  projection,
  targetWeightG,
  resolvedStage,
  targetDensityKgM3,
  maxFish,
  abwForCapacity,
  utilizationLabel,
  utilizationTone,
  utilizationBadge,
  currentFish,
  hasSystem,
  systemId,
  systemName,
  volumeM3,
  targetBiomassKg,
  loading,
  bestGrowthSystem,
  bestGrowthTrajectory,
  currentAbwRows,
  sgrRows,
  harvestTimelineRows,
  harvestTimelineSystems,
  harvestGranularityLabel,
}: {
  filteredRowCount: number
  latestAbw: number | null
  abwCv: number | null
  avgSampleSize: number | null
  growthEfficiency: number | null
  efficiencyActionRequired: boolean
  projectionLabel: string
  projection:
    | {
        projectedDate: Date
        daysToTarget: number
        sgr: number
        targetWeight: number
        lowConfidence: boolean
      }
    | null
  targetWeightG: number | null
  resolvedStage: "nursing" | "grow_out" | null
  targetDensityKgM3: number | null
  maxFish: number | null
  abwForCapacity: number | null
  utilizationLabel: string
  utilizationTone: string
  utilizationBadge: string
  currentFish: number | null
  hasSystem: boolean
  systemId: number | null | undefined
  systemName: string | null
  volumeM3: number | null
  targetBiomassKg: number | null
  loading: boolean
  bestGrowthSystem: {
    systemId: number
    label: string
    samples: number
    latestAbw: number | null
    currentBiomass: number | null
    overallSgr: number | null
    totalHarvestKg: number
  } | null
  bestGrowthTrajectory: TrajectoryRow[]
  currentAbwRows: AbwRow[]
  sgrRows: SgrRow[]
  harvestTimelineRows: Array<Record<string, string | number>>
  harvestTimelineSystems: HarvestTimelineSystem[]
  harvestGranularityLabel: string
}) {
  const palette = getChartPalette()
  const chartColors = [palette.chart1, palette.chart2, palette.chart3, palette.chart4, palette.chart5]

  const trajectoryMax = useMemo(
    () => Math.max(1, Math.ceil(getMaxNumber(bestGrowthTrajectory.map((row) => row.abw)) * 1.12)),
    [bestGrowthTrajectory],
  )

  const currentAbwMax = useMemo(
    () => Math.max(1, Math.ceil(getMaxNumber(currentAbwRows.map((row) => row.abw)) * 1.12)),
    [currentAbwRows],
  )

  const sgrMax = useMemo(() => {
    const maxValue = getMaxNumber(sgrRows.map((row) => row.sgr))
    return Math.max(0.25, Math.ceil(maxValue * 1.15 * 1000) / 1000)
  }, [sgrRows])

  const harvestMax = useMemo(() => {
    const values = harvestTimelineRows.flatMap((row) =>
      harvestTimelineSystems.map((system) => {
        const value = row[`system_${system.systemId}`]
        return typeof value === "number" ? value : null
      }),
    )
    return Math.max(1, Math.ceil(getMaxNumber(values) * 1.12))
  }, [harvestTimelineRows, harvestTimelineSystems])

  const trajectoryData = useMemo<ChartData<"line">>(
    () => ({
      labels: bestGrowthTrajectory.map((row) => row.label),
      datasets: [
        {
          label: "ABW",
          data: bestGrowthTrajectory.map((row) => row.abw),
          borderColor: palette.chart1,
          backgroundColor: createVerticalGradient(palette.chart1, 0.36, 0.04),
          borderWidth: 2.6,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    }),
    [bestGrowthTrajectory, palette.chart1],
  )

  const trajectoryOptions = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        min: 0,
        max: trajectoryMax,
        yTitle: "ABW (g)",
        tooltip: {
          callbacks: {
            title: (items: any) => formatFullDate(bestGrowthTrajectory[items[0]?.dataIndex ?? 0]?.date ?? ""),
            label: (context: any) => `ABW: ${Number(context.parsed.y).toFixed(1)} g`,
          },
        },
      }),
    [bestGrowthTrajectory, palette, trajectoryMax],
  )

  const currentAbwData = useMemo<ChartData<"bar">>(
    () => ({
      labels: currentAbwRows.map((row) => row.label),
      datasets: [
        {
          label: "Current ABW",
          data: currentAbwRows.map((row) => row.abw),
          backgroundColor: currentAbwRows.map((_, index) => chartColors[index % chartColors.length]),
          borderRadius: 6,
        },
      ],
    }),
    [chartColors, currentAbwRows],
  )

  const currentAbwOptions = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        min: 0,
        max: currentAbwMax,
        yTitle: "ABW (g)",
        tooltip: {
          callbacks: {
            label: (context: any) => `Current ABW: ${Number(context.parsed.y).toFixed(1)} g`,
          },
        },
      }),
    [currentAbwMax, palette],
  )

  const sgrData = useMemo<ChartData<"bar">>(
    () => ({
      labels: sgrRows.map((row) => row.label),
      datasets: [
        {
          label: "SGR",
          data: sgrRows.map((row) => row.sgr),
          backgroundColor: sgrRows.map((row) =>
            row.sgr > 1.5 ? "#16a34a" : row.sgr > 0.8 ? "#3b82f6" : "#f59e0b",
          ),
          borderRadius: 6,
        },
      ],
    }),
    [sgrRows],
  )

  const sgrOptions = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        min: 0,
        max: sgrMax,
        yTickFormatter: (value) => `${Number(value).toFixed(2)}%`,
        yTitle: "SGR (%/day)",
        tooltip: {
          callbacks: {
            label: (context: any) => `SGR: ${Number(context.parsed.y).toFixed(3)}%/day`,
          },
        },
      }),
    [palette, sgrMax],
  )

  const harvestData = useMemo<ChartData<"line">>(
    () => ({
      labels: harvestTimelineRows.map((row) => String(row.label ?? "")),
      datasets: harvestTimelineSystems.map((row, index) => ({
        label: row.label,
        data: harvestTimelineRows.map((item) => {
          const value = item[`system_${row.systemId}`]
          return typeof value === "number" ? value : null
        }),
        borderColor: chartColors[index % chartColors.length],
        backgroundColor: chartColors[index % chartColors.length],
        borderWidth: 2.4,
        pointRadius: 0,
        spanGaps: true,
      })),
    }),
    [chartColors, harvestTimelineRows, harvestTimelineSystems],
  )

  const harvestOptions = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        min: 0,
        max: harvestMax,
        yTitle: "Cumulative harvest (kg)",
        tooltip: {
          callbacks: {
            label: (context: any) => `${context.dataset.label}: ${Number(context.parsed.y).toFixed(1)} kg`,
          },
        },
      }),
    [harvestMax, palette],
  )

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Growth overview</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Samples</p>
            <p className="mt-1 text-2xl font-bold">{`${filteredRowCount.toLocaleString()} samples`}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Latest ABW</p>
            <p className="mt-1 text-2xl font-bold">{latestAbw != null ? `${latestAbw.toFixed(1)} g` : "N/A"}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">ABW Trend Volatility (CV over time)</p>
            <p className="mt-1 text-2xl font-bold">{abwCv != null ? `${abwCv.toFixed(1)}%` : "N/A"}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Avg Sample Size</p>
            <p className="mt-1 text-2xl font-bold">{avgSampleSize != null ? `${avgSampleSize.toFixed(0)} fish/sample` : "N/A"}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Growth Efficiency</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-2xl font-bold">
                {growthEfficiency != null ? `${growthEfficiency.toFixed(0)}%` : "N/A"}
              </p>
              {efficiencyActionRequired ? (
                <Badge variant="destructive" className="animate-pulse">
                  Action Required
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Actual ABW vs target curve</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{projectionLabel}</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-2xl font-bold">
                {projection
                  ? new Intl.DateTimeFormat(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }).format(projection.projectedDate)
                  : "N/A"}
              </p>
              {projection?.lowConfidence ? (
                <Badge variant="outline" className="border-chart-4/40 text-chart-4">
                  Low confidence
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {targetWeightG != null
                ? `Target ${formatWithUnit(targetWeightG, 0, "g")} ${resolvedStage === "nursing" ? "move" : "harvest"}`
                : "No backend target configured"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">SGR (latest)</p>
            <p className="mt-1 text-2xl font-bold">{projection ? `${projection.sgr.toFixed(2)}%/day` : "N/A"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Based on last two samples</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Capacity Planning</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Target Density</p>
            <p className="mt-1 text-2xl font-bold">
              {targetDensityKgM3 != null ? formatWithUnit(targetDensityKgM3, 1, "kg/m3") : "N/A"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Capacity planning baseline</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Max Fish @ Current ABW</p>
            <p className="mt-1 text-2xl font-bold">{maxFish != null ? `${Math.round(maxFish).toLocaleString()} fish` : "N/A"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {abwForCapacity != null
                ? `ABW ${formatWithUnit(abwForCapacity, 1, "g")}`
                : "Select a system to compute capacity"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Utilization</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-2xl font-bold">{utilizationLabel}</p>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${utilizationTone}`}>
                {utilizationBadge}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {currentFish != null ? `${currentFish.toLocaleString()} fish in system` : "No fish count available"}
            </p>
          </div>
        </div>
      </div>

      {hasSystem && volumeM3 != null && abwForCapacity != null ? (
        <div className="text-xs text-muted-foreground">
          Capacity example for {systemName ?? `System ${systemId}`} ({volumeM3} m3): target biomass{" "}
          {targetBiomassKg != null ? `${targetBiomassKg.toFixed(0)} kg` : "--"} at{" "}
          {formatWithUnit(abwForCapacity, 1, "g")} &gt; max{" "}
          {maxFish != null ? `${Math.round(maxFish).toLocaleString()} fish` : "--"}.
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          Select a system with volume data to compute density capacity and utilization.
        </div>
      )}
      <div className="rounded-xl border-l-4 border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
        <strong>{bestGrowthSystem?.label ?? "No cage"} is the best-documented growth trajectory.</strong>{" "}
        {bestGrowthSystem
          ? `${bestGrowthSystem.samples} growth samples captured in scope`
          : "No growth trajectory is available in scope"}
        {bestGrowthSystem?.overallSgr != null
          ? `, with SGR ${bestGrowthSystem.overallSgr.toFixed(2)}%/day.`
          : "."}
      </div>

      <Card className={chartCardClass}>
        <CardHeader className="space-y-1 border-b border-border/70 pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {bestGrowthSystem
              ? `ABW trajectory - ${bestGrowthSystem.label} (fingerling to grow-out)`
              : "ABW trajectory (fingerling to grow-out)"}
          </CardTitle>
          <CardDescription>Observed sampling trajectory for the strongest documented system in the current scope.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <EmptyChart label="Loading growth trajectory..." />
          ) : bestGrowthTrajectory.length === 0 ? (
            <EmptyChart label="No growth trajectory available in the selected scope." />
          ) : (
            <div className="chart-canvas-shell h-[300px]">
              <ChartLine data={trajectoryData} options={trajectoryOptions} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className={chartCardClass}>
          <CardHeader className="space-y-1 border-b border-border/70 pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Current ABW by cage (last sample)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {currentAbwRows.length === 0 ? (
              <EmptyChart label="No ABW samples in the selected scope." />
            ) : (
              <div className="chart-canvas-shell h-[240px]">
                <ChartBar data={currentAbwData} options={currentAbwOptions} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={chartCardClass}>
          <CardHeader className="space-y-1 border-b border-border/70 pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              SGR (%/day) by cage (full observed period)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {sgrRows.length === 0 ? (
              <EmptyChart label="No SGR values in the selected scope." />
            ) : (
              <div className="chart-canvas-shell h-[240px]">
                <ChartBar data={sgrData} options={sgrOptions} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={chartCardClass}>
        <CardHeader className="space-y-1 border-b border-border/70 pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Harvest weight distribution: cumulative harvest (kg) by cage over time
          </CardTitle>
          <CardDescription>
            Harvest accumulation by {harvestGranularityLabel} for the top harvested systems in the current scope.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {harvestTimelineRows.length === 0 ? (
            <EmptyChart label="No harvest history in the selected scope." />
          ) : (
            <div className="chart-canvas-shell h-[260px]">
              <ChartLine data={harvestData} options={harvestOptions} />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
