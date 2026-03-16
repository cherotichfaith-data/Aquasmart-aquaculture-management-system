"use client"

import { useMemo, useState } from "react"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AlertTriangle, Search, Skull, TrendingDown, Waves } from "lucide-react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import SystemHistorySheet from "@/components/systems/system-history-sheet"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataErrorState, EmptyState } from "@/components/shared/data-states"
import { useAnalyticsPageBootstrap } from "@/hooks/use-analytics-page-bootstrap"
import { useAlertLog, useMortalityEvents } from "@/lib/hooks/use-mortality"
import { useFeedingRecords, useSamplingData, useScopedSurvivalTrend } from "@/lib/hooks/use-reports"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { useWaterQualityMeasurements } from "@/lib/hooks/use-water-quality"
import { cn } from "@/lib/utils"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import { MORTALITY_CAUSES, type MortalityCause } from "@/lib/types/mortality"
import {
  buildDeathsTrend,
  buildDriverItems,
  buildDriverTrend,
  buildLatestReadingsBySystem,
  buildMortalityKpis,
  buildMortalityRiskRows,
  buildSurvivalTrend,
  buildSystemNameById,
  type InvestigationStatus,
  type MortalityRiskRow,
} from "./mortality-selectors"
import { useMortalityInvestigationStatus } from "./use-mortality-investigation-status"

const CAUSE_LABELS: Record<MortalityCause, string> = {
  unknown: "Unknown",
  hypoxia: "Low DO / Hypoxia",
  disease: "Disease",
  injury: "Injury",
  handling: "Handling stress",
  predator: "Predator",
  starvation: "Starvation",
  temperature: "Temperature",
  other: "Other",
}

const INVESTIGATION_OPTIONS: Array<{ value: InvestigationStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "monitoring", label: "Monitoring" },
  { value: "resolved", label: "Resolved" },
  { value: "escalated", label: "Escalated" },
]

function formatDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
}

function formatDateTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "N/A"
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function severityVariant(severity: string) {
  if (severity === "critical") return "destructive" as const
  if (severity === "warning") return "secondary" as const
  return "outline" as const
}

function riskBadgeClass(row: MortalityRiskRow) {
  if (row.atRiskScore >= 8) return "bg-destructive/10 text-destructive border-destructive/30"
  if (row.atRiskScore >= 4) return "bg-amber-500/10 text-amber-700 border-amber-500/30"
  return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
}

function investigationBadgeClass(status: InvestigationStatus) {
  if (status === "escalated") return "bg-destructive/10 text-destructive border-destructive/30"
  if (status === "monitoring") return "bg-amber-500/10 text-amber-700 border-amber-500/30"
  if (status === "resolved") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
  return "bg-muted text-muted-foreground border-border"
}

function trendLabel(row: MortalityRiskRow) {
  if (row.trendDirection === "worsening") return "Worsening"
  if (row.trendDirection === "improving") return "Improving"
  if (row.trendDirection === "stable") return "Stable"
  return "No data"
}

export default function MortalityPage() {
  const [selectedHistorySystemId, setSelectedHistorySystemId] = useState<number | null>(null)

  const {
    farmId,
    selectedBatch,
    selectedSystem,
    selectedStage,
    boundsReady,
    dateFrom,
    dateTo,
  } = useAnalyticsPageBootstrap({
    defaultTimePeriod: "quarter",
  })

  const todayDate = dateTo ?? new Date().toISOString().slice(0, 10)
  const {
    batchId,
    scopedSystemIdList,
    scopedSystemIds,
    systemsQuery,
    batchSystemsQuery,
  } = useScopedSystemIds({
    farmId,
    selectedBatch,
    selectedSystem,
    selectedStage,
  })

  const eventsQuery = useMortalityEvents({
    farmId,
    batchId,
    dateFrom,
    dateTo,
    limit: 5000,
    enabled: boundsReady,
  })
  const alertsQuery = useAlertLog({
    farmId,
    ruleCodes: ["MASS_MORTALITY", "ELEVATED_MORTALITY"],
    limit: 200,
    enabled: boundsReady,
  })
  const survivalQuery = useScopedSurvivalTrend({
    systemIds: scopedSystemIdList,
    dateFrom,
    dateTo,
    enabled: boundsReady && scopedSystemIdList.length > 0,
  })
  const feedingQuery = useFeedingRecords({
    systemIds: scopedSystemIdList,
    batchId,
    dateFrom,
    dateTo,
    limit: 5000,
    enabled: boundsReady && scopedSystemIdList.length > 0,
  })
  const samplingQuery = useSamplingData({
    systemIds: scopedSystemIdList,
    batchId,
    limit: 5000,
    enabled: boundsReady && scopedSystemIdList.length > 0,
  })
  const measurementsQuery = useWaterQualityMeasurements({
    farmId,
    dateFrom,
    dateTo,
    limit: 8000,
    enabled: boundsReady,
  })
  const investigation = useMortalityInvestigationStatus(farmId)

  const systems = systemsQuery.data?.status === "success" ? systemsQuery.data.data : []
  const eventsRaw = eventsQuery.data?.status === "success" ? eventsQuery.data.data : []
  const alertsRaw = alertsQuery.data?.status === "success" ? alertsQuery.data.data : []
  const survivalRows = survivalQuery.data?.status === "success" ? survivalQuery.data.data : []
  const feedingRows = feedingQuery.data?.status === "success" ? feedingQuery.data.data : []
  const samplingRows = samplingQuery.data?.status === "success" ? samplingQuery.data.data : []
  const measurementRowsRaw = measurementsQuery.data?.status === "success" ? measurementsQuery.data.data : []

  const events = useMemo(
    () => eventsRaw.filter((row) => scopedSystemIds.has(row.system_id)),
    [eventsRaw, scopedSystemIds],
  )
  const alerts = useMemo(
    () => alertsRaw.filter((row) => row.system_id == null || scopedSystemIds.has(row.system_id)),
    [alertsRaw, scopedSystemIds],
  )
  const measurementRows = useMemo(
    () => measurementRowsRaw.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [measurementRowsRaw, scopedSystemIds],
  )

  const systemNameById = useMemo(() => buildSystemNameById(systems), [systems])
  const latestReadingsBySystem = useMemo(() => buildLatestReadingsBySystem(measurementRows), [measurementRows])

  const riskRows = useMemo(
    () =>
      buildMortalityRiskRows({
        systems,
        events,
        alerts: alerts.filter((row) => row.system_id != null),
        survivalRows,
        measurements: measurementRows,
        samplingRows,
        feedingRows,
        todayDate,
        investigationBySystemId: investigation.statusBySystemId,
      }),
    [alerts, events, feedingRows, investigation.statusBySystemId, measurementRows, samplingRows, systems, survivalRows, todayDate],
  )

  const kpis = useMemo(() => buildMortalityKpis(riskRows, alerts), [alerts, riskRows])
  const investigationCounts = useMemo(
    () =>
      riskRows.reduce(
        (acc, row) => {
          acc[row.investigationStatus] += 1
          return acc
        },
        { open: 0, monitoring: 0, resolved: 0, escalated: 0 } as Record<InvestigationStatus, number>,
      ),
    [riskRows],
  )
  const deathsTrend = useMemo(() => buildDeathsTrend(events), [events])
  const survivalTrend = useMemo(() => buildSurvivalTrend(survivalRows), [survivalRows])
  const driverTrend = useMemo(
    () => buildDriverTrend({ events, measurements: measurementRows, feedingRows }),
    [events, feedingRows, measurementRows],
  )
  const driverItems = useMemo(() => buildDriverItems(riskRows), [riskRows])
  const latestEvent = events[0] ?? null

  const loading =
    systemsQuery.isLoading ||
    batchSystemsQuery.isLoading ||
    eventsQuery.isLoading ||
    alertsQuery.isLoading ||
    survivalQuery.isLoading ||
    feedingQuery.isLoading ||
    samplingQuery.isLoading ||
    measurementsQuery.isLoading

  const errorMessages = [
    getErrorMessage(systemsQuery.error),
    getQueryResultError(systemsQuery.data),
    getErrorMessage(batchSystemsQuery.error),
    getQueryResultError(batchSystemsQuery.data),
    getErrorMessage(eventsQuery.error),
    getQueryResultError(eventsQuery.data),
    getErrorMessage(alertsQuery.error),
    getQueryResultError(alertsQuery.data),
    getErrorMessage(survivalQuery.error),
    getQueryResultError(survivalQuery.data),
    getErrorMessage(feedingQuery.error),
    getQueryResultError(feedingQuery.data),
    getErrorMessage(samplingQuery.error),
    getQueryResultError(samplingQuery.data),
    getErrorMessage(measurementsQuery.error),
    getQueryResultError(measurementsQuery.data),
  ].filter(Boolean) as string[]

  if (errorMessages.length > 0) {
    return (
      <DashboardLayout>
        <DataErrorState
          title="Unable to load mortality page"
          description={errorMessages[0]}
          onRetry={() => {
            systemsQuery.refetch()
            batchSystemsQuery.refetch()
            eventsQuery.refetch()
            alertsQuery.refetch()
            survivalQuery.refetch()
            feedingQuery.refetch()
            samplingQuery.refetch()
            measurementsQuery.refetch()
          }}
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mortality</h1>
        </div>

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
                                onClick={() => setSelectedHistorySystemId(row.systemId)}
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
                              onValueChange={(value) => investigation.setStatus(row.systemId, value as InvestigationStatus)}
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
                              onClick={() => setSelectedHistorySystemId(alert.system_id)}
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
                      onClick={() => setSelectedHistorySystemId(item.systemId)}
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
                <div className="h-[280px] rounded-md border border-border/80 bg-muted/20 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={deathsTrend}>
                      <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                      <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        labelFormatter={(value) => formatDateLabel(String(value))}
                        formatter={(value) => [Number(value).toLocaleString(), "Deaths"]}
                      />
                      <Bar dataKey="deaths" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
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
                <div className="h-[280px] rounded-md border border-border/80 bg-muted/20 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={survivalTrend}>
                      <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                      <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip
                        labelFormatter={(value) => formatDateLabel(String(value))}
                        formatter={(value, name) => [
                          Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }),
                          String(name),
                        ]}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="liveCount"
                        name="Live count"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2.3}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="survivalPct"
                        name="Survival %"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2.3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
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
                <div className="h-[280px] rounded-md border border-border/80 bg-muted/20 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={driverTrend}>
                      <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                      <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip
                        labelFormatter={(value) => formatDateLabel(String(value))}
                        formatter={(value, name) => {
                          const label = String(name)
                          if (label === "Deaths" || label === "Poor responses") {
                            return [Number(value).toLocaleString(), label]
                          }
                          return [Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }), label]
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="deaths" name="Deaths" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="avgDo"
                        name="DO (mg/L)"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2.2}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="avgTemperature"
                        name="Temp (C)"
                        stroke="hsl(var(--chart-4))"
                        strokeWidth={2.2}
                        dot={false}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="poorResponses"
                        name="Poor responses"
                        stroke="hsl(var(--chart-5))"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Compact Event Log</CardTitle>
              <CardDescription>
                {latestEvent
                  ? `Latest event: ${latestEvent.dead_count.toLocaleString()} fish in ${
                      systemNameById.get(latestEvent.system_id) ?? `System ${latestEvent.system_id}`
                    } on ${formatDateLabel(latestEvent.event_date)}.`
                  : "Recent mortality events for the current scope."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <EmptyState
                  title="No mortality events found"
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
                            onClick={() => setSelectedHistorySystemId(row.system_id)}
                          >
                            <td className="px-3 py-3 font-medium">{formatDateLabel(row.event_date)}</td>
                            <td className="px-3 py-3">{systemNameById.get(row.system_id) ?? `System ${row.system_id}`}</td>
                            <td className="px-3 py-3">{row.dead_count.toLocaleString()}</td>
                            <td className="px-3 py-3">{CAUSE_LABELS[row.cause] ?? row.cause}</td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                {row.is_mass_mortality ? <Badge variant="destructive">Mass</Badge> : null}
                                {reading?.doValue != null && reading.doValue < 4 ? <Badge variant="outline">Low DO</Badge> : null}
                                {MORTALITY_CAUSES.includes(row.cause) && (row.cause === "unknown" || row.cause === "other") ? (
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

        <SystemHistorySheet
          open={selectedHistorySystemId !== null}
          onOpenChange={(open) => !open && setSelectedHistorySystemId(null)}
          farmId={farmId}
          systemId={selectedHistorySystemId}
          systemLabel={selectedHistorySystemId != null ? (systemNameById.get(selectedHistorySystemId) ?? null) : null}
          dateFrom={dateFrom ?? undefined}
          dateTo={dateTo ?? undefined}
        />
      </div>
    </DashboardLayout>
  )
}
