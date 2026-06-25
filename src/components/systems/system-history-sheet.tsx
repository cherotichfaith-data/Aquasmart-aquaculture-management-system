"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import type { ChartData, ChartOptions } from "chart.js"
import { Fish, Skull, TrendingUp } from "lucide-react"
import { Badge } from "@/components/app-ui/badge"
import { Button } from "@/components/app-ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/app-ui/card"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/app-ui/sheet"
import { Line } from "@/components/charts/chartjs"
import { buildCartesianOptions, buildSparseDateDomain, getChartPalette, getDateAxisMaxTicks } from "@/components/charts/chartjs-theme"
import { DataErrorState, DataFetchingBadge, EmptyState } from "@/components/shared/data-states"
import type { DashboardSystemRpcRow } from "@/features/dashboard/types"
import { useProductionSummary } from "@/features/production/hooks"
import { DATA_ENTRY_PATH } from "@/lib/app-entry"
import { formatCompactDate, formatDateOnly, formatNumberValue, formatUnitValue } from "@/lib/analytics-format"
import { formatCageLabel } from "@/lib/system-options"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

const formatPercent = (value: number | null | undefined, decimals = 1, suffix = "%") => {
  if (!isFiniteNumber(value)) return "--"
  return `${formatNumberValue(value, { decimals, minimumDecimals: decimals })}${suffix}`
}

const ratingToneClass = (rating: string | null | undefined) => {
  const normalized = rating?.trim().toLowerCase()
  if (normalized === "optimal") return "bg-success/15 text-success"
  if (normalized === "acceptable") return "bg-warning/15 text-warning"
  if (normalized === "critical") return "bg-warning/15 text-warning"
  if (normalized === "lethal") return "bg-destructive/15 text-destructive"
  return "bg-muted text-muted-foreground"
}

const worstParameterLabel = (value: string | null | undefined) => {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "dissolved_oxygen") return "DO"
  if (normalized === "temperature") return "Temp"
  if (normalized === "ph") return "pH"
  if (normalized === "ammonia") return "Ammonia"
  if (normalized === "nitrite") return "Nitrite"
  if (normalized === "nitrate") return "Nitrate"
  return value ?? null
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string | null
}) {
  return (
    <Card className="gap-2 py-3">
      <CardHeader className="px-4">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-lg font-semibold leading-6 text-foreground">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

export default function SystemHistorySheet({
  open,
  onOpenChange,
  farmId,
  systemId,
  systemLabel,
  dateFrom,
  dateTo,
  summaryRow,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  farmId?: string | null
  systemId: number | null
  systemLabel?: string | null
  dateFrom?: string
  dateTo?: string
  summaryRow?: DashboardSystemRpcRow | null
}) {
  const router = useRouter()
  const enabled = open && Boolean(farmId) && Boolean(systemId) && Boolean(dateFrom && dateTo)

  const productionSummaryQuery = useProductionSummary({
    farmId,
    systemId: systemId ?? undefined,
    dateFrom,
    dateTo,
    enabled,
  })

  const productionSummaryRows =
    productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []
  const errorMessage =
    getErrorMessage(productionSummaryQuery.error) ??
    getQueryResultError(productionSummaryQuery.data) ??
    null

  const orderedSummaryRows = useMemo(
    () =>
      productionSummaryRows
        .filter((row) => Boolean(row.date))
        .slice()
        .sort((left, right) => String(left.date).localeCompare(String(right.date))),
    [productionSummaryRows],
  )

  const latestProductionSummary = orderedSummaryRows[orderedSummaryRows.length - 1] ?? null
  const title =
    systemId != null
      ? formatCageLabel({ id: systemId, label: systemLabel ?? summaryRow?.system_name ?? null, unit: null })
      : "System"

  const snapshotDate = summaryRow?.as_of_date ?? summaryRow?.input_end_date ?? latestProductionSummary?.date ?? dateTo ?? null
  const snapshotLabel = snapshotDate ? formatDateOnly(snapshotDate) : "N/A"
  const periodLabel =
    dateFrom && dateTo
      ? `${formatDateOnly(dateFrom)} to ${formatDateOnly(dateTo)}`
      : dateFrom
        ? formatDateOnly(dateFrom)
        : "No selected period"

  const daysInCycle = useMemo(() => {
    if (isFiniteNumber(summaryRow?.cycle_day)) return summaryRow.cycle_day
    if (!snapshotDate || !latestProductionSummary?.cycle_start) return null
    const end = new Date(`${snapshotDate}T00:00:00Z`)
    const start = new Date(`${latestProductionSummary.cycle_start}T00:00:00Z`)
    if (Number.isNaN(end.getTime()) || Number.isNaN(start.getTime())) return null
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000))
  }, [latestProductionSummary?.cycle_start, snapshotDate, summaryRow?.cycle_day])

  const targetWeightG = summaryRow?.target_weight_g ?? latestProductionSummary?.target_weight_g ?? null
  const currentAbw = summaryRow?.abw ?? latestProductionSummary?.average_body_weight ?? null
  const targetWeightProgressPct = useMemo(() => {
    if (isFiniteNumber(summaryRow?.target_weight_progress_pct)) return summaryRow.target_weight_progress_pct
    if (!isFiniteNumber(targetWeightG) || !isFiniteNumber(currentAbw) || targetWeightG <= 0) return null
    return Math.round((currentAbw / targetWeightG) * 1000) / 10
  }, [currentAbw, summaryRow?.target_weight_progress_pct, targetWeightG])

  const density = summaryRow?.biomass_density ?? latestProductionSummary?.biomass_density ?? null
  const feedingRatePct = summaryRow?.feeding_rate ?? latestProductionSummary?.feeding_rate_on_date ?? null
  const agr = summaryRow?.agr ?? latestProductionSummary?.agr ?? null
  const fishCount = summaryRow?.fish_end ?? latestProductionSummary?.number_of_fish_inventory ?? null
  const missingDays = summaryRow?.missing_days_count ?? null
  const cycleEfcr = latestProductionSummary?.efcr_aggregated ?? null

  const worstParameterText = useMemo(() => {
    const label = worstParameterLabel(summaryRow?.worst_parameter)
    if (!label || !isFiniteNumber(summaryRow?.worst_parameter_value)) return "No issue recorded"
    const unit = summaryRow?.worst_parameter_unit ? ` ${summaryRow.worst_parameter_unit}` : ""
    return `${label} ${formatNumberValue(summaryRow.worst_parameter_value, { decimals: 1, minimumDecimals: 1 })}${unit}`
  }, [summaryRow?.worst_parameter, summaryRow?.worst_parameter_unit, summaryRow?.worst_parameter_value])

  const sampleHistoryRows = useMemo(
    () => orderedSummaryRows.filter((row) => isFiniteNumber(row.average_body_weight)),
    [orderedSummaryRows],
  )
  const sampleDateDomain = useMemo(
    () => buildSparseDateDomain(sampleHistoryRows.map((row) => row.date)),
    [sampleHistoryRows],
  )
  const sampleRowsByDate = useMemo(
    () => new Map(sampleHistoryRows.map((row) => [row.date, row])),
    [sampleHistoryRows],
  )

  const palette = getChartPalette()
  const sampleXAxisLimit = getDateAxisMaxTicks(sampleDateDomain.length)

  const sampleHistoryChartData = useMemo<ChartData<"line">>(
    () => ({
      labels: sampleDateDomain,
      datasets: [
        {
          label: "ABW (g)",
          data: sampleDateDomain.map((date) => sampleRowsByDate.get(date)?.average_body_weight ?? null),
          borderColor: palette.chart1,
          backgroundColor: palette.chart1,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          spanGaps: true,
        },
      ],
    }),
    [palette.chart1, sampleDateDomain, sampleRowsByDate],
  )

  const sampleHistoryChartOptions = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: false,
        xTitle: "Sampling date",
        yTitle: "ABW (g)",
        xMaxTicksLimit: sampleXAxisLimit,
        tooltip: {
          callbacks: {
            title: (items: any[]) => formatDateOnly(sampleDateDomain[items[0]?.dataIndex ?? 0] ?? ""),
            label: (context: any) => `ABW: ${formatNumberValue(Number(context.parsed.y), { decimals: 1, minimumDecimals: 1 })} g`,
          },
        },
        xTickFormatter: (_value, index) => formatCompactDate(sampleDateDomain[index] ?? ""),
      }),
    [palette, sampleDateDomain, sampleXAxisLimit],
  )

  const progressWidth = Math.max(0, Math.min(targetWeightProgressPct ?? 0, 100))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[760px]">
        <SheetHeader className="border-b border-border pb-4">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="space-y-1">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>Selected period: {periodLabel}</SheetDescription>
              <SheetDescription>Snapshot as of {snapshotLabel}</SheetDescription>
            </div>
            <DataFetchingBadge isFetching={productionSummaryQuery.isFetching} isLoading={productionSummaryQuery.isLoading} />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {summaryRow?.growth_stage ? <Badge variant="outline">{summaryRow.growth_stage}</Badge> : null}
            <Badge className={ratingToneClass(summaryRow?.water_quality_rating_average)}>
              {summaryRow?.water_quality_rating_average ?? "No WQ rating"}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-4 px-4 py-4">
          {!dateFrom || !dateTo ? (
            <DataErrorState title="No selected period" description="Choose a date range to load this system detail." />
          ) : null}

          {dateFrom && dateTo && errorMessage ? (
            <DataErrorState
              title="Unable to load system detail"
              description={errorMessage}
              onRetry={() => productionSummaryQuery.refetch()}
            />
          ) : null}

          {dateFrom && dateTo ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Target Weight</CardTitle>
                  <CardDescription>Current ABW against the configured cycle target.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Target</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {isFiniteNumber(targetWeightG) ? formatUnitValue(targetWeightG, 0, "g") : "--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Current ABW</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {isFiniteNumber(currentAbw) ? formatUnitValue(currentAbw, 1, "g") : "--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Progress</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {isFiniteNumber(targetWeightProgressPct)
                          ? `${formatNumberValue(targetWeightProgressPct, { decimals: 1, minimumDecimals: 1 })}%`
                          : "--"}
                      </p>
                    </div>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${progressWidth}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-3 md:grid-cols-2">
                <MetricCard
                  label="Density"
                  value={formatUnitValue(density, 2, "kg/m3")}
                />
                <MetricCard
                  label="Feeding Rate"
                  value={formatPercent(feedingRatePct, 2, "% BW/day")}
                />
                <MetricCard
                  label="Days in Cycle"
                  value={isFiniteNumber(daysInCycle) ? formatNumberValue(daysInCycle) : "--"}
                />
                <MetricCard
                  label="AGR"
                  value={isFiniteNumber(agr) ? `${formatNumberValue(agr, { decimals: 2, minimumDecimals: 2 })} g/day` : "--"}
                />
                <MetricCard
                  label="Fish Count"
                  value={formatNumberValue(fishCount)}
                />
                <MetricCard
                  label="Missing Days"
                  value={isFiniteNumber(missingDays) ? formatNumberValue(missingDays) : "--"}
                />
                <MetricCard
                  label="Cycle eFCR"
                  value={isFiniteNumber(cycleEfcr) ? formatNumberValue(cycleEfcr, { decimals: 2, minimumDecimals: 2 }) : "--"}
                />
                <MetricCard
                  label="WQ Worst Parameter"
                  value={worstParameterText}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Sample History</CardTitle>
                  <CardDescription>ABW progression over the selected period.</CardDescription>
                </CardHeader>
                <CardContent>
                  {sampleHistoryRows.length === 0 ? (
                    <EmptyState
                      title="No sample history"
                      description="Sampling records inside the selected period will appear here."
                      icon={TrendingUp}
                    />
                  ) : (
                    <div className="chart-canvas-shell h-[220px]">
                      <Line data={sampleHistoryChartData} options={sampleHistoryChartOptions} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        <SheetFooter className="grid grid-cols-1 gap-2 border-t border-border bg-background sm:grid-cols-3">
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => router.push(`${DATA_ENTRY_PATH}?type=feeding&system=${systemId ?? ""}`)}
          >
            <Fish className="mr-2 h-4 w-4" />
            Record Feeding
          </Button>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => router.push(`${DATA_ENTRY_PATH}?type=sampling&system=${systemId ?? ""}`)}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Record Sampling
          </Button>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => router.push(`${DATA_ENTRY_PATH}?type=mortality&system=${systemId ?? ""}`)}
          >
            <Skull className="mr-2 h-4 w-4" />
            Record Mortality
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
