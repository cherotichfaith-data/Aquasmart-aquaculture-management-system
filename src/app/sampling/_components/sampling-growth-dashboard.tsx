"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
const chartColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">{label}</div>
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
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bestGrowthTrajectory}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.35} />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(_, payload) => formatFullDate(String(payload?.[0]?.payload?.date ?? ""))}
                    formatter={(value) => [`${Number(value).toFixed(1)} g`, "ABW"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="abw"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2.6}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
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
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentAbwRows}>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.35} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(1)} g`, "Current ABW"]} />
                    <Bar dataKey="abw" radius={[4, 4, 0, 0]}>
                      {currentAbwRows.map((row, index) => (
                        <Cell key={row.systemId} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sgrRows}>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.35} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(3)}%/day`, "SGR"]} />
                    <Bar dataKey="sgr" radius={[4, 4, 0, 0]}>
                      {sgrRows.map((row) => (
                        <Cell
                          key={row.systemId}
                          fill={row.sgr > 1.5 ? "#16a34a" : row.sgr > 0.8 ? "#3b82f6" : "#f59e0b"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={harvestTimelineRows}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.35} />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(1)} kg`, "Cumulative harvest"]} />
                  <Legend />
                  {harvestTimelineSystems.map((row, index) => (
                    <Line
                      key={row.systemId}
                      type="monotone"
                      dataKey={`system_${row.systemId}`}
                      name={row.label}
                      stroke={chartColors[index % chartColors.length]}
                      strokeWidth={2.4}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
