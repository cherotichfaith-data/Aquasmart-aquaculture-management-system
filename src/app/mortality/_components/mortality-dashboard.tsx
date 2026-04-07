"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import {
  Bar,
  Chart,
  Line,
} from "@/components/charts/chartjs"
import { AlertTriangle, Search, Skull, TrendingDown, Waves } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/shared/data-states"
import {
  buildCartesianOptions,
  buildDailyDateDomain,
  buildMetricAxisBounds,
  getChartPalette,
  getDateAxisMaxTicks,
} from "@/components/charts/chartjs-theme"
import type { Tables } from "@/lib/types/database"
import { isMortalityCause, MORTALITY_CAUSES } from "@/lib/mortality"
import { cn } from "@/lib/utils"
import type {
  DriverItem,
  InvestigationStatus,
  MortalityDriverTrendRow,
  MortalityKpis,
  MortalityRiskRow,
} from "../mortality-selectors"
import {
  CAUSE_LABELS,
  formatDateLabel,
  formatDateTime,
  formatNumber,
  investigationBadgeClass,
  INVESTIGATION_OPTIONS,
  riskBadgeClass,
  severityVariant,
  trendLabel,
} from "../_lib/presentation"

type AlertLogRow = Tables<"alert_log">
type MortalityEventRow = Tables<"fish_mortality">

type SurvivalTrendPoint = {
  date: string
  liveCount: number
  survivalPct: number | null
}

type DeathsTrendPoint = {
  date: string
  deaths: number
}

type LatestReading = {
  doValue: number | null
}

const getMaxNumber = (values: Array<number | null | undefined>, fallback = 1) => {
  const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  return numeric.length ? Math.max(...numeric) : fallback
}

const getMinNumber = (values: Array<number | null | undefined>, fallback = 0) => {
  const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  return numeric.length ? Math.min(...numeric) : fallback
}

export function MortalityDashboard({
  kpis,
  loading,
  riskRows,
  alerts,
  driverItems,
  investigationCounts,
  deathsTrend,
  survivalTrend,
  driverTrend,
  latestEvent,
  events,
  latestReadingsBySystem,
  systemNameById,
  onSelectHistorySystem,
  onInvestigationStatusChange,
}: {
  kpis: MortalityKpis
  loading: boolean
  riskRows: MortalityRiskRow[]
  alerts: AlertLogRow[]
  driverItems: DriverItem[]
  investigationCounts: Record<InvestigationStatus, number>
  deathsTrend: DeathsTrendPoint[]
  survivalTrend: SurvivalTrendPoint[]
  driverTrend: MortalityDriverTrendRow[]
  latestEvent: MortalityEventRow | null
  events: MortalityEventRow[]
  latestReadingsBySystem: Map<number, LatestReading>
  systemNameById: Map<number, string>
  onSelectHistorySystem: (systemId: number) => void
  onInvestigationStatusChange: (systemId: number, status: InvestigationStatus) => void
}) {
  const palette = getChartPalette()
  const deathsDateDomain = useMemo(() => buildDailyDateDomain(deathsTrend.map((row) => row.date)), [deathsTrend])
  const deathsByDate = useMemo(() => new Map(deathsTrend.map((row) => [row.date, row])), [deathsTrend])
  const deathsXAxisLimit = getDateAxisMaxTicks(deathsDateDomain.length)
  const survivalDateDomain = useMemo(() => buildDailyDateDomain(survivalTrend.map((row) => row.date)), [survivalTrend])
  const survivalByDate = useMemo(() => new Map(survivalTrend.map((row) => [row.date, row])), [survivalTrend])
  const survivalXAxisLimit = getDateAxisMaxTicks(survivalDateDomain.length)
  const driverDateDomain = useMemo(() => buildDailyDateDomain(driverTrend.map((row) => row.date)), [driverTrend])
  const driverByDate = useMemo(() => new Map(driverTrend.map((row) => [row.date, row])), [driverTrend])
  const driverXAxisLimit = getDateAxisMaxTicks(driverDateDomain.length)

  const deathsData = useMemo<ChartData<"bar">>(
    () => ({
      labels: deathsDateDomain,
      datasets: [
        {
          label: "Deaths",
          data: deathsDateDomain.map((date) => deathsByDate.get(date)?.deaths ?? 0),
          backgroundColor: palette.destructive,
          borderRadius: 6,
        },
      ],
    }),
    [deathsByDate, deathsDateDomain, palette.destructive],
  )

  const deathsOptions = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        min: 0,
        max: buildMetricAxisBounds(deathsTrend.map((row) => row.deaths), { includeZero: true }).max,
        xMaxTicksLimit: deathsXAxisLimit,
        xTitle: "Date",
        yTickFormatter: (value) => Number(value).toLocaleString(),
        yTitle: "Deaths",
        tooltip: {
          callbacks: {
            title: (items: any) => formatDateLabel(String(deathsDateDomain[items[0]?.dataIndex ?? 0] ?? "")),
            label: (context: any) => `Deaths: ${Number(context.parsed.y).toLocaleString()}`,
          },
        },
        xTickFormatter: (_value, index) => formatDateLabel(String(deathsDateDomain[index] ?? "")),
      }),
    [deathsDateDomain, deathsTrend, deathsXAxisLimit, palette],
  )

  const survivalData = useMemo<ChartData<"line">>(
    () => ({
      labels: survivalDateDomain,
      datasets: [
        {
          label: "Live count",
          data: survivalDateDomain.map((date) => survivalByDate.get(date)?.liveCount ?? null),
          borderColor: palette.chart2,
          backgroundColor: palette.chart2,
          borderWidth: 2.3,
          pointRadius: 0,
          spanGaps: true,
          yAxisID: "y",
        },
        {
          label: "Survival (%)",
          data: survivalDateDomain.map((date) => survivalByDate.get(date)?.survivalPct ?? null),
          borderColor: palette.chart1,
          backgroundColor: palette.chart1,
          borderWidth: 2.3,
          pointRadius: 0,
          spanGaps: true,
          yAxisID: "y1",
        },
      ],
    }),
    [palette.chart1, palette.chart2, survivalByDate, survivalDateDomain],
  )

  const survivalOptions = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        min: buildMetricAxisBounds(survivalTrend.map((row) => row.liveCount), { minFloor: 0 }).min,
        max: buildMetricAxisBounds(survivalTrend.map((row) => row.liveCount), { minFloor: 0 }).max,
        rightMin: 0,
        rightMax: 100,
        xMaxTicksLimit: survivalXAxisLimit,
        xTitle: "Date",
        yTitle: "Live count",
        yRightTitle: "Survival (%)",
        yTickFormatter: (value) => Number(value).toLocaleString(),
        yRightTickFormatter: (value) => `${Number(value).toFixed(0)}%`,
        tooltip: {
          callbacks: {
            title: (items: any) => formatDateLabel(String(survivalDateDomain[items[0]?.dataIndex ?? 0] ?? "")),
            label: (context: any) => {
              const label = context.dataset.label ?? ""
              if (label.includes("Survival")) {
                return `${label}: ${Number(context.parsed.y).toFixed(1)}%`
              }
              return `${label}: ${Number(context.parsed.y).toLocaleString()}`
            },
          },
        },
        xTickFormatter: (_value, index) => formatDateLabel(String(survivalDateDomain[index] ?? "")),
      }),
    [palette, survivalDateDomain, survivalTrend, survivalXAxisLimit],
  )

  const driverData = useMemo<ChartData<any>>(
    () => ({
      labels: driverDateDomain,
      datasets: [
        {
          type: "bar",
          label: "Deaths",
          data: driverDateDomain.map((date) => driverByDate.get(date)?.deaths ?? 0),
          backgroundColor: palette.destructive,
          yAxisID: "y",
          order: 3,
        },
        {
          type: "line",
          label: "Poor responses",
          data: driverDateDomain.map((date) => driverByDate.get(date)?.poorResponses ?? null),
          borderColor: palette.chart5,
          backgroundColor: palette.chart5,
          borderDash: [4, 4],
          borderWidth: 2,
          pointRadius: 0,
          spanGaps: true,
          yAxisID: "y",
          order: 2,
        },
        {
          type: "line",
          label: "DO (mg/L)",
          data: driverDateDomain.map((date) => driverByDate.get(date)?.avgDo ?? null),
          borderColor: palette.chart1,
          backgroundColor: palette.chart1,
          borderWidth: 2.2,
          pointRadius: 0,
          spanGaps: true,
          yAxisID: "y1",
          order: 1,
        },
        {
          type: "line",
          label: "Temp (C)",
          data: driverDateDomain.map((date) => driverByDate.get(date)?.avgTemperature ?? null),
          borderColor: palette.chart4,
          backgroundColor: palette.chart4,
          borderWidth: 2.2,
          pointRadius: 0,
          spanGaps: true,
          yAxisID: "y2",
          order: 1,
        },
      ],
    }),
    [driverByDate, driverDateDomain, palette.chart1, palette.chart4, palette.chart5, palette.destructive],
  )

  const driverOptions = useMemo<ChartOptions<"bar">>(() => {
    const countBounds = buildMetricAxisBounds(
      [
        ...driverTrend.map((row) => row.deaths),
        ...driverTrend.map((row) => row.poorResponses),
      ],
      { includeZero: true },
    )
    const doBounds = buildMetricAxisBounds(driverTrend.map((row) => row.avgDo), { minFloor: 0 })
    const tempMin = Math.max(0, Math.floor(getMinNumber(driverTrend.map((row) => row.avgTemperature)) - 1))
    const tempMax = Math.ceil(getMaxNumber(driverTrend.map((row) => row.avgTemperature)) + 1)

    return buildCartesianOptions({
      palette,
      legend: true,
      min: countBounds.min,
      max: countBounds.max,
      rightMin: doBounds.min,
      rightMax: doBounds.max,
      xMaxTicksLimit: driverXAxisLimit,
      xTitle: "Date",
      yTitle: "Deaths / poor responses",
      yRightTitle: "DO (mg/L)",
      yTickFormatter: (value) => Number(value).toLocaleString(),
      tooltip: {
        callbacks: {
          title: (items: any) => formatDateLabel(String(driverDateDomain[items[0]?.dataIndex ?? 0] ?? "")),
          label: (context: any) => {
            const label = context.dataset.label ?? ""
            const numeric = Number(context.parsed.y)
            if (label === "Deaths" || label === "Poor responses") {
              return `${label}: ${numeric.toLocaleString()}`
            }
            if (label === "DO (mg/L)") {
              return `${label}: ${numeric.toFixed(2)} mg/L`
            }
            return `${label}: ${numeric.toFixed(2)} C`
          },
        },
      },
      xTickFormatter: (_value, index) => formatDateLabel(String(driverDateDomain[index] ?? "")),
      extraScales: {
        y2: {
          display: true,
          position: "right",
          offset: true,
          min: tempMin,
          max: tempMax,
          border: { display: false },
          grid: { drawOnChartArea: false, drawTicks: false },
          ticks: {
            color: palette.muted,
            padding: 10,
            font: { size: 11, weight: 500 },
            callback(value: number | string) {
              return `${Number(value).toFixed(1)} C`
            },
          },
          title: {
            display: true,
            text: "Temperature (C)",
            color: palette.muted,
            font: { size: 11, weight: 500 },
          },
        },
      },
    })
  }, [driverDateDomain, driverTrend, driverXAxisLimit, palette])

  return (
    <>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deaths today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.deathsToday.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across scoped systems</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">7-day deaths</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.deaths7d.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Repeat-loss window</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.openAlerts}</div>
            <p className="text-xs text-muted-foreground">Unacknowledged mortality alerts</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Worst survival</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.worstSurvival == null ? "N/A" : `${formatNumber(kpis.worstSurvival, 1)}%`}
            </div>
            <p className="text-xs text-muted-foreground">Lowest live survival in scope</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Systems at risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.systemsAtRisk}</div>
            <p className="text-xs text-muted-foreground">Risk score 4 or higher</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unexplained losses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.unexplainedLosses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Unknown or other cause in 7 days</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_380px]">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Mortality Risk Queue</CardTitle>
            <CardDescription>
              Ranked by deaths, survival deterioration, repeated low DO, repeat-loss pattern, appetite issues, and unresolved alerts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {riskRows.length === 0 ? (
              <EmptyState
                title={loading ? "Loading mortality risk" : "No mortality risk rows"}
                description="When mortality, survival, and water-quality data are available, systems will be ranked here."
                icon={TrendingDown}
              />
            ) : (
              <div className="overflow-x-auto rounded-md border border-border/80">
                <table className="w-full min-w-[1120px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2 text-left font-semibold">System</th>
                      <th className="px-3 py-2 text-left font-semibold">Deaths Today</th>
                      <th className="px-3 py-2 text-left font-semibold">7-Day Deaths</th>
                      <th className="px-3 py-2 text-left font-semibold">Survival</th>
                      <th className="px-3 py-2 text-left font-semibold">Latest DO</th>
                      <th className="px-3 py-2 text-left font-semibold">Latest Temp</th>
                      <th className="px-3 py-2 text-left font-semibold">Last Sample</th>
                      <th className="px-3 py-2 text-left font-semibold">Trend</th>
                      <th className="px-3 py-2 text-left font-semibold">Alert</th>
                      <th className="px-3 py-2 text-left font-semibold">Investigation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskRows.map((row) => (
                      <tr key={row.systemId} className="border-b border-border/70 align-top hover:bg-muted/30">
                        <td className="px-3 py-3">
                          <div className="space-y-2">
                            <button
                              type="button"
                              className="text-left font-semibold hover:underline"
                              onClick={() => onSelectHistorySystem(row.systemId)}
                            >
                              {row.systemName}
                            </button>
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant="outline" className={cn("border", riskBadgeClass(row))}>
                                Score {row.atRiskScore}
                              </Badge>
                              {row.repeatLoss ? <Badge variant="outline">Repeat loss</Badge> : null}
                              {row.repeatedLowDo ? <Badge variant="outline">Low DO link</Badge> : null}
                              {row.poorAppetite ? <Badge variant="outline">Poor appetite</Badge> : null}
                              {row.unexplainedLosses > 0 ? <Badge variant="outline">Unexplained</Badge> : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-semibold">{row.deathsToday.toLocaleString()}</td>
                        <td className="px-3 py-3">{row.deaths7d.toLocaleString()}</td>
                        <td className="px-3 py-3">
                          {row.survivalPct == null ? "N/A" : `${formatNumber(row.survivalPct, 1)}%`}
                        </td>
                        <td className="px-3 py-3">
                          {row.latestDo == null ? "N/A" : `${formatNumber(row.latestDo, 1)} mg/L`}
                        </td>
                        <td className="px-3 py-3">
                          {row.latestTemperature == null ? "N/A" : `${formatNumber(row.latestTemperature, 1)} C`}
                        </td>
                        <td className="px-3 py-3">
                          {row.lastSampleAgeDays == null ? "N/A" : `${row.lastSampleAgeDays}d ago`}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              "font-medium",
                              row.trendDirection === "worsening"
                                ? "text-destructive"
                                : row.trendDirection === "improving"
                                  ? "text-emerald-700"
                                  : "text-muted-foreground",
                            )}
                          >
                            {trendLabel(row)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            <Badge variant={severityVariant(row.alertStatus === "open" ? "warning" : row.alertStatus)}>
                              {row.alertStatus === "clear" ? "Clear" : row.alertStatus}
                            </Badge>
                            <p className="text-xs text-muted-foreground">{row.unresolvedAlerts} unresolved</p>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Select
                            value={row.investigationStatus}
                            onValueChange={(value) => onInvestigationStatusChange(row.systemId, value as InvestigationStatus)}
                          >
                            <SelectTrigger
                              size="sm"
                              className={cn("w-[140px] border", investigationBadgeClass(row.investigationStatus))}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {INVESTIGATION_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>Open mortality alerts that still need action.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.filter((row) => !row.acknowledged_at).length === 0 ? (
                <EmptyState
                  title="No open alerts"
                  description="Critical and warning mortality alerts will appear here."
                  icon={AlertTriangle}
                />
              ) : (
                alerts
                  .filter((row) => !row.acknowledged_at)
                  .slice(0, 6)
                  .map((alert) => (
                    <div key={alert.id} className="rounded-lg border border-border/80 bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge>
                        <span className="text-[11px] text-muted-foreground">{alert.rule_code}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium">{alert.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {alert.system_id != null ? (
                          <button
                            type="button"
                            className="font-medium hover:underline"
                            onClick={() => onSelectHistorySystem(alert.system_id as number)}
                          >
                            {systemNameById.get(alert.system_id) ?? `System ${alert.system_id}`}
                          </button>
                        ) : (
                          "Farm-wide"
                        )}{" "}
                        | {formatDateTime(alert.fired_at)}
                      </p>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Likely Drivers</CardTitle>
              <CardDescription>Repeat-loss detection, survival deterioration, low DO linkage, and appetite issues.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {driverItems.length === 0 ? (
                <EmptyState
                  title="No dominant drivers flagged"
                  description="Driver patterns will appear here as losses, alerts, and water-quality constraints line up."
                  icon={Waves}
                />
              ) : (
                driverItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/30",
                      item.severity === "high" ? "border-destructive/30 bg-destructive/5" : "border-border/80 bg-muted/20",
                    )}
                    onClick={() => onSelectHistorySystem(item.systemId)}
                  >
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Investigation Status</CardTitle>
              <CardDescription>Operational tracking persisted per system on this device.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              {INVESTIGATION_OPTIONS.map((option) => (
                <div key={option.value} className="rounded-md border border-border/80 px-3 py-2">
                  <p className="text-xs text-muted-foreground">{option.label}</p>
                  <p className="mt-1 text-lg font-semibold">
                    {investigationCounts[option.value].toLocaleString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Deaths Trend</CardTitle>
            <CardDescription>Daily mortality totals across the current scope.</CardDescription>
          </CardHeader>
          <CardContent>
            {deathsTrend.length === 0 ? (
              <EmptyState
                title="No mortality trend in range"
                description="When mortality is recorded, daily deaths will appear here."
                icon={Skull}
              />
            ) : (
              <div className="chart-canvas-shell h-[280px]">
                <Bar data={deathsData} options={deathsOptions} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Survival Trend</CardTitle>
            <CardDescription>Aggregated live count and survival percentage across scoped systems.</CardDescription>
          </CardHeader>
          <CardContent>
            {survivalTrend.length === 0 ? (
              <EmptyState
                title="No survival trend"
                description="Select a period with survival history or record mortality against stocked systems."
                icon={TrendingDown}
              />
            ) : (
              <div className="chart-canvas-shell h-[280px]">
                <Line data={survivalData} options={survivalOptions} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Mortality Driver Correlation</CardTitle>
            <CardDescription>Deaths versus DO, temperature, and poor appetite signals.</CardDescription>
          </CardHeader>
          <CardContent>
            {driverTrend.length === 0 ? (
              <EmptyState
                title="No driver correlation data"
                description="Mortality, water-quality, and feeding records will be correlated here."
                icon={Search}
              />
            ) : (
              <div className="chart-canvas-shell h-[280px]">
                <Chart type="bar" data={driverData} options={driverOptions} />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Compact Mortality Log</CardTitle>
            <CardDescription>
              {latestEvent
                ? `Latest record: ${latestEvent.number_of_fish_mortality.toLocaleString()} fish in ${
                    systemNameById.get(latestEvent.system_id) ?? `System ${latestEvent.system_id}`
                  } on ${formatDateLabel(latestEvent.date)}.`
                : "Recent mortality records for the current scope."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <EmptyState
                title="No mortality records found"
                description="Try widening the period or changing the active filters."
                icon={Skull}
              />
            ) : (
              <div className="overflow-x-auto rounded-md border border-border/80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/60">
                      <th className="px-3 py-2 text-left font-semibold">Date</th>
                      <th className="px-3 py-2 text-left font-semibold">System</th>
                      <th className="px-3 py-2 text-left font-semibold">Deaths</th>
                      <th className="px-3 py-2 text-left font-semibold">Cause</th>
                      <th className="px-3 py-2 text-left font-semibold">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.slice(0, 20).map((row) => {
                      const reading = latestReadingsBySystem.get(row.system_id)
                      return (
                        <tr
                          key={row.id}
                          className="cursor-pointer border-b border-border/70 hover:bg-muted/35"
                          onClick={() => onSelectHistorySystem(row.system_id)}
                        >
                          <td className="px-3 py-3 font-medium">{formatDateLabel(row.date)}</td>
                          <td className="px-3 py-3">{systemNameById.get(row.system_id) ?? `System ${row.system_id}`}</td>
                          <td className="px-3 py-3">{row.number_of_fish_mortality.toLocaleString()}</td>
                          <td className="px-3 py-3">{isMortalityCause(row.cause) ? CAUSE_LABELS[row.cause] : row.cause}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {row.is_mass_mortality ? <Badge variant="destructive">Mass</Badge> : null}
                              {reading?.doValue != null && reading.doValue < 4 ? <Badge variant="outline">Low DO</Badge> : null}
                              {isMortalityCause(row.cause) &&
                              MORTALITY_CAUSES.includes(row.cause) &&
                              (row.cause === "unknown" || row.cause === "other") ? (
                                <Badge variant="outline">Unexplained</Badge>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  )
}
