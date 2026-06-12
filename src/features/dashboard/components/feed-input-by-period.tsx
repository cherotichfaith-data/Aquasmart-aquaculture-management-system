"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Bar } from "@/components/charts/chartjs"
import { buildCartesianOptions, getChartPalette } from "@/components/charts/chartjs-theme"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { DataFetchingBadge } from "@/components/shared/data-states"
import { formatDateOnly, formatNumberValue } from "@/lib/analytics-format"
import { useFeedingRecords } from "@/lib/hooks/use-reports"
import type { TimePeriod } from "@/lib/time-period"
import { formatBucketLabel, formatGranularityLabel, getBucketGranularity, getBucketKey } from "@/lib/time-series"

const getMaxNumber = (values: number[], fallback = 1) => (values.length ? Math.max(...values) : fallback)

export default function FeedInputByPeriod({
  farmId,
  batch = "all",
  timePeriod,
  dateFrom,
  dateTo,
  scopedSystemIds,
  mode = "period",
}: {
  farmId?: string | null
  batch?: string
  timePeriod: TimePeriod
  dateFrom?: string
  dateTo?: string
  scopedSystemIds?: number[] | null
  mode?: "daily" | "period"
}) {
  const batchId = batch !== "all" && Number.isFinite(Number(batch)) ? Number(batch) : undefined
  const enabled = Boolean(farmId && dateFrom && dateTo) && (!Array.isArray(scopedSystemIds) || scopedSystemIds.length > 0)
  const feedingRecordsQuery = useFeedingRecords({
    farmId,
    systemIds: Array.isArray(scopedSystemIds) ? scopedSystemIds : undefined,
    batchId,
    dateFrom,
    dateTo,
    limit: 5000,
    enabled,
  })
  const records = feedingRecordsQuery.data?.status === "success" ? feedingRecordsQuery.data.data : []
  const granularity = useMemo(() => getBucketGranularity(timePeriod), [timePeriod])
  const granularityLabel = useMemo(() => formatGranularityLabel(granularity), [granularity])
  const palette = getChartPalette()

  const rows = useMemo(() => {
    const buckets = new Map<string, { bucket: string; feedKg: number }>()
    records.forEach((row) => {
      const key = mode === "daily" ? row.date : getBucketKey(row.date, granularity)
      if (!key) return
      const current = buckets.get(key) ?? { bucket: key, feedKg: 0 }
      current.feedKg += row.feeding_amount ?? 0
      buckets.set(key, current)
    })

    return Array.from(buckets.values())
      .sort((left, right) => left.bucket.localeCompare(right.bucket))
      .map((row) => ({
        ...row,
        label: mode === "daily" ? formatDateOnly(row.bucket, row.bucket) : formatBucketLabel(row.bucket, granularity),
      }))
  }, [granularity, mode, records])

  const data = useMemo<ChartData<"bar">>(
    () => ({
      labels: rows.map((row) => row.label),
      datasets: [
        {
          label: "Feed",
          data: rows.map((row) => row.feedKg),
          backgroundColor: palette.chart1,
          borderRadius: 6,
        },
      ],
    }),
    [palette.chart1, rows],
  )

  const options = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        min: 0,
        max: Math.max(1, Math.ceil(getMaxNumber(rows.map((row) => row.feedKg)) * 1.12)),
        xTitle: mode === "daily" ? "Date" : granularity === "month" ? "Month" : granularity === "quarter" ? "Quarter" : "Date",
        yTitle: "Feed (kg)",
        xTickFormatter: (_value, index) => rows[index]?.label ?? "",
        tooltip: {
          callbacks: {
            label: (context: any) =>
              `Feed: ${formatNumberValue(Number(context.parsed.y), { decimals: 1, fallback: "N/A" })} kg`,
          },
        },
      }),
    [granularity, mode, palette, rows],
  )

  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{mode === "daily" ? "Daily feed input" : `Feed input by ${granularityLabel}`}</CardTitle>
          <DataFetchingBadge isFetching={feedingRecordsQuery.isFetching} isLoading={feedingRecordsQuery.isLoading} />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {feedingRecordsQuery.isLoading ? (
          <div className="flex h-[340px] items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="flex h-[340px] items-center justify-center text-sm text-muted-foreground">
            No feed records in the selected scope.
          </div>
        ) : (
          <div className="chart-canvas-shell h-[340px]">
            <Bar data={data} options={options} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
