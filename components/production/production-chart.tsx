"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { PRODUCTION_METRICS, type ProductionMetric } from "@/components/production/metrics"

export type ProductionChartRow = {
  date: string
  label: string
  value: number | null
}

const formatAxisDate = (value: string | number) => String(value)

const formatTooltipDate = (value: string | number) => {
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(parsed)
}

const formatValue = (value: number | null | undefined, decimals: number, unit?: string) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--"
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: decimals })
  return unit ? `${formatted} ${unit}` : formatted
}

export default function ProductionChart({
  metric,
  rows,
  isLoading,
  isFetching,
  updatedAt,
  error,
  onRetry,
}: {
  metric: ProductionMetric
  rows: ProductionChartRow[]
  isLoading: boolean
  isFetching: boolean
  updatedAt?: number | null
  error?: string | null
  onRetry?: () => void
}) {
  const meta = PRODUCTION_METRICS[metric]

  if (error) {
    return (
      <DataErrorState
        title="Unable to load production chart"
        description={error}
        onRetry={onRetry}
      />
    )
  }

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle>{meta.label}</CardTitle>
          <DataFetchingBadge isFetching={isFetching} isLoading={isLoading} />
        </div>
        <DataUpdatedAt updatedAt={updatedAt} />
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        ) : rows.length ? (
          <LazyRender className="h-[280px]" fallback={<div className="h-full w-full" />}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="productionMetricFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.35} />
                <XAxis dataKey="label" tickFormatter={formatAxisDate} minTickGap={24} />
                <YAxis
                  width={64}
                  tickFormatter={(value) => formatValue(Number(value), meta.decimals)}
                />
                <Tooltip
                  formatter={(value) => [formatValue(Number(value), meta.decimals, meta.unit), meta.label]}
                  labelFormatter={(label, payload) =>
                    formatTooltipDate(String(payload?.[0]?.payload?.date ?? label))
                  }
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2.6}
                  fill="url(#productionMetricFill)"
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </LazyRender>
        ) : (
          <EmptyState
            title="No production data"
            description="No data available for the selected filters."
          />
        )}
      </CardContent>
    </Card>
  )
}
