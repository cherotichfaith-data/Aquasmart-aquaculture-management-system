"use client"

import { useMemo } from "react"
import {
    Area,
    CartesianGrid,
    ComposedChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import type { Enums } from "@/lib/types/database"
import type { TimePeriod } from "@/components/shared/time-period-selector"
import type { DashboardPageInitialData } from "@/features/dashboard/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useProductionTrend } from "@/lib/hooks/use-dashboard"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { getErrorMessage } from "@/lib/utils/query-result"
import { formatChartDate, formatNumberValue } from "@/lib/analytics-format"

export default function PopulationOverview({
    stage,
    batch,
    system,
    timePeriod,
    scopedSystemIds,
    dateFrom,
    dateTo,
    farmId: initialFarmId,
    initialData,
    initialBounds,
}: {
    stage?: "all" | Enums<"system_growth_stage"> | null
    batch?: string
    system?: string
    timePeriod: TimePeriod
    scopedSystemIds?: number[] | null
    dateFrom?: string
    dateTo?: string
    farmId?: string | null
    initialData?: DashboardPageInitialData["productionTrend"]
    initialBounds?: DashboardPageInitialData["bounds"]
}) {
    const { farmId: activeFarmId } = useActiveFarm()
    const farmId = activeFarmId ?? initialFarmId
    const boundsReady = Boolean(dateFrom && dateTo)
    const canUseInitialData =
        boundsReady && initialBounds?.start === dateFrom && initialBounds?.end === dateTo
    const summaryQuery = useProductionTrend({
        farmId,
        stage: stage && stage !== "all" ? stage : undefined,
        batch: batch ?? "all",
        system,
        timePeriod,
        scopedSystemIds,
        dateFrom: dateFrom ?? null,
        dateTo: dateTo ?? null,
        initialData: canUseInitialData ? initialData : undefined,
    })

    const chartData = useMemo(() => {
        const rows = summaryQuery.data ?? []
        const byDate = new Map<string, { mortality: number; weightedEfcr: number; efcrWeight: number; efcrFallback: number; efcrCount: number }>()

        rows.forEach((row) => {
            if (!row.date) return
            const current = byDate.get(row.date) ?? { mortality: 0, weightedEfcr: 0, efcrWeight: 0, efcrFallback: 0, efcrCount: 0 }
            current.mortality += row.daily_mortality_count ?? 0
            if (typeof row.efcr_period === "number") {
                const weight = row.total_feed_amount_period ?? 0
                if (weight > 0) {
                    current.weightedEfcr += row.efcr_period * weight
                    current.efcrWeight += weight
                } else {
                    current.efcrFallback += row.efcr_period
                    current.efcrCount += 1
                }
            }
            byDate.set(row.date, current)
        })

        return Array.from(byDate.entries())
            .map(([date, current]) => ({
                date,
                efcr_period:
                    current.efcrWeight > 0
                        ? current.weightedEfcr / current.efcrWeight
                        : current.efcrCount > 0
                            ? current.efcrFallback / current.efcrCount
                            : null,
                daily_mortality_count: current.mortality,
            }))
            .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    }, [summaryQuery.data])
    const errorMessage = getErrorMessage(summaryQuery.error)

    if (summaryQuery.isError) {
        return (
            <DataErrorState
                title="Unable to load production trends"
                description={errorMessage ?? "Please retry or check your connection."}
                onRetry={() => summaryQuery.refetch()}
            />
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <Card className="w-full">
                <CardHeader className="border-b border-border">
                    <div className="flex items-center justify-between">
                        <CardTitle>eFCR Trend</CardTitle>
                        <DataFetchingBadge isFetching={summaryQuery.isFetching} isLoading={summaryQuery.isLoading} />
                    </div>
                    <DataUpdatedAt updatedAt={summaryQuery.dataUpdatedAt} />
                </CardHeader>
                <CardContent className="pt-4">
                    {!boundsReady || summaryQuery.isLoading ? (
                        <div className="h-[320px] flex items-center justify-center text-muted-foreground">Loading chart...</div>
                    ) : chartData.length ? (
                        <LazyRender className="h-[320px]" fallback={<div className="h-full w-full" />}>
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickFormatter={(value: any) => formatChartDate(value, { month: "short", day: "numeric" })} />
                                <YAxis stroke="var(--color-muted-foreground)" />
                                <Tooltip
                                    labelFormatter={(value) => formatChartDate(value, { month: "short", day: "numeric" })}
                                    formatter={(value, name) => [formatNumberValue(Number(value), { decimals: 2, minimumDecimals: 2 }), String(name)]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="efcr_period"
                                    stroke="var(--color-chart-1)"
                                    fill="var(--color-chart-1)"
                                    fillOpacity={0.18}
                                    name="eFCR"
                                />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </LazyRender>
                    ) : (
                        <EmptyState title="No trend data" description="No eFCR data available for the selected range." />
                    )}
                </CardContent>
            </Card>

            <Card className="w-full">
                <CardHeader className="border-b border-border">
                    <div className="flex items-center justify-between">
                        <CardTitle>Mortality Trend</CardTitle>
                        <DataFetchingBadge isFetching={summaryQuery.isFetching} isLoading={summaryQuery.isLoading} />
                    </div>
                    <DataUpdatedAt updatedAt={summaryQuery.dataUpdatedAt} />
                </CardHeader>
                <CardContent className="pt-4">
                    {!boundsReady || summaryQuery.isLoading ? (
                        <div className="h-[320px] flex items-center justify-center text-muted-foreground">Loading chart...</div>
                    ) : chartData.length ? (
                        <LazyRender className="h-[320px]" fallback={<div className="h-full w-full" />}>
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickFormatter={(value: any) => formatChartDate(value, { month: "short", day: "numeric" })} />
                                <YAxis stroke="var(--color-muted-foreground)" />
                                <Tooltip
                                    labelFormatter={(value) => formatChartDate(value, { month: "short", day: "numeric" })}
                                    formatter={(value, name) => [formatNumberValue(Number(value)), String(name)]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="daily_mortality_count"
                                    fill="var(--color-destructive)"
                                    fillOpacity={0.2}
                                    stroke="var(--color-destructive)"
                                    name="Mortality count"
                                />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </LazyRender>
                    ) : (
                        <EmptyState title="No trend data" description="No mortality data available for the selected range." />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
