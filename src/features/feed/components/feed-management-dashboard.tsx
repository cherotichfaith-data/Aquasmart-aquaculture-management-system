"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions, TooltipItem } from "chart.js"
import { AlertTriangle, Info } from "lucide-react"
import { Badge } from "@/components/app-ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/app-ui/table"
import { Doughnut, Line, Scatter } from "@/components/charts/chartjs"
import {
  buildCartesianOptions,
  buildMetricAxisBounds,
  chartTooltipOptions,
  getChartPalette,
  readCssVar,
  withAlpha,
} from "@/components/charts/chartjs-theme"
import { DataFetchingBadge, EmptyState } from "@/components/shared/data-states"
import { formatDateOnly, formatNumberValue } from "@/lib/analytics-format"
import {
  FEEDING_RESPONSE_LEVEL_COLOR_VARS,
  FEEDING_RESPONSE_LEVELS,
  parseFeedingResponseLevel,
  type FeedingResponseLabel,
} from "@/lib/feeding-response"
import type {
  FeedDashboardKpiRow,
  FeedEfcrTrendRow,
  FeedPlanVsActualRow,
  FeedVsBiomassGainRow,
  FeedingAlertRow,
  FeedingRateVsTargetRow,
  FeedingResponseDistributionRow,
  SystemFeedStatusRow,
} from "@/features/feed/types"

const numeric = (value: number | string | null | undefined) => {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function SectionCard({
  title,
  children,
  isLoading,
}: {
  title: string
  children: React.ReactNode
  isLoading?: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <DataFetchingBadge isFetching={Boolean(isLoading)} isLoading={isLoading} />
        </div>
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  )
}

function KpiCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string
  value: string
  suffix?: string
  accent?: React.ReactNode
}) {
  return (
    <div className="panel-surface h-full rounded-2xl px-4 py-3">
      <div className="flex h-full flex-col justify-center gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-bold tracking-[-0.04em]">{value}</span>
            {suffix ? <span className="pb-0.5 text-sm text-muted-foreground">{suffix}</span> : null}
          </div>
          {accent ? <div>{accent}</div> : null}
        </div>
      </div>
    </div>
  )
}

function FeedKpiOverview({
  row,
  isLoading,
}: {
  row: FeedDashboardKpiRow | null
  isLoading?: boolean
}) {
  const feedUsedToday = formatNumberValue(numeric(row?.feed_used_today_kg), { decimals: 1 })
  const feedThisPeriod = formatNumberValue(numeric(row?.feed_this_period_kg), { decimals: 1 })
  const planVsActual = formatNumberValue(numeric(row?.plan_vs_actual_pct), { decimals: 1 })
  const avgRate = formatNumberValue(numeric(row?.avg_feeding_rate_pct), { decimals: 2 })
  const overfeedingSystems = numeric(row?.overfeeding_systems)
  const underfeedingSystems = numeric(row?.underfeeding_systems)
  const flaggedSystems =
    overfeedingSystems != null && underfeedingSystems != null
      ? overfeedingSystems + underfeedingSystems
      : null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <div>
        <KpiCard label="Feed Used Today" value={feedUsedToday} suffix="kg" />
      </div>
      <div>
        <KpiCard label="Feed This Period" value={feedThisPeriod} suffix="kg" />
      </div>
      <div>
        <KpiCard label="Plan vs Actual" value={planVsActual} suffix="%" />
      </div>
      <div>
        <KpiCard label="Avg Feeding Rate" value={avgRate} suffix="% BW/day" />
      </div>
      <div>
        <KpiCard
          label="Over/Underfeeding Systems"
          value={formatNumberValue(flaggedSystems, { decimals: 0 })}
          accent={
            overfeedingSystems != null && underfeedingSystems != null ? (
              <p className="text-right text-sm text-muted-foreground">
                <span style={{ color: "var(--color-warning)" }}>
                  {formatNumberValue(overfeedingSystems, { decimals: 0 })} Over
                </span>
                {" / "}
                <span style={{ color: "var(--color-destructive)" }}>
                  {formatNumberValue(underfeedingSystems, { decimals: 0 })} Under
                </span>
              </p>
            ) : null
          }
        />
      </div>
      {!row && !isLoading ? (
        <div className="col-span-full">
          <EmptyState
            title="No feed dashboard records"
            description="The selected scope does not yet have feed dashboard records."
          />
        </div>
      ) : null}
    </div>
  )
}

function FeedPlanVsActualChart({
  rows,
  isLoading,
}: {
  rows: FeedPlanVsActualRow[]
  isLoading?: boolean
}) {
  const palette = getChartPalette()
  const chartRows = useMemo(
    () =>
      rows.map((row) => ({
        label: formatDateOnly(row.date, row.date, { month: "short", day: "numeric" }),
        planned: numeric(row.planned_feed_kg),
        actual: numeric(row.actual_feed_kg),
      })),
    [rows],
  )
  const bounds = useMemo(
    () => buildMetricAxisBounds(chartRows.flatMap((row) => [row.planned, row.actual]), { includeZero: true, minFloor: 0 }),
    [chartRows],
  )
  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: chartRows.map((row) => row.label),
      datasets: [
        {
          label: "Planned Feed",
          data: chartRows.map((row) => row.planned),
          borderColor: palette.chart1,
          backgroundColor: withAlpha(palette.chart1, 0.14),
          pointBackgroundColor: palette.chart1,
          fill: false,
        },
        {
          label: "Actual Feed",
          data: chartRows.map((row) => row.actual),
          borderColor: palette.chart4,
          backgroundColor: withAlpha(palette.chart4, 0.14),
          pointBackgroundColor: palette.chart4,
          fill: false,
        },
      ],
    }),
    [chartRows, palette.chart1, palette.chart4],
  )
  const options = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        min: bounds.min,
        max: bounds.max,
        yTitle: "Feed (kg)",
        yTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 1 }),
      }),
    [bounds.max, bounds.min, palette],
  )

  return (
    <SectionCard title="Feed Plan vs Actual" isLoading={isLoading}>
      {isLoading ? (
        <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">Loading feed plan data...</div>
      ) : chartRows.length === 0 ? (
        <EmptyState title="No plan-vs-actual feed data" description="Try a wider date range or different system scope." />
      ) : (
        <div className="chart-canvas-shell h-[320px]">
          <Line data={data} options={options} />
        </div>
      )}
    </SectionCard>
  )
}

function statusColor(status: string | null | undefined) {
  if (status === "OVERFEED") return { bg: "color-mix(in srgb, var(--color-warning) 14%, transparent)", fg: "var(--color-warning)" }
  if (status === "UNDERFEED") return { bg: "color-mix(in srgb, var(--color-destructive) 14%, transparent)", fg: "var(--color-destructive)" }
  if (status === "WARNING") return { bg: "color-mix(in srgb, var(--color-warning) 18%, transparent)", fg: "var(--color-warning)" }
  return { bg: "color-mix(in srgb, var(--color-success) 14%, transparent)", fg: "var(--color-success)" }
}

function SystemFeedStatusTable({
  rows,
  isLoading,
}: {
  rows: SystemFeedStatusRow[]
  isLoading?: boolean
}) {
  return (
    <SectionCard title="System Feed Status" isLoading={isLoading}>
      {isLoading ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Loading system feed status...</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No system feed status rows" description="The selected scope does not have feed status rows yet." />
      ) : (
        <div className="grid gap-3 md:hidden">
          {rows.map((row) => {
            const tone = statusColor(row.status)
            return (
              <div
                key={`${row.system_id}:${row.date}`}
                className="w-full rounded-lg border border-border/70 bg-background p-3 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5 text-foreground">{row.system_name}</p>
                    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{formatDateOnly(row.date)}</p>
                  </div>
                  {row.status ? (
                    <Badge
                      className="border-transparent font-bold"
                      style={{ backgroundColor: tone.bg, color: tone.fg }}
                    >
                      {row.status}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    ["Biomass", formatNumberValue(numeric(row.biomass_kg), { decimals: 1 })],
                    ["Planned Feed", formatNumberValue(numeric(row.planned_feed_kg), { decimals: 1 })],
                    ["Actual Feed", formatNumberValue(numeric(row.actual_feed_kg), { decimals: 1 })],
                    ["Deviation", formatNumberValue(numeric(row.deviation_pct), { decimals: 1 })],
                    ["Feeding Rate", formatNumberValue(numeric(row.feeding_rate_pct), { decimals: 2 })],
                    ["eFCR", formatNumberValue(numeric(row.efcr_period), { decimals: 2 })],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md bg-muted/45 px-2.5 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                      <div className="mt-0.5 font-semibold text-foreground">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {!isLoading && rows.length > 0 ? (
        <div className="soft-table-shell hidden max-h-[480px] md:block">
          <Table className="min-w-[980px] table-fixed">
            <TableHeader className="bg-muted/60">
              <TableRow>
                <TableHead className="w-[180px]">System</TableHead>
                <TableHead align="right">Biomass (kg)</TableHead>
                <TableHead align="right">Planned Feed</TableHead>
                <TableHead align="right">Actual Feed</TableHead>
                <TableHead align="right">Deviation (%)</TableHead>
                <TableHead align="right">Feeding Rate</TableHead>
                <TableHead align="right">eFCR</TableHead>
                <TableHead align="right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const tone = statusColor(row.status)
                return (
                  <TableRow
                    key={`${row.system_id}:${row.date}`}
                    className="group odd:bg-muted/15 even:bg-background hover:bg-muted/35"
                  >
                    <TableCell className="align-top">
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold leading-5 text-foreground">{row.system_name}</p>
                        <div className="text-[11px] text-muted-foreground">{formatDateOnly(row.date)}</div>
                      </div>
                    </TableCell>
                    <TableCell align="right" className="font-medium text-foreground">{formatNumberValue(numeric(row.biomass_kg), { decimals: 1 })}</TableCell>
                    <TableCell align="right" className="font-medium text-foreground">{formatNumberValue(numeric(row.planned_feed_kg), { decimals: 1 })}</TableCell>
                    <TableCell align="right" className="font-medium text-foreground">{formatNumberValue(numeric(row.actual_feed_kg), { decimals: 1 })}</TableCell>
                    <TableCell align="right" className="font-medium text-foreground">{formatNumberValue(numeric(row.deviation_pct), { decimals: 1 })}</TableCell>
                    <TableCell align="right" className="font-medium text-foreground">{formatNumberValue(numeric(row.feeding_rate_pct), { decimals: 2 })}</TableCell>
                    <TableCell align="right" className="font-medium text-foreground">{formatNumberValue(numeric(row.efcr_period), { decimals: 2 })}</TableCell>
                    <TableCell align="right">
                      {row.status ? (
                        <Badge
                          className="border-transparent font-bold"
                          style={{ backgroundColor: tone.bg, color: tone.fg }}
                        >
                          {row.status}
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </SectionCard>
  )
}

function EfcrTrendChart({
  rows,
  isLoading,
}: {
  rows: FeedEfcrTrendRow[]
  isLoading?: boolean
}) {
  const palette = getChartPalette()
  const chartRows = useMemo(
    () =>
      rows.map((row) => ({
        label: formatDateOnly(row.date, row.date, { month: "short", day: "numeric" }),
        value: numeric(row.efcr_period),
      })),
    [rows],
  )
  const bounds = useMemo(
    () => buildMetricAxisBounds(chartRows.map((row) => row.value), { includeZero: false, minFloor: 0 }),
    [chartRows],
  )
  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: chartRows.map((row) => row.label),
      datasets: [
        {
          label: "eFCR",
          data: chartRows.map((row) => row.value),
          borderColor: palette.chart1,
          backgroundColor: withAlpha(palette.chart1, 0.12),
          pointBackgroundColor: palette.chart1,
          fill: true,
        },
      ],
    }),
    [chartRows, palette.chart1],
  )
  const options = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        min: bounds.min,
        max: bounds.max,
        yTitle: "eFCR",
        yTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 2 }),
      }),
    [bounds.max, bounds.min, palette],
  )

  return (
    <SectionCard title="eFCR Trend" isLoading={isLoading}>
      {isLoading ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Loading eFCR trend...</div>
      ) : chartRows.length === 0 ? (
        <EmptyState title="No eFCR trend available" description="No eFCR periods were found in this scope and date range." />
      ) : (
        <div className="chart-canvas-shell h-[280px]">
          <Line data={data} options={options} />
        </div>
      )}
    </SectionCard>
  )
}

function FeedingRateVsTargetChart({
  rows,
  isLoading,
}: {
  rows: FeedingRateVsTargetRow[]
  isLoading?: boolean
}) {
  const palette = getChartPalette()
  const chartRows = useMemo(
    () =>
      rows.map((row) => ({
        label: formatDateOnly(row.date, row.date, { month: "short", day: "numeric" }),
        actual: numeric(row.actual_rate),
        min: numeric(row.feed_rate_min_pct),
        max: numeric(row.feed_rate_max_pct),
      })),
    [rows],
  )
  const bounds = useMemo(
    () =>
      buildMetricAxisBounds(
        chartRows.flatMap((row) => [row.actual, row.min, row.max]),
        { includeZero: true, minFloor: 0 },
      ),
    [chartRows],
  )
  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: chartRows.map((row) => row.label),
      datasets: [
        {
          label: "Target Min",
          data: chartRows.map((row) => row.min),
          borderColor: withAlpha(palette.border, 0.95),
          backgroundColor: "transparent",
          pointRadius: 0,
          pointHoverRadius: 0,
        },
        {
          label: "Target Band",
          data: chartRows.map((row) => row.max),
          borderColor: withAlpha(palette.primary, 0.32),
          backgroundColor: withAlpha(palette.primary, 0.1),
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: "-1",
        },
        {
          label: "Actual Rate",
          data: chartRows.map((row) => row.actual),
          borderColor: palette.chart4,
          backgroundColor: withAlpha(palette.chart4, 0.12),
          pointBackgroundColor: palette.chart4,
          fill: false,
        },
      ],
    }),
    [chartRows, palette.border, palette.chart4, palette.primary],
  )
  const options = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        min: bounds.min,
        max: bounds.max,
        yTitle: "Rate (% BW/day)",
        yTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 2 }),
      }),
    [bounds.max, bounds.min, palette],
  )

  return (
    <SectionCard title="Feeding Rate vs Target" isLoading={isLoading}>
      {isLoading ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Loading feeding-rate band...</div>
      ) : chartRows.length === 0 ? (
        <EmptyState title="No feeding-rate band data" description="No model output exists for the selected date range." />
      ) : (
        <div className="chart-canvas-shell h-[280px]">
          <Line data={data} options={options} />
        </div>
      )}
    </SectionCard>
  )
}

function FeedingResponseCard({
  rows,
  isLoading,
}: {
  rows: FeedingResponseDistributionRow[]
  isLoading?: boolean
}) {
  const palette = getChartPalette()
  const normalizedRows = (() => {
    const counts = new Map<FeedingResponseLabel, number>()
    rows.forEach((row) => {
      const level = parseFeedingResponseLevel(row.feeding_response)
      if (level == null) return
      const label = FEEDING_RESPONSE_LEVELS[level - 1].label
      const nextCount = numeric(row.count)
      if (nextCount == null) return
      const currentCount = counts.get(label)
      counts.set(label, currentCount == null ? nextCount : currentCount + nextCount)
    })
    return FEEDING_RESPONSE_LEVELS
      .filter((item) => counts.has(item.label))
      .map((item) => ({ label: item.label, count: counts.get(item.label)! }))
  })()
  const hasData = normalizedRows.some((row) => row.count > 0)
  const data = useMemo<ChartData<"doughnut">>(
    () => ({
      labels: normalizedRows.map((row) => row.label),
      datasets: [
        {
          data: normalizedRows.map((row) => row.count),
          backgroundColor: normalizedRows.map((row) =>
            readCssVar(FEEDING_RESPONSE_LEVEL_COLOR_VARS[row.label], palette.muted),
          ),
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    }),
    [normalizedRows, palette.muted],
  )
  const options = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: palette.muted,
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 10,
            boxHeight: 10,
            padding: 12,
            font: { size: 11, weight: 500 },
          },
        },
        tooltip: chartTooltipOptions(palette, {
          callbacks: {
            label: (context: TooltipItem<"doughnut">) =>
              `${context.label}: ${formatNumberValue(Number(context.parsed), { decimals: 0 })} sessions`,
          },
        }),
      },
    }),
    [palette],
  )

  return (
    <SectionCard title="Feeding Response" isLoading={isLoading}>
      {isLoading ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Loading feeding responses...</div>
      ) : !hasData ? (
        <EmptyState title="No feeding responses recorded" description="Feeding sessions in this scope do not have response values yet." />
      ) : (
        <div className="chart-canvas-shell h-[280px]">
          <Doughnut data={data} options={options} />
        </div>
      )}
    </SectionCard>
  )
}

function FeedVsBiomassGainChart({
  rows,
  isLoading,
}: {
  rows: FeedVsBiomassGainRow[]
  isLoading?: boolean
}) {
  const palette = getChartPalette()
  const points = useMemo(
    () =>
      rows
        .map((row) => ({ x: numeric(row.feed_kg), y: numeric(row.biomass_gain_kg) }))
        .filter((row): row is { x: number; y: number } => row.x != null && row.y != null),
    [rows],
  )
  const boundsX = useMemo(() => buildMetricAxisBounds(points.map((row) => row.x), { includeZero: true, minFloor: 0 }), [points])
  const boundsY = useMemo(() => buildMetricAxisBounds(points.map((row) => row.y), { includeZero: true, minFloor: 0 }), [points])
  const data = useMemo<ChartData<"scatter">>(
    () => ({
      datasets: [
        {
          label: "Feed vs Biomass Gain",
          data: points,
          backgroundColor: withAlpha(palette.chart1, 0.9),
          borderColor: palette.chart1,
          pointRadius: 4,
          pointHoverRadius: 5,
        },
      ],
    }),
    [palette.chart1, points],
  )
  const options = useMemo<ChartOptions<"scatter">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        xMin: boundsX.min,
        xMax: boundsX.max,
        min: boundsY.min,
        max: boundsY.max,
        xTitle: "Feed Given (kg)",
        yTitle: "Biomass Gain (kg)",
        xTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 0 }),
        yTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 0 }),
      }),
    [boundsX.max, boundsX.min, boundsY.max, boundsY.min, palette],
  )

  return (
    <SectionCard title="Feed vs Biomass Gain" isLoading={isLoading}>
      {isLoading ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Loading feed-gain relationship...</div>
      ) : points.length === 0 ? (
        <EmptyState title="No feed vs biomass gain points" description="This scope does not yet have overlapping feed and biomass-gain records." />
      ) : (
        <div className="chart-canvas-shell h-[280px]">
          <Scatter data={data} options={options} />
        </div>
      )}
    </SectionCard>
  )
}

function FeedAlertsPanel({
  rows,
  isLoading,
}: {
  rows: FeedingAlertRow[]
  isLoading?: boolean
}) {
  return (
    <SectionCard title="Alerts & Actions" isLoading={isLoading}>
      {isLoading ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Loading feed alerts...</div>
      ) : rows.length === 0 ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-[color-mix(in_srgb,var(--color-success)_20%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] px-4 py-3 text-sm">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>No current feed-management alerts in this scope.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const critical = row.severity === "critical"
            return (
              <div
                key={`${row.system_id}:${row.alert}:${row.date}`}
                className={cn(
                  "flex items-start gap-2.5 rounded-2xl border px-4 py-3",
                  critical
                    ? "border-[color-mix(in_srgb,var(--color-destructive)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-destructive)_8%,transparent)]"
                    : "border-[color-mix(in_srgb,var(--color-warning)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_8%,transparent)]",
                )}
              >
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {row.system_name}: {row.alert}
                  </p>
                  <p className="mt-1 block text-xs">
                    {row.recommendation} - {formatDateOnly(row.date)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

export function FeedManagementDashboard(props: {
  kpiRow: FeedDashboardKpiRow | null
  planRows: FeedPlanVsActualRow[]
  statusRows: SystemFeedStatusRow[]
  efcrRows: FeedEfcrTrendRow[]
  rateRows: FeedingRateVsTargetRow[]
  responseRows: FeedingResponseDistributionRow[]
  scatterRows: FeedVsBiomassGainRow[]
  alertRows: FeedingAlertRow[]
  kpiLoading?: boolean
  planLoading?: boolean
  statusLoading?: boolean
  efcrLoading?: boolean
  rateLoading?: boolean
  responseLoading?: boolean
  scatterLoading?: boolean
  alertsLoading?: boolean
}) {
  return (
    <div className="flex flex-col gap-4 p-3 md:p-4">
      <FeedKpiOverview row={props.kpiRow} isLoading={props.kpiLoading} />

      <FeedPlanVsActualChart rows={props.planRows} isLoading={props.planLoading} />

      <SystemFeedStatusTable rows={props.statusRows} isLoading={props.statusLoading} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EfcrTrendChart rows={props.efcrRows} isLoading={props.efcrLoading} />
        <FeedingRateVsTargetChart rows={props.rateRows} isLoading={props.rateLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FeedingResponseCard rows={props.responseRows} isLoading={props.responseLoading} />
        <FeedVsBiomassGainChart rows={props.scatterRows} isLoading={props.scatterLoading} />
        <FeedAlertsPanel rows={props.alertRows} isLoading={props.alertsLoading} />
      </div>
    </div>
  )
}
