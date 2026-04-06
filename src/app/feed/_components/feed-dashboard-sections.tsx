"use client"

import type { ReactNode } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import {
  Bar,
  Chart,
  Doughnut,
  Line,
} from "@/components/charts/chartjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatNumberValue } from "@/lib/analytics-format"
import type { FeedRunningStockRow } from "@/lib/api/reports"
import {
  FeedExceptionsRail,
  FeedFcrSection,
  FeedMatrixSection,
  FeedRateSection,
  FeedStockCompact,
  type FeedExceptionItem,
} from "../_lib/feed-sections"
import type { FcrInterval, FeedRatePoint } from "../_lib/feed-analytics"

export type SectionKey = "overview" | "cages" | "feed" | "operations"

const SECTION_OPTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "cages", label: "Per-cage performance" },
  { key: "feed", label: "Feed & FCR" },
  { key: "operations", label: "Operations" },
]

const chartCardClass = "rounded-2xl border border-border/80 bg-card shadow-sm"

type StatusTone = "good" | "warn" | "bad" | "info"

type OverviewTotals = {
  totalFeedKg: number
  totalHarvestKg: number
  totalMortality: number
  crudeFcr: number | null
}

type OverviewRow = {
  label: string
  feedKg: number
  harvestKg: number
  mortalityFish: number
  doAvg: number | null
}

type CageRow = {
  systemId: number
  label: string
  totalFeedKg: number
  totalHarvestKg: number
  crudeFcr: number | null
  latestAbw: number | null
  overallSgr: number | null
  totalMortality: number
  status: { label: string; tone: StatusTone }
}

type FeedTabMetrics = {
  feedNotInHarvestPct: number | null
}

type OperationsSummary = {
  criticalCount: number
  totalCount: number
}

function formatMetric(value: number | null | undefined, decimals = 1) {
  return formatNumberValue(value, { decimals, fallback: "N/A" })
}

function badgeClass(tone: StatusTone) {
  return tone === "good"
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : tone === "warn"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      : tone === "bad"
        ? "bg-red-500/15 text-red-700 dark:text-red-300"
        : "bg-sky-500/15 text-sky-700 dark:text-sky-300"
}

function KpiCard({
  value,
  label,
  tone = "default",
}: {
  value: string
  label: string
  tone?: "default" | StatusTone
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
  tone: StatusTone
  children: ReactNode
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
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
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

export function FeedDashboardTabs({
  section,
  onSectionChange,
}: {
  section: SectionKey
  onSectionChange: (value: SectionKey) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 border-b border-border/40 pb-1">
        {SECTION_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onSectionChange(option.key)}
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
  )
}

export function FeedDashboardError({
  errorMessage,
  onRetry,
}: {
  errorMessage: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
      <div className="font-semibold">Unable to load feed analytics</div>
      <div className="mt-1">{errorMessage}</div>
      <button type="button" onClick={onRetry} className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5">
        Retry
      </button>
    </div>
  )
}

export function FeedOverviewSection({
  overviewTotals,
  overviewRows,
  trendGranularityLabel,
  overviewComparisonData,
  overviewComparisonOptions,
  overviewMortalityData,
  overviewMortalityOptions,
  doTrendData,
  doTrendOptions,
}: {
  overviewTotals: OverviewTotals
  overviewRows: OverviewRow[]
  trendGranularityLabel: string
  overviewComparisonData: ChartData<"bar">
  overviewComparisonOptions: ChartOptions<"bar">
  overviewMortalityData: ChartData<"bar">
  overviewMortalityOptions: ChartOptions<"bar">
  doTrendData: ChartData<"line">
  doTrendOptions: ChartOptions<"line">
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard value={`${formatMetric(overviewTotals.totalFeedKg, 0)} kg`} label="Feed input" />
        <KpiCard value={`${formatMetric(overviewTotals.totalHarvestKg, 0)} kg`} label="Harvested" tone="good" />
        <KpiCard
          value={formatMetric(overviewTotals.crudeFcr, 2)}
          label="Farm FCR"
          tone={overviewTotals.crudeFcr != null && overviewTotals.crudeFcr > 2.5 ? "warn" : "good"}
        />
        <KpiCard
          value={`${formatMetric(overviewTotals.totalMortality, 0)} fish`}
          label="Total mortality"
          tone={overviewTotals.totalMortality > 100 ? "warn" : "good"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title={`Feed input vs harvest output by ${trendGranularityLabel} (kg)`}>
          {overviewRows.length === 0 ? (
            <EmptyChart label="No feed or harvest activity in the selected scope." />
          ) : (
            <div className="chart-canvas-shell h-[260px]">
              <Bar data={overviewComparisonData} options={overviewComparisonOptions} />
            </div>
          )}
        </ChartCard>

        <ChartCard title={`Mortality by ${trendGranularityLabel} (fish)`}>
          {overviewRows.length === 0 ? (
            <EmptyChart label="No mortality records in the selected scope." />
          ) : (
            <div className="chart-canvas-shell h-[260px]">
              <Bar data={overviewMortalityData} options={overviewMortalityOptions} />
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard title={`Dissolved oxygen trend (mean mg/L per ${trendGranularityLabel})`}>
        {overviewRows.every((row) => row.doAvg == null) ? (
          <EmptyChart label="No dissolved oxygen readings in the selected scope." />
        ) : (
          <div className="chart-canvas-shell h-[220px]">
            <Line data={doTrendData} options={doTrendOptions} />
          </div>
        )}
      </ChartCard>
    </div>
  )
}

export function FeedCagesSection({
  cageRows,
  maxCageFeed,
  harvestedCageRows,
  cageFcrData,
  cageFcrOptions,
  onSelectedHistorySystemIdChange,
}: {
  cageRows: CageRow[]
  maxCageFeed: number
  harvestedCageRows: CageRow[]
  cageFcrData: ChartData<any>
  cageFcrOptions: ChartOptions<"bar">
  onSelectedHistorySystemIdChange: (value: number | null) => void
}) {
  return (
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
                      <button
                        type="button"
                        onClick={() => onSelectedHistorySystemIdChange(row.systemId)}
                        className="font-semibold hover:underline"
                      >
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
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-1 text-xs font-semibold",
                          badgeClass(row.crudeFcr != null && row.crudeFcr > 2.5 ? "warn" : "good"),
                        )}
                      >
                        {row.crudeFcr != null ? formatMetric(row.crudeFcr, 2) : "--"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.latestAbw != null ? `${formatMetric(row.latestAbw, 1)} g` : "--"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-1 text-xs font-semibold",
                          badgeClass((row.overallSgr ?? 0) > 1.2 ? "good" : (row.overallSgr ?? 0) > 0.7 ? "warn" : "bad"),
                        )}
                      >
                        {row.overallSgr != null ? formatMetric(row.overallSgr, 3) : "--"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-1 text-xs font-semibold",
                          badgeClass(row.totalMortality > 200 ? "bad" : row.totalMortality > 50 ? "warn" : "good"),
                        )}
                      >
                        {formatMetric(row.totalMortality, 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-md px-2 py-1 text-xs font-semibold", badgeClass(row.status.tone))}>
                        {row.status.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ChartCard title="Crude FCR by cage vs benchmark">
        {harvestedCageRows.length === 0 ? (
          <EmptyChart label="No harvested cages in the selected scope." />
        ) : (
          <div className="chart-canvas-shell h-[260px]">
            <Chart type="bar" data={cageFcrData} options={cageFcrOptions} />
          </div>
        )}
      </ChartCard>
    </div>
  )
}

export function FeedAnalyticsSection({
  overviewTotals,
  feedTabMetrics,
  trendGranularityLabel,
  overviewRows,
  feedInputData,
  feedInputOptions,
  responseRows,
  responseData,
  responseOptions,
  feedTypeRows,
  feedTypeData,
  feedTypeOptions,
  loading,
  feedRatePoints,
  fcrIntervals,
  systemNameById,
}: {
  overviewTotals: OverviewTotals
  feedTabMetrics: FeedTabMetrics
  trendGranularityLabel: string
  overviewRows: OverviewRow[]
  feedInputData: ChartData<"bar">
  feedInputOptions: ChartOptions<"bar">
  responseRows: Array<{ name: string; value: number }>
  responseData: ChartData<"doughnut">
  responseOptions: ChartOptions<"doughnut">
  feedTypeRows: Array<{ label: string; kg: number }>
  feedTypeData: ChartData<"bar">
  feedTypeOptions: ChartOptions<"bar">
  loading: boolean
  feedRatePoints: FeedRatePoint[]
  fcrIntervals: FcrInterval[]
  systemNameById: Map<number, string>
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard value={`${formatMetric(overviewTotals.totalFeedKg, 0)} kg`} label="Feed used" />
        <KpiCard value={`${formatMetric(overviewTotals.totalHarvestKg, 0)} kg`} label="Harvest yield" tone="good" />
        <KpiCard
          value={formatMetric(overviewTotals.crudeFcr, 2)}
          label="Crude FCR"
          tone={overviewTotals.crudeFcr != null && overviewTotals.crudeFcr > 2.5 ? "warn" : "good"}
        />
        <KpiCard
          value={feedTabMetrics.feedNotInHarvestPct != null ? `${formatMetric(feedTabMetrics.feedNotInHarvestPct, 0)}%` : "--"}
          label="Feed not in harvest"
          tone="warn"
        />
      </div>

      <Callout tone="warn">
        <strong>Feed inventory signal.</strong> The current scope shows {formatMetric(overviewTotals.totalFeedKg, 0)} kg fed against {formatMetric(overviewTotals.totalHarvestKg, 0)} kg harvested. Use the response mix and FCR interval charts below to confirm whether feed conversion, staging, or delayed harvest is driving that gap.
      </Callout>

      <ChartCard title={`Feed input by ${trendGranularityLabel} (kg)`}>
        {overviewRows.length === 0 ? (
          <EmptyChart label="No feed records in the selected scope." />
        ) : (
          <div className="chart-canvas-shell h-[280px]">
            <Bar data={feedInputData} options={feedInputOptions} />
          </div>
        )}
      </ChartCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Response breakdown farm-wide">
          {responseRows.every((row) => row.value === 0) ? (
            <EmptyChart label="No feeding responses recorded in the selected scope." />
          ) : (
            <div className="chart-canvas-shell h-[220px]">
              <Doughnut data={responseData} options={responseOptions} />
            </div>
          )}
        </ChartCard>

        <ChartCard title="Feed type diversity (top types by volume)">
          {feedTypeRows.length === 0 ? (
            <EmptyChart label="No feed type usage recorded in the selected scope." />
          ) : (
            <div className="chart-canvas-shell h-[220px]">
              <Bar data={feedTypeData} options={feedTypeOptions} />
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <FeedRateSection loading={loading} points={feedRatePoints} systemNameById={systemNameById} />
        <FeedFcrSection loading={loading} intervals={fcrIntervals} systemNameById={systemNameById} />
      </div>
    </div>
  )
}

export function FeedOperationsSection({
  operationsSummary,
  loading,
  scopedSystemIdList,
  heatmapDates,
  matrixCells,
  systemNameById,
  onSelectedHistorySystemIdChange,
  exceptionItems,
  runningStockRows,
}: {
  operationsSummary: OperationsSummary
  loading: boolean
  scopedSystemIdList: number[]
  heatmapDates: string[]
  matrixCells: any[]
  systemNameById: Map<number, string>
  onSelectedHistorySystemIdChange: (value: number | null) => void
  exceptionItems: FeedExceptionItem[]
  runningStockRows: FeedRunningStockRow[]
}) {
  return (
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
  )
}
