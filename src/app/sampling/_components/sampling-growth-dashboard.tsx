"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import {
  formatDayLabel,
  formatFullDate,
  formatWithUnit,
} from "@/app/sampling/_lib/formatters"

type GrowthRow = {
  systemId: number
  systemName: string
  date: string | null
  abw: number | null
  fishSampled: number | null
  totalWeight: number | null
  batchId: number | null
  dailyGain: number | null
  transferStatus: "OK" | "Growth check" | "Insufficient data" | "No transfer"
  transferDate: string | null
}

type ChartRow = {
  date: string
  abw: number | null
  fishSampled: number
  totalWeight: number
  targetAbw: number | null
  projectionAbw: number | null
  label: string
}

type TransferMarker = {
  date: string
  label: string
  count: number
  inbound: number
  outbound: number
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
  chartDisplayRows,
  transferMarkers,
  growthRows,
  tableEnabled,
  latestUpdatedAt,
  isFetching,
  onSelectHistorySystem,
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
  targetWeightG: number
  resolvedStage: "nursing" | "grow_out" | null
  targetDensityKgM3: number
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
  chartDisplayRows: ChartRow[]
  transferMarkers: TransferMarker[]
  growthRows: GrowthRow[]
  tableEnabled: boolean
  latestUpdatedAt: number
  isFetching: boolean
  onSelectHistorySystem: (systemId: number) => void
}) {
  return (
    <>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Growth KPIs</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total Samples</p>
            <p className="text-2xl font-bold mt-1">{filteredRowCount}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Latest ABW</p>
            <p className="text-2xl font-bold mt-1">{latestAbw != null ? `${latestAbw.toFixed(1)} g` : "N/A"}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">ABW Trend Volatility (CV over time)</p>
            <p className="text-2xl font-bold mt-1">{abwCv != null ? `${abwCv.toFixed(1)}%` : "N/A"}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Avg Sample Size</p>
            <p className="text-2xl font-bold mt-1">{avgSampleSize != null ? avgSampleSize.toFixed(0) : "N/A"}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Growth Efficiency</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold">
                {growthEfficiency != null ? `${growthEfficiency.toFixed(0)}%` : "N/A"}
              </p>
              {efficiencyActionRequired ? (
                <Badge variant="destructive" className="animate-pulse">Action Required</Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Actual ABW vs target curve</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">{projectionLabel}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold">
                {projection
                  ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(projection.projectedDate)
                  : "N/A"}
              </p>
              {projection?.lowConfidence ? (
                <Badge variant="outline" className="text-chart-4 border-chart-4/40">Low confidence</Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target {formatWithUnit(targetWeightG, 0, "g")} {resolvedStage === "nursing" ? "move" : "harvest"}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">SGR (latest)</p>
            <p className="text-2xl font-bold mt-1">
              {projection ? `${projection.sgr.toFixed(2)}%/day` : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Based on last two samples</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Capacity Planning</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Target Density</p>
            <p className="text-2xl font-bold mt-1">{formatWithUnit(targetDensityKgM3, 1, "kg/m3")}</p>
            <p className="text-xs text-muted-foreground mt-1">Capacity planning baseline</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Max Fish @ Current ABW</p>
            <p className="text-2xl font-bold mt-1">{maxFish != null ? Math.round(maxFish).toLocaleString() : "N/A"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {abwForCapacity != null ? `ABW ${formatWithUnit(abwForCapacity, 1, "g")}` : "Select a system to compute capacity"}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Utilization</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold">{utilizationLabel}</p>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${utilizationTone}`}>{utilizationBadge}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentFish != null ? `${currentFish.toLocaleString()} fish in system` : "No fish count available"}
            </p>
          </div>
        </div>
      </div>

      {hasSystem && volumeM3 != null && abwForCapacity != null ? (
        <div className="text-xs text-muted-foreground">
          Capacity example for {systemName ?? `System ${systemId}`} ({volumeM3} m3): target biomass{" "}
          {targetBiomassKg != null ? `${targetBiomassKg.toFixed(0)} kg` : "--"} at {formatWithUnit(abwForCapacity, 1, "g")} &gt; max{" "}
          {maxFish != null ? `${Math.round(maxFish).toLocaleString()} fish` : "--"}.
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          Select a system with volume data to compute density capacity and utilization.
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        Example: 125 m3 at 15 kg/m3 &gt; target biomass 1,875 kg; at 10 g ABW &gt; max 187,500 fish.
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-2">ABW Trend & Transfer Events</h2>
        <p className="text-sm text-muted-foreground mb-4">
          ABW from `fish_sampling_weight` with target overlay, transfer event markers, and projection to the next milestone.
          {projection
            ? ` ${projectionLabel}: ${new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(
                projection.projectedDate,
              )} (${projection.daysToTarget} days).`
            : ""}
        </p>
        <div className="mb-4 legend-pills">
          <div className="legend-pill"><span className="legend-pill-swatch bg-[var(--color-chart-1)]" /> Observed ABW</div>
          <div className="legend-pill"><span className="legend-pill-swatch bg-[hsl(var(--muted-foreground))]" /> Target ABW</div>
          <div className="legend-pill"><span className="legend-pill-swatch bg-[var(--color-chart-4)]" /> Projection</div>
          <div className="legend-pill"><span className="legend-pill-swatch bg-[var(--color-chart-3)]" /> Transfer markers</div>
        </div>
        {loading ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">Loading chart...</div>
        ) : chartDisplayRows.length > 0 ? (
          <div className="h-[320px] rounded-md border border-border/80 bg-muted/20 p-2">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartDisplayRows}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                  <XAxis dataKey="date" tickFormatter={formatDayLabel} />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(_, payload) => formatFullDate(String(payload?.[0]?.payload?.date ?? ""))}
                    formatter={(value, name) => [
                      `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} g`,
                      String(name),
                    ]}
                  />

                  <ReferenceLine y={10} stroke="hsl(var(--border))" strokeDasharray="2 4" label="10g" />
                  <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="2 4" label="50g" />
                  {transferMarkers.map((marker, index) => {
                    const direction =
                      marker.inbound > 0 && marker.outbound > 0
                        ? "mixed"
                        : marker.inbound > 0
                          ? "in"
                          : "out"
                    const stroke =
                      direction === "in"
                        ? "var(--color-chart-2)"
                        : direction === "out"
                          ? "var(--color-chart-4)"
                          : "var(--color-chart-3)"
                    const label =
                      index === 0
                        ? direction === "in"
                          ? "Transfer In"
                          : direction === "out"
                            ? "Transfer Out"
                            : "Transfer"
                        : undefined
                    return (
                      <ReferenceLine
                        key={`${marker.date}-${index}`}
                        x={marker.date}
                        stroke={stroke}
                        strokeDasharray="3 3"
                        label={label}
                      />
                    )
                  })}
                  <Line type="monotone" dataKey="abw" stroke="var(--color-chart-1)" strokeWidth={2.5} name="Observed ABW (g)" />
                  <Line type="monotone" dataKey="targetAbw" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" name="Target ABW (g)" dot={false} />
                  <Line type="monotone" dataKey="projectionAbw" stroke="var(--color-chart-4)" strokeDasharray="4 4" name="Projection" dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </LazyRender>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-muted-foreground">No sampling data available</div>
        )}
      </div>

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Sampling Growth Analysis</CardTitle>
              <CardDescription>Most recent sampling record per system in scope, with cycle dates resolved separately from sampling snapshots.</CardDescription>
            </div>
            <DataFetchingBadge isFetching={isFetching} isLoading={loading} />
          </div>
          <DataUpdatedAt updatedAt={latestUpdatedAt} />
        </CardHeader>
        <CardContent className="pt-4">
          {!tableEnabled ? (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Select a stage, batch, or system to view growth analysis.
            </div>
          ) : loading ? (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground">
              Loading growth analysis...
            </div>
          ) : growthRows.length ? (
            <div className="max-h-[480px] overflow-auto rounded-md border border-border/80">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead className="text-xs uppercase tracking-wide">Date</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">System</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide">Batch</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-right">ABW</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-right">Fish Sampled</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-right">Total Weight</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-right">Daily Gain</TableHead>
                    <TableHead className="text-xs uppercase tracking-wide text-right">Post-Transfer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {growthRows.map((row) => (
                    <TableRow
                      key={`${row.systemId}-${row.date ?? "latest"}`}
                      className="cursor-pointer hover:bg-muted/35"
                      onClick={() => onSelectHistorySystem(row.systemId)}
                    >
                      <TableCell className="font-medium">{row.date ?? "--"}</TableCell>
                      <TableCell>{row.systemName}</TableCell>
                      <TableCell>{row.batchId ?? "-"}</TableCell>
                      <TableCell className="text-right">{formatWithUnit(row.abw, 1, "g")}</TableCell>
                      <TableCell className="text-right">{row.fishSampled ?? "--"}</TableCell>
                      <TableCell className="text-right">{formatWithUnit(row.totalWeight, 1, "kg")}</TableCell>
                      <TableCell className="text-right">{formatWithUnit(row.dailyGain, 2, "g/day")}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            row.transferStatus === "Growth check"
                              ? "text-chart-4 font-semibold"
                              : row.transferStatus === "OK"
                                ? "text-chart-2 font-semibold"
                                : "text-muted-foreground"
                          }
                        >
                          {row.transferStatus}
                        </span>
                        {row.transferDate ? (
                          <span className="block text-[11px] text-muted-foreground">{row.transferDate}</span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              No sampling records matched the current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
