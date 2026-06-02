"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ChartData, ChartOptions } from "chart.js"
import CardContent from "@mui/material/CardContent"
import { Card } from "@/components/app-ui/card"
import { Chart } from "@/components/charts/chartjs"
import { DataErrorState, DataFetchingBadge, EmptyState } from "@/components/shared/data-states"
import { buildCartesianOptions, buildMetricAxisBounds, getChartPalette } from "@/components/charts/chartjs-theme"
import { formatNumberValue } from "@/lib/analytics-format"
import { formatStableDate } from "@/lib/deterministic-format"
import { getErrorMessage } from "@/lib/utils/query-result"
import { getFcrIntervals } from "@/lib/api/analytics"

type EfcrInterval = {
  system_id: number
  system_name: string
  interval_start: string
  interval_end: string
  interval_days: number
  total_feed_kg: number
  weight_gain_kg: number | null
  fcr: number | null
}

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)

function bucketLabel(start: string, end: string) {
  if (!start || !end) return "Period"
  const startDate = new Date(`${start}T00:00:00Z`)
  const endDate = new Date(`${end}T00:00:00Z`)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return `${start} - ${end}`
  return `${formatStableDate(startDate, { month: "short", day: "numeric", year: undefined })} - ${formatStableDate(endDate, { month: "short", day: "numeric", year: undefined })}`
}

export default function EfcrByPeriod({
  farmId,
  dateFrom,
  dateTo,
  scopedSystemIds,
}: {
  farmId?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  scopedSystemIds?: number[] | null
}) {
  const palette = getChartPalette()
  const scopeKey = scopedSystemIds?.join(",") ?? "all"
  const enabled = Boolean(farmId && dateFrom && dateTo && Array.isArray(scopedSystemIds) && scopedSystemIds.length > 0)
  const query = useQuery({
    queryKey: ["dashboard", "efcr-by-period", farmId, dateFrom, dateTo, scopeKey],
    queryFn: async ({ signal }) => {
      const result = await getFcrIntervals({
        farmId: farmId!,
        dateFrom: dateFrom ?? undefined,
        dateTo: dateTo ?? undefined,
        signal,
      })
      if (result.status !== "success") throw new Error(result.error ?? "Unable to load eFCR intervals.")
      const scope = new Set(scopedSystemIds ?? [])
      return (result.data as EfcrInterval[]).filter(
        (row) => scope.has(row.system_id) && isFiniteNumber(row.fcr) && row.fcr > 0,
      )
    },
    enabled,
    staleTime: 5 * 60_000,
  })

  const chartRows = useMemo(() => {
    const rows = query.data ?? []
    const byPeriod = new Map<string, { label: string; weightedFcr: number; weight: number; fallback: number; count: number }>()

    rows.forEach((row) => {
      const key = `${row.interval_start}:${row.interval_end}`
      const current = byPeriod.get(key) ?? {
        label: bucketLabel(row.interval_start, row.interval_end),
        weightedFcr: 0,
        weight: 0,
        fallback: 0,
        count: 0,
      }
      const weight = isFiniteNumber(row.weight_gain_kg) && row.weight_gain_kg > 0 ? row.weight_gain_kg : 0
      if (weight > 0) {
        current.weightedFcr += (row.fcr ?? 0) * weight
        current.weight += weight
      } else {
        current.fallback += row.fcr ?? 0
        current.count += 1
      }
      byPeriod.set(key, current)
    })

    return Array.from(byPeriod.entries())
      .map(([key, value]) => ({
        key,
        label: value.label,
        fcr: value.weight > 0 ? value.weightedFcr / value.weight : value.count > 0 ? value.fallback / value.count : null,
      }))
      .filter((row) => row.fcr != null)
      .sort((left, right) => left.key.localeCompare(right.key))
  }, [query.data])

  const bounds = useMemo(
    () => buildMetricAxisBounds(chartRows.map((row) => row.fcr), { minFloor: 0, includeZero: true }),
    [chartRows],
  )
  const data = useMemo<ChartData<"bar">>(
    () => ({
      labels: chartRows.map((row) => row.label),
      datasets: [
        {
          label: "eFCR",
          data: chartRows.map((row) => row.fcr),
          backgroundColor: "#4472C4",
          borderColor: "#4472C4",
          borderWidth: 1,
          borderRadius: 0,
          maxBarThickness: 34,
        },
      ],
    }),
    [chartRows],
  )
  const options = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions<"bar">({
        palette,
        min: bounds.min,
        max: bounds.max,
        lockYBounds: true,
        yTitle: "eFCR",
        yTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 2 }),
        tooltip: {
          callbacks: {
            label: (context: any) => `eFCR: ${formatNumberValue(Number(context.parsed.y), { decimals: 2 })}`,
          },
        },
      }),
    [bounds.max, bounds.min, palette],
  )

  if (query.isError) {
    return (
      <DataErrorState
        title="Unable to load eFCR by period"
        description={getErrorMessage(query.error) ?? "Please retry or check your connection."}
        onRetry={() => query.refetch()}
      />
    )
  }

  return (
    <Card>
      <CardContent sx={{ "&&": { pt: 2 }, px: 3, pb: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[1rem] font-semibold text-foreground">eFCR by Period</span>
          <DataFetchingBadge isFetching={query.isFetching} isLoading={query.isLoading} />
        </div>
        {!enabled ? (
          <EmptyState title="No active production scope" description="Select a farm with active production systems." />
        ) : query.isLoading ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Loading eFCR...</div>
        ) : chartRows.length ? (
          <div className="border border-border bg-background px-2 py-3">
            <div className="h-[300px]">
              <Chart type="bar" data={data} options={options} />
            </div>
          </div>
        ) : (
          <EmptyState title="No eFCR intervals" description="No valid feed-to-growth intervals match this period." />
        )}
      </CardContent>
    </Card>
  )
}
