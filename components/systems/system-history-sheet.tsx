"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  Bar,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Fish, Skull, TestTube, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { useMortalityData, useFeedingRecords, useSamplingData, useTransferData } from "@/lib/hooks/use-reports"
import { useSurvivalTrend } from "@/lib/hooks/use-mortality"
import { useDailyWaterQualityRating, useWaterQualityMeasurements } from "@/lib/hooks/use-water-quality"
import { getHarvests } from "@/lib/api/reports"
import type { DashboardSystemRow } from "@/features/dashboard/types"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"

type OperationRow = {
  id: string
  date: string
  createdAt: string | null
  type: "Feeding" | "Sampling" | "Mortality" | "Transfer" | "Harvest"
  detail: string
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return "--"
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(parsed)
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "--"
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

const formatNumber = (value: number | null | undefined, decimals = 0) => {
  if (value == null || Number.isNaN(value)) return "--"
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

const formatUnit = (value: number | null | undefined, decimals: number, unit: string) => {
  const base = formatNumber(value, decimals)
  return base === "--" ? "--" : `${base} ${unit}`
}

const formatCompactDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
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

  const inventoryQuery = useDailyFishInventory({
    farmId,
    systemId: systemId ?? undefined,
    dateFrom,
    dateTo,
    limit: 120,
    orderAsc: true,
    enabled,
  })
  const feedingQuery = useFeedingRecords({
    farmId,
    systemId: systemId ?? undefined,
    dateFrom,
    dateTo,
    limit: 40,
    enabled,
  })
  const samplingQuery = useSamplingData({
    systemId: systemId ?? undefined,
    dateFrom,
    dateTo,
    limit: 24,
    enabled,
  })
  const mortalityQuery = useMortalityData({
    systemId: systemId ?? undefined,
    dateFrom,
    dateTo,
    limit: 24,
    enabled,
  })
  const transferQuery = useTransferData({
    dateFrom,
    dateTo,
    limit: 60,
    enabled,
  })
  const harvestQuery = useQuery({
    queryKey: ["system-history", "harvests", systemId ?? "all"],
    queryFn: ({ signal }) => getHarvests({ systemId: systemId ?? undefined, limit: 20, signal }),
    enabled,
    staleTime: 60_000,
  })
  const survivalQuery = useSurvivalTrend({
    systemId: systemId ?? undefined,
    dateFrom,
    dateTo,
    enabled,
  })
  const waterRatingQuery = useDailyWaterQualityRating({
    farmId,
    systemId: systemId ?? undefined,
    dateFrom,
    dateTo,
    limit: 60,
    enabled,
  })
  const measurementQuery = useWaterQualityMeasurements({
    farmId,
    systemId: systemId ?? undefined,
    dateFrom,
    dateTo,
    limit: 200,
    enabled,
  })

  const inventoryRows = inventoryQuery.data?.status === "success" ? inventoryQuery.data.data : []
  const feedingRows = feedingQuery.data?.status === "success" ? feedingQuery.data.data : []
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

  const inventoryTrendRows = useMemo(
    () =>
      inventoryRows.map((row) => ({
        date: row.inventory_date,
        label: formatCompactDate(row.inventory_date),
        biomass: row.biomass_last_sampling,
        abw: row.abw_last_sampling,
        feed: row.feeding_amount,
      })),
    [inventoryRows],
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
    feedingRows.forEach((row) => {
      items.push({
        id: `feeding-${row.id}`,
        date: row.date,
        createdAt: row.created_at,
        type: "Feeding",
        detail: `${formatUnit(row.feeding_amount, 1, "kg")} | ${row.feeding_response ?? "response N/A"}`,
      })
    })
    samplingRows.forEach((row) => {
      items.push({
        id: `sampling-${row.id}`,
        date: row.date,
        createdAt: row.created_at,
        type: "Sampling",
        detail: `ABW ${formatUnit(row.abw, 1, "g")} from ${formatNumber(row.number_of_fish_sampling, 0)} fish`,
      })
    })
    mortalityRows.forEach((row) => {
      items.push({
        id: `mortality-${row.id}`,
        date: row.date,
        createdAt: row.created_at,
        type: "Mortality",
        detail: `${formatNumber(row.number_of_fish_mortality, 0)} fish`,
      })
    })
    transferRows.forEach((row) => {
      const direction = row.origin_system_id === systemId ? "Out" : "In"
      const counterpart = row.origin_system_id === systemId ? row.target_system_id : row.origin_system_id
      items.push({
        id: `transfer-${row.id}`,
        date: row.date,
        createdAt: row.created_at,
        type: "Transfer",
        detail: `${direction} ${formatNumber(row.number_of_fish_transfer, 0)} fish ${direction === "Out" ? "to" : "from"} system ${counterpart}`,
      })
    })
    harvestRows.forEach((row) => {
      items.push({
        id: `harvest-${row.id}`,
        date: row.date,
        createdAt: row.created_at,
        type: "Harvest",
        detail: `${formatUnit(row.total_weight_harvest, 1, "kg")} | ${formatNumber(row.number_of_fish_harvest, 0)} fish`,
      })
    })
    return items
      .sort((a, b) => {
        const dateCompare = String(b.date).localeCompare(String(a.date))
        if (dateCompare !== 0) return dateCompare
        return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
      })
      .slice(0, 20)
  }, [feedingRows, harvestRows, mortalityRows, samplingRows, systemId, transferRows])

  const errorMessages = [
    getErrorMessage(inventoryQuery.error),
    getQueryResultError(inventoryQuery.data),
    getErrorMessage(feedingQuery.error),
    getQueryResultError(feedingQuery.data),
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
    inventoryQuery.isLoading ||
    feedingQuery.isLoading ||
    samplingQuery.isLoading ||
    mortalityQuery.isLoading ||
    transferQuery.isLoading ||
    harvestQuery.isLoading ||
    survivalQuery.isLoading ||
    waterRatingQuery.isLoading ||
    measurementQuery.isLoading

  const fetching =
    inventoryQuery.isFetching ||
    feedingQuery.isFetching ||
    samplingQuery.isFetching ||
    mortalityQuery.isFetching ||
    transferQuery.isFetching ||
    harvestQuery.isFetching ||
    survivalQuery.isFetching ||
    waterRatingQuery.isFetching ||
    measurementQuery.isFetching

  const title = systemLabel ?? summaryRow?.system_name ?? (systemId ? `System ${systemId}` : "System")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[760px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <div>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>Unit history, recent operations, and environmental context.</SheetDescription>
            </div>
            <DataFetchingBadge isFetching={fetching} isLoading={loading} />
          </div>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          {errorMessages.length > 0 ? <DataErrorState title="Unable to load system history" description={errorMessages[0]} /> : null}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="gap-2 py-3">
              <CardHeader className="px-3"><CardTitle className="text-sm">Live Fish</CardTitle></CardHeader>
              <CardContent className="px-3"><p className="text-2xl font-semibold">{formatNumber(latestInventory?.number_of_fish ?? summaryRow?.fish_end, 0)}</p></CardContent>
            </Card>
            <Card className="gap-2 py-3">
              <CardHeader className="px-3"><CardTitle className="text-sm">Biomass</CardTitle></CardHeader>
              <CardContent className="px-3"><p className="text-2xl font-semibold">{formatUnit(latestInventory?.biomass_last_sampling ?? summaryRow?.biomass_end, 1, "kg")}</p></CardContent>
            </Card>
            <Card className="gap-2 py-3">
              <CardHeader className="px-3"><CardTitle className="text-sm">ABW</CardTitle></CardHeader>
              <CardContent className="px-3"><p className="text-2xl font-semibold">{formatUnit(latestSampling?.abw ?? latestInventory?.abw_last_sampling ?? summaryRow?.abw, 1, "g")}</p></CardContent>
            </Card>
            <Card className="gap-2 py-3">
              <CardHeader className="px-3"><CardTitle className="text-sm">Survival</CardTitle></CardHeader>
              <CardContent className="px-3"><p className="text-2xl font-semibold">{latestSurvival ? `${formatNumber(latestSurvival.survival_pct, 1)}%` : "--"}</p></CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {summaryRow?.growth_stage ? <Badge variant="outline">{summaryRow.growth_stage}</Badge> : null}
            <Badge className={ratingToneClass(latestRating?.rating ?? summaryRow?.water_quality_rating_average)}>
              {latestRating?.rating ?? summaryRow?.water_quality_rating_average ?? "No WQ rating"}
            </Badge>
            {summaryRow?.worst_parameter ? (
              <Badge variant="outline">
                {summaryRow.worst_parameter}: {formatNumber(summaryRow.worst_parameter_value, 2)} {summaryRow.worst_parameter_unit ?? ""}
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
              <div className="grid gap-3 md:grid-cols-3">
                <Card className="gap-2 py-3">
                  <CardHeader className="px-3">
                    <CardTitle className="text-sm">Feed In Range</CardTitle>
                    <CardDescription>{dateFrom && dateTo ? `${formatDate(dateFrom)} to ${formatDate(dateTo)}` : "Selected period"}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-3"><p className="text-xl font-semibold">{formatUnit(totalFeedKg, 1, "kg")}</p></CardContent>
                </Card>
                <Card className="gap-2 py-3">
                  <CardHeader className="px-3"><CardTitle className="text-sm">Mortality In Range</CardTitle><CardDescription>Recorded losses</CardDescription></CardHeader>
                  <CardContent className="px-3"><p className="text-xl font-semibold">{formatNumber(totalMortality, 0)} fish</p></CardContent>
                </Card>
                <Card className="gap-2 py-3">
                  <CardHeader className="px-3"><CardTitle className="text-sm">Harvest In Range</CardTitle><CardDescription>Recorded harvests</CardDescription></CardHeader>
                  <CardContent className="px-3"><p className="text-xl font-semibold">{formatUnit(totalHarvestKg, 1, "kg")}</p></CardContent>
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
                    <div className="h-[280px] rounded-md border border-border/80 bg-muted/20 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={inventoryTrendRows}>
                          <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value, name) => {
                            const unit = name === "Biomass (kg)" ? "kg" : name === "Feed (kg)" ? "kg" : "g"
                            return [`${formatNumber(Number(value), 1)} ${unit}`, String(name)]
                          }} />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="biomass" stroke="hsl(var(--chart-1))" strokeWidth={2.4} name="Biomass (kg)" dot={false} />
                          <Line yAxisId="right" type="monotone" dataKey="abw" stroke="hsl(var(--chart-2))" strokeWidth={2.4} name="ABW (g)" dot={false} />
                          <Bar yAxisId="left" dataKey="feed" fill="hsl(var(--chart-3))" name="Feed (kg)" radius={[4, 4, 0, 0]} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Operations</CardTitle>
                  <CardDescription>Latest feedings, samples, mortalities, transfers, and harvests.</CardDescription>
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
                              <p>{formatDate(item.date)}</p>
                              <p>{formatDateTime(item.createdAt)}</p>
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
                      {latestRating?.rating_date ? <span className="text-xs text-muted-foreground">{formatDate(latestRating.rating_date)}</span> : null}
                    </div>
                  </CardContent>
                </Card>
                <Card className="gap-2 py-3">
                  <CardHeader className="px-3"><CardTitle className="text-sm">Latest Worst Parameter</CardTitle><CardDescription>Most limiting reading in the daily rating</CardDescription></CardHeader>
                  <CardContent className="px-3">
                    <p className="text-base font-semibold">
                      {latestRating?.worst_parameter ? `${latestRating.worst_parameter} ${formatNumber(latestRating.worst_parameter_value, 2)} ${latestRating.worst_parameter_unit ?? ""}` : "No issue recorded"}
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
                    <div className="h-[280px] rounded-md border border-border/80 bg-muted/20 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={waterTrendRows}>
                          <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value, name) => {
                            const unit = name === "DO (mg/L)" ? "mg/L" : "C"
                            return [`${formatNumber(Number(value), 2)} ${unit}`, String(name)]
                          }} />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="dissolvedOxygen" stroke="hsl(var(--chart-1))" strokeWidth={2.4} name="DO (mg/L)" dot={false} />
                          <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="hsl(var(--chart-4))" strokeWidth={2.4} name="Temperature (C)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
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
                          <p className="text-sm text-muted-foreground">{formatNumber(row.parameter_value, 2)} {row.unit ?? ""}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(row.date)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
