"use client"

import type { ReactNode } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Bar, Doughnut } from "@/components/charts/chartjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/app-ui/card"
import { FeedEfcrSection, FeedRateSection } from "../_lib/feed-sections"
import type { EfcrTrendPoint, FeedRatePoint } from "../_lib/feed-analytics"

const chartCardClass = "rounded-2xl border border-border/80 bg-card"

type FeedInputRow = {
  label: string
  feedKg: number
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card className={chartCardClass}>
      <CardHeader className="space-y-1 border-b border-border/70 pb-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  )
}

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">{label}</div>
}

export function FeedDashboardError({
  errorMessage,
  onRetry,
}: {
  errorMessage: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      <div className="font-semibold">Unable to load feed analytics</div>
      <div className="mt-1">{errorMessage}</div>
      <button type="button" onClick={onRetry} className="mt-3 rounded-md border border-destructive/30 px-3 py-1.5">
        Retry
      </button>
    </div>
  )
}

export function FeedCoreSection({
  trendGranularityLabel,
  feedInputRows,
  feedInputData,
  feedInputOptions,
  responseRows,
  responseData,
  responseOptions,
  feedTypeRows,
  feedTypeData,
  feedTypeOptions,
  loading,
  feedRatePoints,
  efcrTrendPoints,
  systemNameById,
}: {
  trendGranularityLabel: string
  feedInputRows: FeedInputRow[]
  feedInputData: ChartData<"bar">
  feedInputOptions: ChartOptions<"bar">
  responseRows: Array<{ name: string; value: number }>
  responseData: ChartData<"doughnut">
  responseOptions: ChartOptions<"doughnut">
  feedTypeRows: Array<{ label: string; kg: number }>
  feedTypeData: ChartData<"bar">
  feedTypeOptions: ChartOptions<"bar">
  loading: boolean
  feedRatePoints: FeedRatePoint[]
  efcrTrendPoints: EfcrTrendPoint[]
  systemNameById: Map<number, string>
}) {
  return (
    <div className="space-y-6">
      <ChartCard title={`Feed input by ${trendGranularityLabel} (kg)`}>
        {feedInputRows.length === 0 ? (
          <EmptyChart label="No feed records in the selected scope." />
        ) : (
          <div className="chart-canvas-shell h-[280px]">
            <Bar data={feedInputData} options={feedInputOptions} />
          </div>
        )}
      </ChartCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <FeedRateSection loading={loading} points={feedRatePoints} systemNameById={systemNameById} />
        <FeedEfcrSection loading={loading} points={efcrTrendPoints} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Feed response distribution">
          {responseRows.every((row) => row.value === 0) ? (
            <EmptyChart label="No feeding responses recorded in the selected scope." />
          ) : (
            <div className="chart-canvas-shell h-[220px]">
              <Doughnut data={responseData} options={responseOptions} />
            </div>
          )}
        </ChartCard>

        <ChartCard title="Feed type usage">
          {feedTypeRows.length === 0 ? (
            <EmptyChart label="No feed type usage recorded in the selected scope." />
          ) : (
            <div className="chart-canvas-shell h-[220px]">
              <Bar data={feedTypeData} options={feedTypeOptions} />
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
