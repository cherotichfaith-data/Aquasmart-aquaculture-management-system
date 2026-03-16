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
import { formatTimestamp, type WqParameter } from "./water-quality-utils"
import type { ParameterTrendRow } from "./water-quality-selectors"

const formatDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
}

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
  dailyDoVariation,
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
  dailyDoVariation: Array<{ date: string; variation: number; min: number; max: number }>
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
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-medium mb-1">Some water-quality data sources failed to load:</p>
          <ul className="list-disc pl-5 space-y-1">
            {dataIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {isLoading ? (
        <div className="h-[320px] flex items-center justify-center text-muted-foreground">Loading parameter analysis...</div>
      ) : parameterTrendData.length === 0 ? (
        <div className="h-[320px] flex items-center justify-center text-muted-foreground">No parameter measurements in this range.</div>
      ) : (
        <div className="space-y-4">
          <div className="h-[320px] rounded-md border border-border/80 bg-muted/20 p-2">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={parameterTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDateLabel} />
                  <YAxis yAxisId="param" />
                  <YAxis yAxisId="overlay" orientation="right" />
                  <Tooltip
                    labelFormatter={(label) => formatTimestamp(`${label}T00:00:00`)}
                    formatter={(value, name) => {
                      const numeric = Number(value)
                      const field = String(name).toLowerCase()
                      if (field.includes("feeding")) {
                        return [
                          `${numeric.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`,
                          String(name),
                        ]
                      }
                      if (field.includes("mortality")) {
                        return [numeric.toLocaleString(undefined, { maximumFractionDigits: 0 }), String(name)]
                      }
                      if (selectedParameter === "pH") {
                        return [numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), String(name)]
                      }
                      return [
                        `${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${selectedParameterUnit ? ` ${selectedParameterUnit}` : ""}`,
                        String(name),
                      ]
                    }}
                  />
                  <Legend />
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

          <div className="rounded-md border border-border/80 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-semibold">Daily Dissolved Oxygen Variation</p>
                <p className="text-xs text-muted-foreground">Max minus min DO per day across the selected scope.</p>
              </div>
              <span className="text-xs text-muted-foreground">Units: mg/L</span>
            </div>
            {dailyDoVariation.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No dissolved oxygen measurements in this range.
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyDoVariation}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDateLabel} />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(label) => formatTimestamp(`${label}T00:00:00`)}
                      formatter={(value) => [
                        `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mg/L`,
                        "Daily DO variation",
                      ]}
                    />
                    <Line type="monotone" dataKey="variation" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-md border border-border/80 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-semibold">Daily Average Temperature</p>
                <p className="text-xs text-muted-foreground">Mean temperature per day across the selected scope.</p>
              </div>
              <span className="text-xs text-muted-foreground">Units: deg C</span>
            </div>
            {dailyTempAverage.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No temperature measurements in this range.
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTempAverage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDateLabel} />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(label) => formatTimestamp(`${label}T00:00:00`)}
                      formatter={(value) => [
                        `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} deg C`,
                        "Average temperature",
                      ]}
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
