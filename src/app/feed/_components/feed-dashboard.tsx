"use client"

import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatDateOnly, formatNumberValue } from "@/lib/analytics-format"
import type { Database } from "@/lib/types/database"
import type { FeedRunningStockRow, FeedingRecordWithType } from "@/lib/api/reports"
import type { DailyInventoryRow } from "@/features/feed/types"
import type { TimePeriod } from "@/lib/time-period"
import { diffDateDays, formatBucketLabel, formatGranularityLabel, getBucketGranularity, getBucketKey } from "@/lib/time-series"
import SystemHistorySheet from "@/components/systems/system-history-sheet"
import {
  FeedExceptionsRail,
  FeedFcrSection,
  FeedMatrixSection,
  FeedRateSection,
  FeedStockCompact,
  type FeedExceptionItem,
} from "../_lib/feed-sections"
import { normalizeFeedingResponse, type FcrInterval, type FeedRatePoint } from "../_lib/feed-analytics"
import { formatFeedTypeLabel } from "../_lib/feed-page"

type ProductionRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]

type GrowthRow = {
  system_id: number
  sample_date: string
  abw_g: number
  prev_abw_g: number
  sgr_pct_day: number
}

type SurvivalRow = {
  system_id: number
  event_date: string
  survival_pct: number | null
  daily_deaths: number
}

type MeasurementRow = {
  system_id: number | null
  date: string | null
  parameter_value: number | null
}

type SectionKey = "overview" | "cages" | "feed" | "operations"

const SECTION_OPTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "cages", label: "Per-cage performance" },
  { key: "feed", label: "Feed & FCR" },
  { key: "operations", label: "Operations" },
]

const RESPONSE_COLORS: Record<string, string> = {
  Excellent: "#3b82f6",
  Good: "#16a34a",
  Fair: "#f59e0b",
  Poor: "#dc2626",
}

const chartCardClass = "rounded-2xl border border-border/80 bg-card shadow-sm"

function formatMetric(value: number | null | undefined, decimals = 1) {
  return formatNumberValue(value, { decimals, fallback: "N/A" })
}

function KpiCard({
  value,
  label,
  tone = "default",
}: {
  value: string
  label: string
  tone?: "default" | "good" | "warn" | "bad" | "info"
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "bad"
          ? "text-red-600"
          : tone === "info"
            ? "text-sky-600"
            : "text-foreground"

  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 px-4 py-4 text-center">
      <div className={cn("text-2xl font-semibold leading-none", toneClass)}>{value}</div>
      <div className="mt-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
    </div>
  )
}

function Callout({
  tone,
  children,
}: {
  tone: "info" | "warn" | "good" | "bad"
  children: React.ReactNode
}) {
  const toneClass =
    tone === "info"
      ? "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200"
      : tone === "warn"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
        : tone === "good"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
          : "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200"

  return <div className={cn("rounded-xl border-l-4 px-4 py-3 text-sm leading-6", toneClass)}>{children}</div>
}

function ChartCard({
  title,
  children,
  description,
}: {
  title: string
  children: React.ReactNode
  description?: string
}) {
  return (
    <Card className={chartCardClass}>
      <CardHeader className="space-y-1 border-b border-border/70 pb-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  )
}

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">{label}</div>
}

export function FeedDashboard({
  timePeriod,
  errorMessage,
  onRetry,
  loading,
  scopedSystemIdList,
  systemNameById,
  exceptionItems,
  runningStockRows,
  feedingRecords,
  inventoryRows,
  productionRows,
  growthRows,
  survivalRows,
  measurements,
  feedRatePoints,
  fcrIntervals,
  latestFeedDate,
  minStockDays,
  lowGrowthCount,
  worstFcr,
  heatmapDates,
  matrixCells,
  selectedHistorySystemId,
  onSelectedHistorySystemIdChange,
  farmId,
  dateFrom,
  dateTo,
}: {
  timePeriod: TimePeriod
  errorMessage: string | null
  onRetry: () => void
  loading: boolean
  scopedSystemIdList: number[]
  systemNameById: Map<number, string>
  exceptionItems: FeedExceptionItem[]
  runningStockRows: FeedRunningStockRow[]
  feedingRecords: FeedingRecordWithType[]
  inventoryRows: DailyInventoryRow[]
  productionRows: ProductionRow[]
  growthRows: GrowthRow[]
  survivalRows: SurvivalRow[]
  measurements: MeasurementRow[]
  feedRatePoints: FeedRatePoint[]
  fcrIntervals: FcrInterval[]
  latestFeedDate: string | null
  minStockDays: number | null
  lowGrowthCount: number
  worstFcr: { label: string; value: number | null } | null
  heatmapDates: string[]
  matrixCells: any[]
  selectedHistorySystemId: number | null
  onSelectedHistorySystemIdChange: (value: number | null) => void
  farmId: string | null
  dateFrom: string | null
  dateTo: string | null
}) {
  const [section, setSection] = useState<SectionKey>("overview")
  const trendGranularity = useMemo(() => getBucketGranularity(timePeriod), [timePeriod])
  const trendGranularityLabel = useMemo(() => formatGranularityLabel(trendGranularity), [trendGranularity])

  const overviewTotals = useMemo(() => {
    const totalFeedKg = feedingRecords.reduce((sum, row) => sum + (row.feeding_amount ?? 0), 0)
    const totalHarvestKg = productionRows.reduce((sum, row) => sum + (row.total_weight_harvested ?? 0), 0)
    const totalMortality = productionRows.reduce((sum, row) => sum + (row.daily_mortality_count ?? 0), 0)
    const crudeFcr = totalHarvestKg > 0 ? totalFeedKg / totalHarvestKg : null
    return { totalFeedKg, totalHarvestKg, totalMortality, crudeFcr }
  }, [feedingRecords, productionRows])

  const overviewRows = useMemo(() => {
    const map = new Map<
      string,
      { bucket: string; feedKg: number; harvestKg: number; mortalityFish: number; doSum: number; doCount: number }
    >()
    feedingRecords.forEach((row) => {
      const key = getBucketKey(row.date, trendGranularity)
      if (!key) return
      const current = map.get(key) ?? { bucket: key, feedKg: 0, harvestKg: 0, mortalityFish: 0, doSum: 0, doCount: 0 }
      current.feedKg += row.feeding_amount ?? 0
      map.set(key, current)
    })
    productionRows.forEach((row) => {
      const key = getBucketKey(row.date, trendGranularity)
      if (!key) return
      const current = map.get(key) ?? { bucket: key, feedKg: 0, harvestKg: 0, mortalityFish: 0, doSum: 0, doCount: 0 }
      current.harvestKg += row.total_weight_harvested ?? 0
      current.mortalityFish += row.daily_mortality_count ?? 0
      map.set(key, current)
    })
    measurements.forEach((row) => {
      const key = getBucketKey(row.date, trendGranularity)
      if (!key || row.parameter_value == null) return
      const current = map.get(key) ?? { bucket: key, feedKg: 0, harvestKg: 0, mortalityFish: 0, doSum: 0, doCount: 0 }
      current.doSum += row.parameter_value
      current.doCount += 1
      map.set(key, current)
    })
    return Array.from(map.values())
      .sort((a, b) => a.bucket.localeCompare(b.bucket))
      .map((row) => ({
        ...row,
        label: formatBucketLabel(row.bucket, trendGranularity),
        doAvg: row.doCount > 0 ? row.doSum / row.doCount : null,
      }))
  }, [feedingRecords, measurements, productionRows, trendGranularity])

  const growthGroups = useMemo(() => {
    const map = new Map<number, GrowthRow[]>()
    growthRows.forEach((row) => {
      const list = map.get(row.system_id) ?? []
      list.push(row)
      map.set(row.system_id, list)
    })
    map.forEach((rows, systemId) => {
      map.set(
        systemId,
        rows.slice().sort((left, right) => String(left.sample_date).localeCompare(String(right.sample_date))),
      )
    })
    return map
  }, [growthRows])

  const latestInventoryBySystem = useMemo(() => {
    const map = new Map<number, DailyInventoryRow>()
    inventoryRows
      .slice()
      .sort((left, right) => String(right.inventory_date ?? "").localeCompare(String(left.inventory_date ?? "")))
      .forEach((row) => {
        if (row.system_id == null || map.has(row.system_id)) return
        map.set(row.system_id, row)
      })
    return map
  }, [inventoryRows])

  const cageRows = useMemo(() => {
    const feedBySystem = new Map<number, number>()
    feedingRecords.forEach((row) => {
      if (row.system_id == null) return
      feedBySystem.set(row.system_id, (feedBySystem.get(row.system_id) ?? 0) + (row.feeding_amount ?? 0))
    })

    const harvestBySystem = new Map<number, number>()
    const mortalityBySystem = new Map<number, number>()
    productionRows.forEach((row) => {
      if (row.system_id == null) return
      harvestBySystem.set(row.system_id, (harvestBySystem.get(row.system_id) ?? 0) + (row.total_weight_harvested ?? 0))
      mortalityBySystem.set(row.system_id, (mortalityBySystem.get(row.system_id) ?? 0) + (row.daily_mortality_count ?? 0))
    })

    return scopedSystemIdList.map((systemId) => {
      const growthSeries = growthGroups.get(systemId) ?? []
      const firstSample = growthSeries[0] ?? null
      const lastSample = growthSeries[growthSeries.length - 1] ?? null
      const latestInventory = latestInventoryBySystem.get(systemId) ?? null
      const initialAbw =
        firstSample?.prev_abw_g && firstSample.prev_abw_g > 0
          ? firstSample.prev_abw_g
          : firstSample?.abw_g ?? latestInventory?.abw_last_sampling ?? null
      const latestAbw = lastSample?.abw_g ?? latestInventory?.abw_last_sampling ?? null
      const overallDays = firstSample && lastSample ? diffDateDays(firstSample.sample_date, lastSample.sample_date) : null
      const overallSgr =
        initialAbw != null && latestAbw != null && overallDays != null && overallDays > 0 && initialAbw > 0 && latestAbw > 0
          ? ((Math.log(latestAbw) - Math.log(initialAbw)) / overallDays) * 100
          : lastSample?.sgr_pct_day ?? null
      const totalFeedKg = feedBySystem.get(systemId) ?? 0
      const totalHarvestKg = harvestBySystem.get(systemId) ?? 0
      const totalMortality = mortalityBySystem.get(systemId) ?? 0
      const crudeFcr = totalHarvestKg > 0 ? totalFeedKg / totalHarvestKg : null
      const status =
        totalHarvestKg > 0
          ? { label: "Harvested", tone: "good" as const }
          : (latestAbw ?? 0) >= 400
            ? { label: "Approaching market", tone: "warn" as const }
            : { label: "Growing", tone: "info" as const }

      return {
        systemId,
        label: systemNameById.get(systemId) ?? `System ${systemId}`,
        totalFeedKg,
        totalHarvestKg,
        crudeFcr,
        latestAbw,
        overallSgr,
        totalMortality,
        status,
        samples: growthSeries.length,
      }
    })
  }, [feedingRecords, growthGroups, latestInventoryBySystem, productionRows, scopedSystemIdList, systemNameById])

  const maxCageFeed = useMemo(() => Math.max(...cageRows.map((row) => row.totalFeedKg), 1), [cageRows])

  const responseRows = useMemo(() => {
    const counts = new Map<string, number>()
    feedingRecords.forEach((row) => {
      const normalized = normalizeFeedingResponse(row.feeding_response)
      if (!normalized) return
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
    })
    return ["Excellent", "Good", "Fair", "Poor"].map((label) => ({
      name: label,
      value: counts.get(label) ?? 0,
    }))
  }, [feedingRecords])

  const feedTypeRows = useMemo(() => {
    const totals = new Map<string, number>()
    feedingRecords.forEach((row) => {
      const label = formatFeedTypeLabel(row.feed_type ?? { id: row.feed_type_id })
      totals.set(label, (totals.get(label) ?? 0) + (row.feeding_amount ?? 0))
    })
    return Array.from(totals.entries())
      .map(([label, kg]) => ({ label, kg }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 6)
  }, [feedingRecords])

  const feedTabMetrics = useMemo(() => {
    const feedNotInHarvestPct =
      overviewTotals.totalFeedKg > 0
        ? Math.max(0, ((overviewTotals.totalFeedKg - overviewTotals.totalHarvestKg) / overviewTotals.totalFeedKg) * 100)
        : null
    return { feedNotInHarvestPct }
  }, [overviewTotals.totalFeedKg, overviewTotals.totalHarvestKg])

  const operationsSummary = useMemo(() => {
    const criticalCount = exceptionItems.filter((item) => item.severity === "critical").length
    return {
      criticalCount,
      totalCount: exceptionItems.length,
    }
  }, [exceptionItems])

  const badgeClass = (tone: "good" | "warn" | "bad" | "info") =>
    tone === "good"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : tone === "warn"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : tone === "bad"
          ? "bg-red-500/15 text-red-700 dark:text-red-300"
          : "bg-sky-500/15 text-sky-700 dark:text-sky-300"

  return (
    <>
      <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Feed performance dashboard</h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 border-b border-border/70">
          {SECTION_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSection(option.key)}
              className={cn(
                "border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
                section === option.key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          <div className="font-semibold">Unable to load feed analytics</div>
          <div className="mt-1">{errorMessage}</div>
          <button type="button" onClick={onRetry} className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5">
            Retry
          </button>
        </div>
      ) : null}

      {section === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard value={`${formatMetric(overviewTotals.totalFeedKg, 0)} kg`} label="Feed input" />
            <KpiCard value={`${formatMetric(overviewTotals.totalHarvestKg, 0)} kg`} label="Harvested" tone="good" />
            <KpiCard value={formatMetric(overviewTotals.crudeFcr, 2)} label="Farm eFCR" tone={overviewTotals.crudeFcr != null && overviewTotals.crudeFcr > 2.5 ? "warn" : "good"} />
            <KpiCard value={`${formatMetric(overviewTotals.totalMortality, 0)} fish`} label="Total mortality" tone={overviewTotals.totalMortality > 100 ? "warn" : "good"} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard title={`Feed input vs harvest output by ${trendGranularityLabel} (kg)`}>
              {overviewRows.length === 0 ? (
                <EmptyChart label="No feed or harvest activity in the selected scope." />
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={overviewRows}>
                      <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.35} />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [`${formatMetric(Number(value), 1)} kg`, String(name)]} />
                      <Legend />
                      <Bar dataKey="feedKg" name="Feed" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="harvestKg" name="Harvest" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title={`Mortality by ${trendGranularityLabel} (fish)`}>
              {overviewRows.length === 0 ? (
                <EmptyChart label="No mortality records in the selected scope." />
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overviewRows}>
                      <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.35} />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatMetric(Number(value), 0), "Mortality"]} />
                      <Bar dataKey="mortalityFish" name="Mortality" radius={[4, 4, 0, 0]}>
                        {overviewRows.map((row) => (
                          <Cell
                            key={row.bucket}
                            fill={row.mortalityFish > 250 ? "#dc2626" : row.mortalityFish > 50 ? "#f59e0b" : "#16a34a"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          <ChartCard title={`Dissolved oxygen trend (mean mg/L per ${trendGranularityLabel})`}>
            {overviewRows.every((row) => row.doAvg == null) ? (
              <EmptyChart label="No dissolved oxygen readings in the selected scope." />
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overviewRows}>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.35} />
                    <XAxis dataKey="label" />
                    <YAxis domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                    <Tooltip formatter={(value) => [`${formatMetric(Number(value), 2)} mg/L`, "DO mean"]} />
                    <Line type="monotone" dataKey="doAvg" stroke="var(--color-chart-1)" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>
      ) : null}

      {section === "cages" ? (
        <div className="space-y-6">
          <Callout tone="info">
            <strong>All-time summary per scoped cage.</strong> Crude FCR is computed from total feed divided by harvested kg where harvest exists. Last ABW uses the latest growth or inventory sample in scope. SGR uses the full observed growth series where possible.
          </Callout>

          <Card className={chartCardClass}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/20 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Cage</th>
                      <th className="px-4 py-3 text-left">Total feed (kg)</th>
                      <th className="px-4 py-3 text-left">Harvest (kg)</th>
                      <th className="px-4 py-3 text-left">Crude FCR</th>
                      <th className="px-4 py-3 text-left">Last ABW (g)</th>
                      <th className="px-4 py-3 text-left">SGR (%/day)</th>
                      <th className="px-4 py-3 text-left">Mortality (fish)</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cageRows.map((row) => (
                      <tr key={row.systemId} className="border-t border-border/70 transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => onSelectedHistorySystemIdChange(row.systemId)} className="font-semibold hover:underline">
                            {row.label}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span>{formatMetric(row.totalFeedKg, 0)} kg</span>
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-1.5 rounded-full bg-[var(--color-chart-1)]"
                                style={{ width: `${Math.max(8, (row.totalFeedKg / maxCageFeed) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{row.totalHarvestKg > 0 ? `${formatMetric(row.totalHarvestKg, 0)} kg` : "--"}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex rounded-md px-2 py-1 text-xs font-semibold", badgeClass(row.crudeFcr != null && row.crudeFcr > 2.5 ? "warn" : "good"))}>
                            {row.crudeFcr != null ? formatMetric(row.crudeFcr, 2) : "--"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{row.latestAbw != null ? `${formatMetric(row.latestAbw, 1)} g` : "--"}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex rounded-md px-2 py-1 text-xs font-semibold", badgeClass((row.overallSgr ?? 0) > 1.2 ? "good" : (row.overallSgr ?? 0) > 0.7 ? "warn" : "bad"))}>
                            {row.overallSgr != null ? formatMetric(row.overallSgr, 3) : "--"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex rounded-md px-2 py-1 text-xs font-semibold", badgeClass(row.totalMortality > 200 ? "bad" : row.totalMortality > 50 ? "warn" : "good"))}>
                            {formatMetric(row.totalMortality, 0)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex rounded-md px-2 py-1 text-xs font-semibold", badgeClass(row.status.tone))}>{row.status.label}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <ChartCard title="Crude FCR by cage vs benchmark">
            {cageRows.filter((row) => row.totalHarvestKg > 0 && row.crudeFcr != null).length === 0 ? (
              <EmptyChart label="No harvested cages in the selected scope." />
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cageRows.filter((row) => row.totalHarvestKg > 0 && row.crudeFcr != null)}>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.35} />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatMetric(Number(value), 2), "Crude FCR"]} />
                    <Legend />
                    <Bar dataKey="crudeFcr" name="Crude FCR" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey={() => 2} name="Benchmark 2.0" stroke="var(--color-chart-2)" strokeDasharray="4 4" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>
      ) : null}

      {section === "feed" ? (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard value={`${formatMetric(overviewTotals.totalFeedKg, 0)} kg`} label="Feed used" />
            <KpiCard value={`${formatMetric(overviewTotals.totalHarvestKg, 0)} kg`} label="Harvest yield" tone="good" />
            <KpiCard value={formatMetric(overviewTotals.crudeFcr, 2)} label="Crude FCR" tone={overviewTotals.crudeFcr != null && overviewTotals.crudeFcr > 2.5 ? "warn" : "good"} />
            <KpiCard value={feedTabMetrics.feedNotInHarvestPct != null ? `${formatMetric(feedTabMetrics.feedNotInHarvestPct, 0)}%` : "--"} label="Feed not in harvest" tone="warn" />
          </div>

          <Callout tone="warn">
            <strong>Feed inventory signal.</strong> The current scope shows {formatMetric(overviewTotals.totalFeedKg, 0)} kg fed against {formatMetric(overviewTotals.totalHarvestKg, 0)} kg harvested. Use the response mix and FCR interval charts below to confirm whether feed conversion, staging, or delayed harvest is driving that gap.
          </Callout>

          <ChartCard title={`Feed input by ${trendGranularityLabel} (kg)`}>
            {overviewRows.length === 0 ? (
              <EmptyChart label="No feed records in the selected scope." />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overviewRows}>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.35} />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${formatMetric(Number(value), 1)} kg`, "Feed"]} />
                    <Bar dataKey="feedKg" name="Feed" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard title="Response breakdown farm-wide">
              {responseRows.every((row) => row.value === 0) ? (
                <EmptyChart label="No feeding responses recorded in the selected scope." />
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={responseRows} dataKey="value" nameKey="name" innerRadius={46} outerRadius={74} paddingAngle={2}>
                        {responseRows.map((row) => (
                          <Cell key={row.name} fill={RESPONSE_COLORS[row.name]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatMetric(Number(value), 0), "Sessions"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Feed type diversity (top types by volume)">
              {feedTypeRows.length === 0 ? (
                <EmptyChart label="No feed type usage recorded in the selected scope." />
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={feedTypeRows} layout="vertical">
                      <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.35} />
                      <XAxis type="number" />
                      <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value) => [`${formatMetric(Number(value), 1)} kg`, "Feed volume"]} />
                      <Bar dataKey="kg" fill="var(--color-chart-4)" radius={[4, 4, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <FeedRateSection loading={loading} points={feedRatePoints} systemNameById={systemNameById} />
            <FeedFcrSection loading={loading} intervals={fcrIntervals} systemNameById={systemNameById} />
          </div>
        </div>
      ) : null}

      {section === "operations" ? (
        <div className="space-y-6">
          <Callout tone={operationsSummary.criticalCount > 0 ? "bad" : "info"}>
            <strong>{operationsSummary.totalCount} operational exceptions in scope.</strong> {operationsSummary.criticalCount > 0 ? `${operationsSummary.criticalCount} are critical and should be investigated first.` : "No critical exceptions are currently open."}
          </Callout>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
            <FeedMatrixSection
              loading={loading}
              systemIds={scopedSystemIdList}
              dates={heatmapDates}
              cells={matrixCells}
              systemNameById={systemNameById}
              onSystemSelect={onSelectedHistorySystemIdChange}
            />
            <div className="space-y-6">
              <FeedExceptionsRail loading={loading} items={exceptionItems} onSystemSelect={onSelectedHistorySystemIdChange} />
              <FeedStockCompact rows={runningStockRows} />
            </div>
          </div>
        </div>
      ) : null}

      <SystemHistorySheet
        open={selectedHistorySystemId !== null}
        onOpenChange={(open) => !open && onSelectedHistorySystemIdChange(null)}
        farmId={farmId}
        systemId={selectedHistorySystemId}
        systemLabel={selectedHistorySystemId != null ? (systemNameById.get(selectedHistorySystemId) ?? null) : null}
        dateFrom={dateFrom ?? undefined}
        dateTo={dateTo ?? undefined}
      />
    </>
  )
}
