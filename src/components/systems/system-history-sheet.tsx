"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import type { ChartData, ChartOptions } from "chart.js"
import {
  Chart,
  Line,
} from "@/components/charts/chartjs"
import { Fish, Skull, TestTube, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  buildCartesianOptions,
  buildDailyDateDomain,
  getChartPalette,
  getDateAxisMaxTicks,
} from "@/components/charts/chartjs-theme"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataErrorState, DataFetchingBadge, EmptyState } from "@/components/shared/data-states"
import { useDailyFishInventory } from "@/lib/hooks/use-inventory"
import { useMortalityData, useFeedingRecords, useSamplingData, useStockingData, useTransferData } from "@/lib/hooks/use-reports"
import { useSurvivalTrend } from "@/lib/hooks/use-mortality"
import { useSystemTimelineBounds } from "@/lib/hooks/use-system-timeline"
import { useDailyWaterQualityRating, useWaterQualityMeasurements } from "@/lib/hooks/use-water-quality"
import { getHarvests } from "@/lib/api/reports"
import type { DashboardSystemRow } from "@/features/dashboard/types"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import { resolveSystemTimelineWindow } from "@/lib/system-timeline-window"
import {
  formatCompactDate,
  formatDateOnly,
  formatDateTimeValue,
  formatNumberValue,
  formatUnitValue,
  timelineSourceLabel,
} from "@/lib/analytics-format"

type OperationRow = {
  id: string
  date: string
  createdAt: string | null
  type: "Stocking" | "Feeding" | "Sampling" | "Mortality" | "Transfer" | "Harvest"
  detail: string
}

const ratingToneClass = (rating: string | null | undefined) => {
  if (rating === "optimal") return "bg-chart-2/15 text-chart-2"
  if (rating === "acceptable") return "bg-chart-3/20 text-chart-3"
  if (rating === "critical") return "bg-chart-4/15 text-chart-4"
  if (rating === "lethal") return "bg-destructive/15 text-destructive"
  return "bg-muted text-muted-foreground"
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
  summaryRow?: DashboardSystemRow | null
}) {
  const router = useRouter()
  const enabled = open && Boolean(farmId) && Boolean(systemId)

  const timelineQuery = useSystemTimelineBounds({
    farmId,
    systemId: systemId ?? undefined,
    enabled,
  })

  const timeline = useMemo(
    () => (timelineQuery.data?.status === "success" ? timelineQuery.data.data[0] ?? null : null),
    [timelineQuery.data],
  )
  const effectiveTimeline = useMemo(
    () =>
      resolveSystemTimelineWindow(timeline, {
        windowStart: dateFrom ?? null,
        windowEnd: dateTo ?? null,
      }),
    [dateFrom, dateTo, timeline],
  )
  const effectiveDateFrom = effectiveTimeline?.queryStart ?? undefined
  const effectiveDateTo = effectiveTimeline?.queryEnd ?? undefined
  const sourceLabel = timelineSourceLabel(effectiveTimeline?.periodSource ?? timeline?.period_source) ?? "Production timeline"
  const periodLabel =
    effectiveTimeline?.displayStart && effectiveTimeline.displayEnd
      ? `${formatDateOnly(effectiveTimeline.displayStart)} to ${formatDateOnly(effectiveTimeline.displayEnd)}`
      : effectiveTimeline?.displayStart
        ? `${formatDateOnly(effectiveTimeline.displayStart)}`
        : effectiveTimeline?.hasTimeline
          ? "No activity in selected period"
          : "No resolved production period"
  const snapshotLabel = formatDateOnly(effectiveTimeline?.snapshotAsOf ?? timeline?.snapshot_as_of ?? summaryRow?.as_of_date ?? summaryRow?.input_end_date)
  const hasResolvedTimeline = Boolean(effectiveTimeline?.hasDataInWindow)
  const hasAnyTimeline = Boolean(effectiveTimeline?.hasTimeline)

  const inventoryQuery = useDailyFishInventory({
    farmId,
    systemId: systemId ?? undefined,
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
    limit: 120,
    orderAsc: true,
    enabled: enabled && hasResolvedTimeline,
  })
  const feedingQuery = useFeedingRecords({
    farmId,
    systemId: systemId ?? undefined,
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
    limit: 40,
    enabled: enabled && hasResolvedTimeline,
  })
  const stockingQuery = useStockingData({
    systemId: systemId ?? undefined,
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
    limit: 40,
    enabled: enabled && hasResolvedTimeline,
  })
  const samplingQuery = useSamplingData({
    systemId: systemId ?? undefined,
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
    limit: 24,
    enabled: enabled && hasResolvedTimeline,
  })
  const mortalityQuery = useMortalityData({
    systemId: systemId ?? undefined,
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
    limit: 24,
    enabled: enabled && hasResolvedTimeline,
  })
  const transferQuery = useTransferData({
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
    limit: 60,
    enabled: enabled && hasResolvedTimeline,
  })
  const harvestQuery = useQuery({
    queryKey: ["system-history", "harvests", systemId ?? "all", effectiveDateFrom ?? "", effectiveDateTo ?? ""],
    queryFn: ({ signal }) =>
      getHarvests({
        systemId: systemId ?? undefined,
        dateFrom: effectiveDateFrom,
        dateTo: effectiveDateTo,
        limit: 20,
        signal,
      }),
    enabled: enabled && hasResolvedTimeline,
    staleTime: 60_000,
  })
  const survivalQuery = useSurvivalTrend({
    systemId: systemId ?? undefined,
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
    enabled: enabled && hasResolvedTimeline,
  })
  const waterRatingQuery = useDailyWaterQualityRating({
    farmId,
    systemId: systemId ?? undefined,
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
    limit: 60,
    enabled: enabled && hasResolvedTimeline,
  })
  const measurementQuery = useWaterQualityMeasurements({
    farmId,
    systemId: systemId ?? undefined,
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
    limit: 200,
    enabled: enabled && hasResolvedTimeline,
  })

  const inventoryRows = inventoryQuery.data?.status === "success" ? inventoryQuery.data.data : []
  const feedingRows = feedingQuery.data?.status === "success" ? feedingQuery.data.data : []
  const stockingRows = stockingQuery.data?.status === "success" ? stockingQuery.data.data : []
  const samplingRows = samplingQuery.data?.status === "success" ? samplingQuery.data.data : []
  const mortalityRows = mortalityQuery.data?.status === "success" ? mortalityQuery.data.data : []
  const rawTransferRows = transferQuery.data?.status === "success" ? transferQuery.data.data : []
  const transferRows = useMemo(
    () => rawTransferRows.filter((row) => row.origin_system_id === systemId || row.target_system_id === systemId),
    [rawTransferRows, systemId],
  )
  const harvestRows = harvestQuery.data?.status === "success" ? harvestQuery.data.data : []
  const survivalRows = survivalQuery.data?.status === "success" ? survivalQuery.data.data : []
  const waterRatingRows = waterRatingQuery.data?.status === "success" ? waterRatingQuery.data.data : []
  const measurementRows = measurementQuery.data?.status === "success" ? measurementQuery.data.data : []

  const latestInventory = inventoryRows[inventoryRows.length - 1] ?? null
  const latestSampling = [...samplingRows].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] ?? null
  const latestSurvival = survivalRows[survivalRows.length - 1] ?? null
  const latestRating = waterRatingRows[waterRatingRows.length - 1] ?? null

  const totalFeedKg = useMemo(() => feedingRows.reduce((sum, row) => sum + (row.feeding_amount ?? 0), 0), [feedingRows])
  const totalMortality = useMemo(
    () => mortalityRows.reduce((sum, row) => sum + (row.number_of_fish_mortality ?? 0), 0),
    [mortalityRows],
  )
  const totalHarvestKg = useMemo(
    () => harvestRows.reduce((sum, row) => sum + (row.total_weight_harvest ?? 0), 0),
    [harvestRows],
  )

  const sampledAbwByDate = useMemo(() => {
    const byDate = new Map<string, { weightedAbw: number; sampleWeight: number; fallbackAbw: number; fallbackCount: number }>()

    samplingRows.forEach((row) => {
      if (!row.date || typeof row.abw !== "number") return

      const current = byDate.get(row.date) ?? {
        weightedAbw: 0,
        sampleWeight: 0,
        fallbackAbw: 0,
        fallbackCount: 0,
      }
      const sampleCount = row.number_of_fish_sampling ?? 0

      if (sampleCount > 0) {
        current.weightedAbw += row.abw * sampleCount
        current.sampleWeight += sampleCount
      } else {
        current.fallbackAbw += row.abw
        current.fallbackCount += 1
      }

      byDate.set(row.date, current)
    })

    return new Map(
      Array.from(byDate.entries()).map(([date, current]) => [
        date,
        current.sampleWeight > 0
          ? current.weightedAbw / current.sampleWeight
          : current.fallbackCount > 0
            ? current.fallbackAbw / current.fallbackCount
            : null,
      ]),
    )
  }, [samplingRows])

  const inventoryTrendRows = useMemo(
    () =>
      inventoryRows.map((row) => ({
        date: row.inventory_date,
        label: formatCompactDate(row.inventory_date),
        biomass: row.biomass_last_sampling,
        abw: sampledAbwByDate.get(row.inventory_date) ?? null,
        feed: row.feeding_amount,
      })),
    [inventoryRows, sampledAbwByDate],
  )

  const waterTrendRows = useMemo(() => {
    const grouped = new Map<string, { doSum: number; doCount: number; tempSum: number; tempCount: number }>()
    measurementRows.forEach((row) => {
      if (!row.date || row.parameter_value == null) return
      const current = grouped.get(row.date) ?? { doSum: 0, doCount: 0, tempSum: 0, tempCount: 0 }
      if (row.parameter_name === "dissolved_oxygen") {
        current.doSum += row.parameter_value
        current.doCount += 1
      }
      if (row.parameter_name === "temperature") {
        current.tempSum += row.parameter_value
        current.tempCount += 1
      }
      grouped.set(row.date, current)
    })
    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, current]) => ({
        date,
        label: formatCompactDate(date),
        dissolvedOxygen: current.doCount > 0 ? current.doSum / current.doCount : null,
        temperature: current.tempCount > 0 ? current.tempSum / current.tempCount : null,
      }))
  }, [measurementRows])

  const latestMeasurements = useMemo(() => {
    const byParameter = new Map<string, (typeof measurementRows)[number]>()
    measurementRows
      .slice()
      .sort((a, b) => String(b.created_at ?? b.date ?? "").localeCompare(String(a.created_at ?? a.date ?? "")))
      .forEach((row) => {
        if (!row.parameter_name || byParameter.has(row.parameter_name)) return
        byParameter.set(row.parameter_name, row)
      })
    return Array.from(byParameter.values())
  }, [measurementRows])

  const operations = useMemo<OperationRow[]>(() => {
    const items: OperationRow[] = []
    stockingRows.forEach((row) => {
      const isInitialStocking = row.date === timeline?.first_stocking_date
      items.push({
        id: `stocking-${row.id}`,
        date: row.date,
        createdAt: row.created_at,
        type: "Stocking",
        detail: `${isInitialStocking ? "Initial stocking" : "Addition"} | ${formatNumberValue(row.number_of_fish_stocking)} fish | ${formatUnitValue(row.total_weight_stocking, 1, "kg")}`,
      })
    })
    feedingRows.forEach((row) => {
      items.push({
        id: `feeding-${row.id}`,
        date: row.date,
        createdAt: row.created_at,
        type: "Feeding",
        detail: `${formatUnitValue(row.feeding_amount, 1, "kg")} | ${row.feeding_response ?? "response N/A"}`,
      })
    })
    samplingRows.forEach((row) => {
      items.push({
        id: `sampling-${row.id}`,
        date: row.date,
        createdAt: row.created_at,
        type: "Sampling",
        detail: `ABW ${formatUnitValue(row.abw, 1, "g")} from ${formatNumberValue(row.number_of_fish_sampling)} fish`,
      })
    })
    mortalityRows.forEach((row) => {
      items.push({
        id: `mortality-${row.id}`,
        date: row.date,
        createdAt: row.created_at,
        type: "Mortality",
        detail: `${formatNumberValue(row.number_of_fish_mortality)} fish`,
      })
    })
    transferRows.forEach((row) => {
      const direction = row.origin_system_id === systemId ? "Out" : "In"
      const counterpart =
        row.origin_system_id === systemId
          ? row.external_target_name?.trim() || row.target_system_id || "external location"
          : row.origin_system_id
      items.push({
        id: `transfer-${row.id}`,
        date: row.date,
        createdAt: row.created_at,
        type: "Transfer",
        detail: `${direction} ${formatNumberValue(row.number_of_fish_transfer)} fish ${direction === "Out" ? "to" : "from"} ${direction === "Out" && typeof counterpart === "string" ? counterpart : `system ${counterpart}`}`,
      })
    })
    harvestRows.forEach((row) => {
      items.push({
        id: `harvest-${row.id}`,
        date: row.date,
        createdAt: row.created_at,
        type: "Harvest",
        detail: `${row.type_of_harvest === "final" ? "Final harvest" : "Partial harvest"} | ${formatUnitValue(row.total_weight_harvest, 1, "kg")} | ${formatNumberValue(row.number_of_fish_harvest)} fish`,
      })
    })
    return items
      .sort((a, b) => {
        const dateCompare = String(b.date).localeCompare(String(a.date))
        if (dateCompare !== 0) return dateCompare
        return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
      })
      .slice(0, 20)
  }, [feedingRows, harvestRows, mortalityRows, samplingRows, stockingRows, systemId, timeline?.first_stocking_date, transferRows])

  const errorMessages = [
    getErrorMessage(inventoryQuery.error),
    getQueryResultError(inventoryQuery.data),
    getErrorMessage(timelineQuery.error),
    getQueryResultError(timelineQuery.data),
    getErrorMessage(feedingQuery.error),
    getQueryResultError(feedingQuery.data),
    getErrorMessage(stockingQuery.error),
    getQueryResultError(stockingQuery.data),
    getErrorMessage(samplingQuery.error),
    getQueryResultError(samplingQuery.data),
    getErrorMessage(mortalityQuery.error),
    getQueryResultError(mortalityQuery.data),
    getErrorMessage(transferQuery.error),
    getQueryResultError(transferQuery.data),
    getErrorMessage(harvestQuery.error),
    getQueryResultError(harvestQuery.data),
    getErrorMessage(survivalQuery.error),
    getQueryResultError(survivalQuery.data),
    getErrorMessage(waterRatingQuery.error),
    getQueryResultError(waterRatingQuery.data),
    getErrorMessage(measurementQuery.error),
    getQueryResultError(measurementQuery.data),
  ].filter(Boolean) as string[]

  const loading =
    timelineQuery.isLoading ||
    inventoryQuery.isLoading ||
    feedingQuery.isLoading ||
    stockingQuery.isLoading ||
    samplingQuery.isLoading ||
    mortalityQuery.isLoading ||
    transferQuery.isLoading ||
    harvestQuery.isLoading ||
    survivalQuery.isLoading ||
    waterRatingQuery.isLoading ||
    measurementQuery.isLoading

  const fetching =
    timelineQuery.isFetching ||
    inventoryQuery.isFetching ||
    feedingQuery.isFetching ||
    stockingQuery.isFetching ||
    samplingQuery.isFetching ||
    mortalityQuery.isFetching ||
    transferQuery.isFetching ||
    harvestQuery.isFetching ||
    survivalQuery.isFetching ||
    waterRatingQuery.isFetching ||
    measurementQuery.isFetching

  const title = systemLabel ?? summaryRow?.system_name ?? (systemId ? `System ${systemId}` : "System")
  const palette = getChartPalette()
  const inventoryDateDomain = useMemo(
    () => buildDailyDateDomain(inventoryTrendRows.map((row) => row.date)),
    [inventoryTrendRows],
  )
  const inventoryRowsByDate = useMemo(
    () => new Map(inventoryTrendRows.map((row) => [row.date, row])),
    [inventoryTrendRows],
  )
  const inventoryXAxisLimit = getDateAxisMaxTicks(inventoryDateDomain.length)
  const waterDateDomain = useMemo(
    () => buildDailyDateDomain(waterTrendRows.map((row) => row.date)),
    [waterTrendRows],
  )
  const waterRowsByDate = useMemo(
    () => new Map(waterTrendRows.map((row) => [row.date, row])),
    [waterTrendRows],
  )
  const waterXAxisLimit = getDateAxisMaxTicks(waterDateDomain.length)

  const inventoryChartData = useMemo<ChartData<any>>(
    () => ({
      labels: inventoryDateDomain,
      datasets: [
        {
          type: "bar",
          label: "Feed (kg)",
          data: inventoryDateDomain.map((date) => inventoryRowsByDate.get(date)?.feed ?? null),
          backgroundColor: palette.chart3,
          yAxisID: "y",
          order: 3,
        },
        {
          type: "line",
          label: "Biomass (kg)",
          data: inventoryDateDomain.map((date) => inventoryRowsByDate.get(date)?.biomass ?? null),
          borderColor: palette.chart1,
          backgroundColor: palette.chart1,
          borderWidth: 2.4,
          pointRadius: 0,
          spanGaps: true,
          yAxisID: "y",
          order: 1,
        },
        {
          type: "line",
          label: "ABW (g)",
          data: inventoryDateDomain.map((date) => inventoryRowsByDate.get(date)?.abw ?? null),
          borderColor: palette.chart2,
          backgroundColor: palette.chart2,
          borderWidth: 2.4,
          pointRadius: 0,
          spanGaps: true,
          yAxisID: "y1",
          order: 2,
        },
      ],
    }),
    [inventoryDateDomain, inventoryRowsByDate, palette.chart1, palette.chart2, palette.chart3],
  )

  const inventoryChartOptions = useMemo<ChartOptions<"bar">>(() => {
    return buildCartesianOptions({
      palette,
      legend: true,
      xTitle: "Date",
      xMaxTicksLimit: inventoryXAxisLimit,
      yTitle: "Biomass / Feed (kg)",
      yRightTitle: "ABW (g)",
      tooltip: {
        callbacks: {
          title: (items: any) => formatDateOnly(inventoryDateDomain[items[0]?.dataIndex ?? 0] ?? ""),
          label: (context: any) => {
            const label = context.dataset.label ?? ""
            const numeric = Number(context.parsed.y)
            const unit = label.includes("ABW") ? "g" : "kg"
            return `${label}: ${formatNumberValue(numeric, { decimals: 1 })} ${unit}`
          },
        },
      },
      xTickFormatter: (_value, index) => formatCompactDate(inventoryDateDomain[index] ?? ""),
    })
  }, [inventoryDateDomain, inventoryXAxisLimit, palette])

  const waterChartData = useMemo<ChartData<"line">>(
    () => ({
      labels: waterDateDomain,
      datasets: [
        {
          label: "DO (mg/L)",
          data: waterDateDomain.map((date) => waterRowsByDate.get(date)?.dissolvedOxygen ?? null),
          borderColor: palette.chart1,
          backgroundColor: palette.chart1,
          borderWidth: 2.4,
          pointRadius: 0,
          spanGaps: true,
          yAxisID: "y",
        },
        {
          label: "Temperature (C)",
          data: waterDateDomain.map((date) => waterRowsByDate.get(date)?.temperature ?? null),
          borderColor: palette.chart4,
          backgroundColor: palette.chart4,
          borderWidth: 2.4,
          pointRadius: 0,
          spanGaps: true,
          yAxisID: "y1",
        },
      ],
    }),
    [palette.chart1, palette.chart4, waterDateDomain, waterRowsByDate],
  )

  const waterChartOptions = useMemo<ChartOptions<"line">>(() => {
    return buildCartesianOptions({
      palette,
      legend: true,
      xTitle: "Date",
      xMaxTicksLimit: waterXAxisLimit,
      yTitle: "DO (mg/L)",
      tooltip: {
        callbacks: {
          title: (items: any) => formatDateOnly(waterDateDomain[items[0]?.dataIndex ?? 0] ?? ""),
          label: (context: any) => {
            const label = context.dataset.label ?? ""
            const unit = label.includes("DO") ? "mg/L" : "C"
            return `${label}: ${formatNumberValue(Number(context.parsed.y), { decimals: 2 })} ${unit}`
          },
        },
      },
      xTickFormatter: (_value, index) => formatCompactDate(waterDateDomain[index] ?? ""),
      extraScales: {
        y1: {
          position: "right",
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
  }, [palette, waterDateDomain, waterXAxisLimit])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[760px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <div>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{sourceLabel}: {periodLabel}. Snapshot as of {snapshotLabel}.</SheetDescription>
            </div>
            <DataFetchingBadge isFetching={fetching} isLoading={loading} />
          </div>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          {errorMessages.length > 0 ? <DataErrorState title="Unable to load system history" description={errorMessages[0]} /> : null}
          {!hasAnyTimeline && errorMessages.length === 0 ? (
            <DataErrorState
              title="No production timeline"
              description="This system does not have enough stocking or observed activity data to resolve an honest production period yet."
            />
          ) : null}
          {hasAnyTimeline && !hasResolvedTimeline && errorMessages.length === 0 ? (
            <DataErrorState
              title="No production data in selected period"
              description="This system has a production timeline, but it does not overlap the currently selected time period."
            />
          ) : null}

          {hasResolvedTimeline ? (
            <>
          <div className="kpi-grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="kpi-card">
              <CardHeader className="kpi-card-header"><CardTitle className="kpi-card-title">Live Fish</CardTitle></CardHeader>
              <CardContent className="kpi-card-content"><p className="kpi-card-value">{formatNumberValue(latestInventory?.number_of_fish ?? summaryRow?.fish_end)}</p></CardContent>
            </Card>
            <Card className="kpi-card">
              <CardHeader className="kpi-card-header"><CardTitle className="kpi-card-title">Biomass</CardTitle></CardHeader>
              <CardContent className="kpi-card-content"><p className="kpi-card-value">{formatUnitValue(latestInventory?.biomass_last_sampling ?? summaryRow?.biomass_end, 1, "kg")}</p></CardContent>
            </Card>
            <Card className="kpi-card">
              <CardHeader className="kpi-card-header"><CardTitle className="kpi-card-title">ABW</CardTitle></CardHeader>
              <CardContent className="kpi-card-content"><p className="kpi-card-value">{formatUnitValue(latestSampling?.abw ?? latestInventory?.abw_last_sampling ?? summaryRow?.abw, 1, "g")}</p></CardContent>
            </Card>
            <Card className="kpi-card">
              <CardHeader className="kpi-card-header"><CardTitle className="kpi-card-title">Survival</CardTitle></CardHeader>
              <CardContent className="kpi-card-content"><p className="kpi-card-value">{latestSurvival ? `${formatNumberValue(latestSurvival.survival_pct, { decimals: 1, minimumDecimals: 1 })}%` : "--"}</p></CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {summaryRow?.growth_stage ? <Badge variant="outline">{summaryRow.growth_stage}</Badge> : null}
            <Badge variant="outline">{sourceLabel}</Badge>
            <Badge className={ratingToneClass(latestRating?.rating ?? summaryRow?.water_quality_rating_average)}>
              {latestRating?.rating ?? summaryRow?.water_quality_rating_average ?? "No WQ rating"}
            </Badge>
            {summaryRow?.worst_parameter ? (
              <Badge variant="outline">
                {summaryRow.worst_parameter}: {formatNumberValue(summaryRow.worst_parameter_value, { decimals: 2 })} {summaryRow.worst_parameter_unit ?? ""}
              </Badge>
            ) : null}
            {(summaryRow?.missing_days_count ?? 0) > 0 ? <Badge variant="outline">Missing {summaryRow?.missing_days_count} day(s)</Badge> : null}
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="water">Water</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="kpi-grid gap-3 md:grid-cols-3">
                <Card className="kpi-card">
                  <CardHeader className="kpi-card-header">
                    <CardTitle className="kpi-card-title">Feed In Range</CardTitle>
                    <CardDescription>{periodLabel}</CardDescription>
                  </CardHeader>
                  <CardContent className="kpi-card-content"><p className="kpi-card-value">{formatUnitValue(totalFeedKg, 1, "kg")}</p></CardContent>
                </Card>
                <Card className="kpi-card">
                  <CardHeader className="kpi-card-header"><CardTitle className="kpi-card-title">Mortality In Range</CardTitle><CardDescription>Recorded losses</CardDescription></CardHeader>
                  <CardContent className="kpi-card-content"><p className="kpi-card-value">{formatNumberValue(totalMortality)} fish</p></CardContent>
                </Card>
                <Card className="kpi-card">
                  <CardHeader className="kpi-card-header"><CardTitle className="kpi-card-title">Harvest In Range</CardTitle><CardDescription>Recorded harvests</CardDescription></CardHeader>
                  <CardContent className="kpi-card-content"><p className="kpi-card-value">{formatUnitValue(totalHarvestKg, 1, "kg")}</p></CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Biomass and ABW Trend</CardTitle>
                  <CardDescription>How this unit progressed across the selected period.</CardDescription>
                </CardHeader>
                <CardContent>
                  {inventoryTrendRows.length === 0 ? (
                    <EmptyState title="No inventory trend available" description="Daily inventory points for this unit will appear here." icon={TrendingUp} />
                  ) : (
                    <div className="chart-canvas-shell h-[280px]">
                      <Chart type="bar" data={inventoryChartData} options={inventoryChartOptions} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Operations</CardTitle>
                  <CardDescription>Initial stocking, additions, transfers, feedings, samples, mortalities, and harvests inside the resolved period.</CardDescription>
                </CardHeader>
                <CardContent>
                  {operations.length === 0 ? (
                    <EmptyState title="No operations in range" description="Once this unit has recent activity, it will appear here." icon={Fish} />
                  ) : (
                    <div className="space-y-3">
                      {operations.map((item) => (
                        <div key={item.id} className="rounded-md border border-border/80 bg-muted/20 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">{item.type}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <p>{formatDateOnly(item.date)}</p>
                              <p>{formatDateTimeValue(item.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="water" className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Card className="gap-2 py-3">
                  <CardHeader className="px-3"><CardTitle className="text-sm">Latest Water Rating</CardTitle><CardDescription>Most recent daily classification</CardDescription></CardHeader>
                  <CardContent className="px-3">
                    <div className="flex items-center gap-2">
                      <Badge className={ratingToneClass(latestRating?.rating)}>{latestRating?.rating ?? "Unknown"}</Badge>
                      {latestRating?.rating_date ? <span className="text-xs text-muted-foreground">{formatDateOnly(latestRating.rating_date)}</span> : null}
                    </div>
                  </CardContent>
                </Card>
                <Card className="gap-2 py-3">
                  <CardHeader className="px-3"><CardTitle className="text-sm">Latest Worst Parameter</CardTitle><CardDescription>Most limiting reading in the daily rating</CardDescription></CardHeader>
                  <CardContent className="px-3">
                    <p className="text-base font-semibold">
                      {latestRating?.worst_parameter ? `${latestRating.worst_parameter} ${formatNumberValue(latestRating.worst_parameter_value, { decimals: 2 })} ${latestRating.worst_parameter_unit ?? ""}` : "No issue recorded"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>DO and Temperature Trend</CardTitle>
                  <CardDescription>Daily average water conditions for this unit.</CardDescription>
                </CardHeader>
                <CardContent>
                  {waterTrendRows.length === 0 ? (
                    <EmptyState title="No water trend available" description="Recent oxygen and temperature measurements will appear here." icon={TestTube} />
                  ) : (
                    <div className="chart-canvas-shell h-[280px]">
                      <Line data={waterChartData} options={waterChartOptions} />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Latest Measurements</CardTitle>
                  <CardDescription>Newest reading per parameter.</CardDescription>
                </CardHeader>
                <CardContent>
                  {latestMeasurements.length === 0 ? (
                    <EmptyState title="No recent measurements" description="Capture water quality to populate this unit history." icon={TestTube} />
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {latestMeasurements.map((row) => (
                        <div key={`${row.parameter_name}-${row.created_at}`} className="rounded-md border border-border/80 px-3 py-2">
                          <p className="text-sm font-medium">{row.parameter_name}</p>
                          <p className="text-sm text-muted-foreground">{formatNumberValue(row.parameter_value, { decimals: 2 })} {row.unit ?? ""}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDateOnly(row.date)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
            </>
          ) : null}
        </div>

        <SheetFooter className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="outline" onClick={() => router.push(`/data-entry?type=feeding&system=${systemId ?? ""}`)} className="cursor-pointer">
            <Fish className="mr-2 h-4 w-4" />
            Record Feeding
          </Button>
          <Button variant="outline" onClick={() => router.push(`/data-entry?type=sampling&system=${systemId ?? ""}`)} className="cursor-pointer">
            <TrendingUp className="mr-2 h-4 w-4" />
            Record Sampling
          </Button>
          <Button variant="outline" onClick={() => router.push(`/data-entry?type=mortality&system=${systemId ?? ""}`)} className="cursor-pointer">
            <Skull className="mr-2 h-4 w-4" />
            Record Mortality
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

