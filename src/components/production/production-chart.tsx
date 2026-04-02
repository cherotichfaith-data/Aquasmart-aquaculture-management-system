"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { PRODUCTION_METRICS, type ProductionMetric } from "@/components/production/metrics"
import { formatChartDate, formatNumberValue } from "@/lib/analytics-format"
import { chartGridProps, chartTooltipStyle, chartXAxisProps, chartYAxisProps } from "@/components/charts/recharts-theme"

export type ProductionChartRow = {
  date: string
  label: string
  value: number | null
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
      <CardHeader className="pb-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{meta.label}</CardTitle>
          <DataFetchingBadge isFetching={isFetching} isLoading={isLoading} />
        </div>
        <DataUpdatedAt updatedAt={updatedAt} />
      </CardHeader>
      <CardContent className="pt-2">
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
                <CartesianGrid {...chartGridProps} />
                <XAxis {...chartXAxisProps} dataKey="label" tickFormatter={(value) => String(value)} />
                <YAxis
                  {...chartYAxisProps}
                  width={64}
                  tickFormatter={(value) => formatNumberValue(Number(value), { decimals: meta.decimals })}
                />
                <Tooltip
                  formatter={(value) => [
                    meta.unit
                      ? `${formatNumberValue(Number(value), { decimals: meta.decimals })} ${meta.unit}`
                      : formatNumberValue(Number(value), { decimals: meta.decimals }),
                    meta.label,
                  ]}
                  labelFormatter={(label, payload) =>
                    formatChartDate(String(payload?.[0]?.payload?.date ?? label))
                  }
                  contentStyle={chartTooltipStyle}
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
            description="No trustworthy production rows were available for the selected filters. Snapshot dates are not reused as cycle dates."
          />
        )}
      </CardContent>
    </Card>
  )
}
