"use client"

import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { formatTimestamp, type WqParameter } from "./_lib/water-quality-utils"
import type { DiurnalDoPattern, ParameterTrendRow } from "./_lib/water-quality-selectors"
import {
  chartGridProps,
  chartLegendProps,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
  chartXAxisProps,
  chartYAxisProps,
} from "@/components/charts/recharts-theme"

const DIURNAL_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "#8B5CF6",
  "#14B8A6",
]

const formatDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
}

const formatTimeLabel = (value: string) => value

export function WaterQualityParameterTab({
  latestUpdatedAt,
  isFetching,
  isLoading,
  dataIssues,
  parameterTrendData,
  selectedParameter,
  selectedParameterUnit,
  lowDoThreshold,
  highAmmoniaThreshold,
  showFeedingOverlay,
  showMortalityOverlay,
  diurnalDoPattern,
  dailyTempAverage,
}: {
  latestUpdatedAt: number
  isFetching: boolean
  isLoading: boolean
  dataIssues: string[]
  parameterTrendData: ParameterTrendRow[]
  selectedParameter: WqParameter
  selectedParameterUnit: string
  lowDoThreshold: number
  highAmmoniaThreshold: number
  showFeedingOverlay: boolean
  showMortalityOverlay: boolean
  diurnalDoPattern: DiurnalDoPattern
  dailyTempAverage: Array<{ date: string; average: number | null }>
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Parameter Analysis</h2>
      </div>
      <div className="flex items-center justify-between text-xs">
        <DataUpdatedAt updatedAt={latestUpdatedAt} />
        <DataFetchingBadge isFetching={isFetching} isLoading={isLoading} />
      </div>
      {dataIssues.length ? (
        <div className="rounded-md bg-destructive/8 p-4 text-sm text-destructive shadow-[0_16px_34px_-28px_rgba(220,38,38,0.28)]">
          <p className="mb-1 font-medium">Some water-quality data sources failed to load:</p>
          <ul className="list-disc space-y-1 pl-5">
            {dataIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {isLoading ? (
        <div className="flex h-[320px] items-center justify-center text-muted-foreground">Loading parameter analysis...</div>
      ) : parameterTrendData.length === 0 ? (
        <div className="flex h-[320px] items-center justify-center text-muted-foreground">No parameter measurements in this range.</div>
      ) : (
        <div className="space-y-4">
          <div className="soft-panel-subtle h-[320px] p-2">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={parameterTrendData}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis {...chartXAxisProps} dataKey="date" tickFormatter={formatDateLabel} />
                  <YAxis {...chartYAxisProps} yAxisId="param" />
                  <YAxis {...chartYAxisProps} yAxisId="overlay" orientation="right" />
                  <Tooltip
                    labelFormatter={(label) => formatTimestamp(`${label}T00:00:00`)}
                    formatter={(value, name) => {
                      const numeric = Number(value)
                      const field = String(name).toLowerCase()
                      if (field.includes("feeding")) {
                        return [`${numeric.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`, String(name)]
                      }
                      if (field.includes("mortality")) {
                        return [numeric.toLocaleString(undefined, { maximumFractionDigits: 0 }), String(name)]
                      }
                      if (selectedParameter === "pH") {
                        return [numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), String(name)]
                      }
                      return [`${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedParameterUnit}`.trim(), String(name)]
                    }}
                    contentStyle={chartTooltipStyle}
                    labelStyle={chartTooltipLabelStyle}
                    itemStyle={chartTooltipItemStyle}
                  />
                  <Legend {...chartLegendProps} />
                  <Line yAxisId="param" type="monotone" dataKey="mean" name="Daily mean" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                  <Line yAxisId="param" type="monotone" dataKey="rolling" name="7-day mean" stroke="var(--color-chart-2)" strokeDasharray="4 4" dot={false} />
                  {selectedParameter === "dissolved_oxygen" ? (
                    <ReferenceLine yAxisId="param" y={lowDoThreshold} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label="Low DO threshold" />
                  ) : null}
                  {selectedParameter === "ammonia" ? (
                    <ReferenceLine yAxisId="param" y={highAmmoniaThreshold} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label="High ammonia threshold" />
                  ) : null}
                  {showFeedingOverlay ? (
                    <Line yAxisId="overlay" type="monotone" dataKey="feeding" name="Feeding amount" stroke="var(--color-chart-3)" dot={false} />
                  ) : null}
                  {showMortalityOverlay ? (
                    <Line yAxisId="overlay" type="monotone" dataKey="mortality" name="Mortality count" stroke="var(--color-chart-4)" dot={false} />
                  ) : null}
                </ComposedChart>
              </ResponsiveContainer>
            </LazyRender>
          </div>

          <div className="soft-panel-subtle p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Diurnal DO Pattern</p>
                <p className="text-xs text-muted-foreground">Time of day versus dissolved oxygen, with one line per recent date.</p>
              </div>
              <span className="text-xs text-muted-foreground">Units: mg/L</span>
            </div>
            {diurnalDoPattern.rows.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                No dissolved oxygen measurements with time-of-day stamps in the recent window.
              </div>
            ) : (
              <>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={diurnalDoPattern.rows}>
                      <CartesianGrid {...chartGridProps} />
                      <XAxis {...chartXAxisProps} dataKey="time" tickFormatter={formatTimeLabel} />
                      <YAxis {...chartYAxisProps} />
                      <Tooltip
                        formatter={(value, name) => [
                          `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mg/L`,
                          formatDateLabel(String(name)),
                        ]}
                        contentStyle={chartTooltipStyle}
                        labelStyle={chartTooltipLabelStyle}
                        itemStyle={chartTooltipItemStyle}
                      />
                      <Legend {...chartLegendProps} formatter={(value) => formatDateLabel(String(value))} />
                      {diurnalDoPattern.dateSeries.map((date, index) => (
                        <Line
                          key={date}
                          type="monotone"
                          dataKey={date}
                          name={date}
                          stroke={DIURNAL_COLORS[index % DIURNAL_COLORS.length]}
                          strokeWidth={2}
                          dot
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 rounded-md bg-amber-500/10 p-3 text-xs text-amber-700 shadow-[0_16px_34px_-28px_rgba(245,158,11,0.3)] dark:text-amber-300">
                  {diurnalDoPattern.insufficientSamples
                    ? `Recent records show roughly one dissolved oxygen reading per day${diurnalDoPattern.dominantTimeLabel ? `, typically around ${diurnalDoPattern.dominantTimeLabel}` : ""}. Single daily measurements are insufficient for diurnal analysis. Add a PM measurement between 4:00 and 5:00 PM to capture the daily DO peak and align with the 4 PM feed inventory schedule already in use.`
                    : `Recent DO timestamps span multiple times of day${diurnalDoPattern.dominantTimeLabel ? `, with the most common reading time around ${diurnalDoPattern.dominantTimeLabel}` : ""}. Continue collecting both morning and PM readings to compare dawn minimum versus afternoon peak.`}
                </div>
              </>
            )}
          </div>

          <div className="soft-panel-subtle p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Daily Average Temperature</p>
                <p className="text-xs text-muted-foreground">Mean temperature per day across the selected scope.</p>
              </div>
              <span className="text-xs text-muted-foreground">Units: deg C</span>
            </div>
            {dailyTempAverage.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No temperature measurements in this range.
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTempAverage}>
                    <CartesianGrid {...chartGridProps} />
                    <XAxis {...chartXAxisProps} dataKey="date" tickFormatter={formatDateLabel} />
                    <YAxis {...chartYAxisProps} />
                    <Tooltip
                      labelFormatter={(label) => formatTimestamp(`${label}T00:00:00`)}
                      formatter={(value) => [
                        `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} deg C`,
                        "Average temperature",
                      ]}
                      contentStyle={chartTooltipStyle}
                      labelStyle={chartTooltipLabelStyle}
                      itemStyle={chartTooltipItemStyle}
                    />
                    <Line type="monotone" dataKey="average" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
