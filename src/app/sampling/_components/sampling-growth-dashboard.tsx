"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import {
  Bar as ChartBar,
  Line as ChartLine,
} from "@/components/charts/chartjs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSemanticCalloutClass, getSemanticColor } from "@/lib/theme/semantic-colors"
import {
  buildCartesianOptions,
  buildDailyDateDomain,
  createVerticalGradient,
  getChartPalette,
  getDateAxisMaxTicks,
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
  const trajectoryDateDomain = useMemo(
    () => buildDailyDateDomain(bestGrowthTrajectory.map((row) => row.date)),
    [bestGrowthTrajectory],
  )
  const trajectoryRowsByDate = useMemo(
    () => new Map(bestGrowthTrajectory.map((row) => [row.date, row])),
    [bestGrowthTrajectory],
  )
  const trajectoryXAxisLimit = getDateAxisMaxTicks(trajectoryDateDomain.length)
  const harvestTimeAxisTitle = useMemo(() => {
    if (harvestGranularityLabel === "month") return "Month"
    if (harvestGranularityLabel === "quarter") return "Quarter"
    return "Date"
  }, [harvestGranularityLabel])

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
      labels: trajectoryDateDomain,
      datasets: [
        {
          label: "ABW",
          data: trajectoryDateDomain.map((date) => trajectoryRowsByDate.get(date)?.abw ?? null),
          borderColor: palette.chart1,
          backgroundColor: createVerticalGradient(palette.chart1, 0.36, 0.04),
          borderWidth: 2.6,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    }),
    [palette.chart1, trajectoryDateDomain, trajectoryRowsByDate],
  )

  const trajectoryOptions = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        min: 0,
        max: trajectoryMax,
        xTitle: "Date",
        xMaxTicksLimit: trajectoryXAxisLimit,
        yTitle: "ABW (g)",
        tooltip: {
          callbacks: {
            title: (items: any) => formatFullDate(trajectoryDateDomain[items[0]?.dataIndex ?? 0] ?? ""),
            label: (context: any) => `ABW: ${Number(context.parsed.y).toFixed(1)} g`,
          },
        },
        xTickFormatter: (_value, index) => {
          const parsed = new Date(`${trajectoryDateDomain[index] ?? ""}T00:00:00`)
          if (Number.isNaN(parsed.getTime())) return trajectoryDateDomain[index] ?? ""
          return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
        },
      }),
    [palette, trajectoryDateDomain, trajectoryMax, trajectoryXAxisLimit],
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
        xTitle: "Cage",
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
            row.sgr > 1.5
              ? getSemanticColor("good")
              : row.sgr > 0.8
                ? getSemanticColor("info")
                : getSemanticColor("warn"),
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
        xTitle: "Cage",
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
        xTitle: harvestTimeAxisTitle,
        yTitle: "Cumulative harvest (kg)",
        xTickFormatter: (_value, index) => String(harvestTimelineRows[index]?.label ?? ""),
        tooltip: {
          callbacks: {
            label: (context: any) => `${context.dataset.label}: ${Number(context.parsed.y).toFixed(1)} kg`,
          },
        },
      }),
    [harvestMax, harvestTimeAxisTitle, harvestTimelineRows, palette],
  )

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Growth overview</h2>
        <div className="kpi-grid md:grid-cols-4">
          <div className="kpi-card p-4">
            <p className="kpi-card-title">Total Samples</p>
            <p className="kpi-card-value">{`${filteredRowCount.toLocaleString()} samples`}</p>
          </div>
          <div className="kpi-card p-4">
            <p className="kpi-card-title">Latest ABW</p>
            <p className="kpi-card-value">{latestAbw != null ? `${latestAbw.toFixed(1)} g` : "N/A"}</p>
          </div>
          <div className="kpi-card p-4">
            <p className="kpi-card-title">ABW Volatility</p>
            <p className="kpi-card-value">{abwCv != null ? `${abwCv.toFixed(1)}%` : "N/A"}</p>
            <p className="kpi-card-meta">CV over time</p>
          </div>
          <div className="kpi-card p-4">
            <p className="kpi-card-title">Avg Sample Size</p>
            <p className="kpi-card-value">{avgSampleSize != null ? `${avgSampleSize.toFixed(0)} fish/sample` : "N/A"}</p>
          </div>
        </div>
        <div className="kpi-grid md:grid-cols-3">
          <div className="kpi-card p-4">
            <p className="kpi-card-title">Growth Efficiency</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="kpi-card-value mt-0">
                {growthEfficiency != null ? `${growthEfficiency.toFixed(0)}%` : "N/A"}
              </p>
              {efficiencyActionRequired ? (
                <Badge variant="destructive" className="animate-pulse">
                  Action Required
                </Badge>
              ) : null}
            </div>
            <p className="kpi-card-meta">Actual ABW vs target curve</p>
          </div>
          <div className="kpi-card p-4">
            <p className="kpi-card-title">{projectionLabel}</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="kpi-card-value mt-0">
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
            <p className="kpi-card-meta">
              {targetWeightG != null
                ? `Target ${formatWithUnit(targetWeightG, 0, "g")} ${resolvedStage === "nursing" ? "move" : "harvest"}`
                : "No backend target configured"}
            </p>
          </div>
          <div className="kpi-card p-4">
            <p className="kpi-card-title">SGR (latest)</p>
            <p className="kpi-card-value">{projection ? `${projection.sgr.toFixed(2)}%/day` : "N/A"}</p>
            <p className="kpi-card-meta">Based on last two samples</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Capacity Planning</h2>
        <div className="kpi-grid md:grid-cols-3">
          <div className="kpi-card p-4">
            <p className="kpi-card-title">Target Density</p>
            <p className="kpi-card-value">
              {targetDensityKgM3 != null ? formatWithUnit(targetDensityKgM3, 1, "kg/m3") : "N/A"}
            </p>
            <p className="kpi-card-meta">Capacity planning baseline</p>
          </div>
          <div className="kpi-card p-4">
            <p className="kpi-card-title">Max Fish @ Current ABW</p>
            <p className="kpi-card-value">{maxFish != null ? `${Math.round(maxFish).toLocaleString()} fish` : "N/A"}</p>
            <p className="kpi-card-meta">
              {abwForCapacity != null
                ? `ABW ${formatWithUnit(abwForCapacity, 1, "g")}`
                : "Select a system to compute capacity"}
            </p>
          </div>
          <div className="kpi-card p-4">
            <p className="kpi-card-title">Utilization</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="kpi-card-value mt-0">{utilizationLabel}</p>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${utilizationTone}`}>
                {utilizationBadge}
              </span>
            </div>
            <p className="kpi-card-meta">
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
      <div className={`rounded-xl border-l-4 px-4 py-3 text-sm leading-6 ${getSemanticCalloutClass("good")}`}>
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
