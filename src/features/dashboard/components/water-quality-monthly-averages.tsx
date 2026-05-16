"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import CardContent from "@mui/material/CardContent"
import { Card } from "@/components/app-ui/card"
import { Chart } from "@/components/charts/chartjs"
import { DataErrorState, DataFetchingBadge, EmptyState } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { buildCartesianOptions, buildMetricAxisBounds, getChartPalette } from "@/components/charts/chartjs-theme"
import { formatNumberValue } from "@/lib/analytics-format"
import { getErrorMessage } from "@/lib/utils/query-result"
import { useWaterQualityMeasurements } from "@/lib/hooks/use-water-quality"

type MeasurementRow = {
  system_id?: number | null
  date?: string | null
  parameter_name?: string | null
  parameter_value?: number | null
}

const PARAMETER_LABELS: Record<string, string> = {
  dissolved_oxygen: "DO",
  temperature: "Temp",
  ph: "pH",
  ammonia: "Ammonia",
  turbidity: "Turbidity",
}

const PARAMETER_COLORS: Record<string, string> = {
  dissolved_oxygen: "#4472C4",
  temperature: "#ED7D31",
  ph: "#70AD47",
  ammonia: "#A5A5A5",
  turbidity: "#FFC000",
}

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)

const monthLabel = (key: string) => {
  const date = new Date(`${key}-01T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return key
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
}

export default function WaterQualityMonthlyAverages({
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
  const enabled = Boolean(farmId && dateFrom && dateTo && Array.isArray(scopedSystemIds) && scopedSystemIds.length > 0)
  const query = useWaterQualityMeasurements({
    farmId,
    dateFrom: dateFrom ?? undefined,
    dateTo: dateTo ?? undefined,
    limit: 10000,
    enabled,
  })

  const monthlyRows = useMemo(() => {
    const rows = query.data?.status === "success" ? (query.data.data as MeasurementRow[]) : []
    const scope = new Set(scopedSystemIds ?? [])
    const buckets = new Map<string, Map<string, { total: number; count: number }>>()

    rows.forEach((row) => {
      if (!row.date || !row.parameter_name || !isFiniteNumber(row.parameter_value)) return
      if (typeof row.system_id !== "number" || !scope.has(row.system_id)) return
      const month = row.date.slice(0, 7)
      const byParam = buckets.get(month) ?? new Map<string, { total: number; count: number }>()
      const current = byParam.get(row.parameter_name) ?? { total: 0, count: 0 }
      current.total += row.parameter_value
      current.count += 1
      byParam.set(row.parameter_name, current)
      buckets.set(month, byParam)
    })

    return Array.from(buckets.entries())
      .map(([month, byParam]) => ({
        month,
        values: Object.fromEntries(
          Array.from(byParam.entries()).map(([parameter, value]) => [parameter, value.total / value.count]),
        ) as Record<string, number>,
      }))
      .sort((left, right) => left.month.localeCompare(right.month))
  }, [query.data, scopedSystemIds])

  const parameters = useMemo(() => {
    const set = new Set<string>()
    monthlyRows.forEach((row) => Object.keys(row.values).forEach((parameter) => set.add(parameter)))
    return ["dissolved_oxygen", "temperature", "ph", "ammonia", "turbidity"].filter((parameter) => set.has(parameter))
  }, [monthlyRows])

  const bounds = useMemo(
    () =>
      buildMetricAxisBounds(
        monthlyRows.flatMap((row) => parameters.map((parameter) => row.values[parameter]).filter(isFiniteNumber)),
        { minFloor: 0 },
      ),
    [monthlyRows, parameters],
  )
  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: monthlyRows.map((row) => monthLabel(row.month)),
      datasets: parameters.map((parameter) => ({
        label: PARAMETER_LABELS[parameter] ?? parameter.replaceAll("_", " "),
        data: monthlyRows.map((row) => row.values[parameter] ?? null),
        borderColor: PARAMETER_COLORS[parameter] ?? "#4472C4",
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 4,
        spanGaps: true,
        tension: 0.2,
      })),
    }),
    [monthlyRows, parameters],
  )
  const options = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions<"line">({
        palette,
        min: bounds.min,
        max: bounds.max,
        lockYBounds: true,
        yTitle: "Monthly average",
        yTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 1 }),
        tooltip: {
          callbacks: {
            label: (context: any) =>
              `${String(context.dataset.label ?? "")}: ${formatNumberValue(Number(context.parsed.y), { decimals: 2 })}`,
          },
        },
      }),
    [bounds.max, bounds.min, palette],
  )

  if (query.isError || query.data?.status === "error") {
    return (
      <DataErrorState
        title="Unable to load water-quality averages"
        description={getErrorMessage(query.error) ?? "Please retry or check your connection."}
        onRetry={() => query.refetch()}
      />
    )
  }

  return (
    <Card>
      <CardContent sx={{ "&&": { pt: 2 }, px: 3, pb: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[1rem] font-semibold text-foreground">Water Quality Monthly Averages</span>
          <DataFetchingBadge isFetching={query.isFetching} isLoading={query.isLoading} />
        </div>
        {!enabled ? (
          <EmptyState title="No active production scope" description="Select a farm with active production systems." />
        ) : query.isLoading ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Loading water quality...</div>
        ) : monthlyRows.length ? (
          <div className="border border-border bg-background px-2 py-3">
            <LazyRender className="h-[300px]" fallback={<div className="h-full w-full" />}>
              <Chart type="line" data={data} options={options} />
            </LazyRender>
          </div>
        ) : (
          <EmptyState title="No water-quality measurements" description="No operational measurements match this period." />
        )}
      </CardContent>
    </Card>
  )
}
