"use client"

import { useMemo } from "react"
import type React from "react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Activity, Fish, Package, Skull } from "lucide-react"
import { format } from "date-fns"
import type { Tables } from "@/lib/types/database"
import type { TimePeriod } from "@/components/shared/time-period-selector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useProductionTrend } from "@/lib/hooks/use-dashboard"

type SummaryRow = Tables<"api_production_summary">

type Totals = {
  totalBiomass: number
  totalFeed: number
  totalFish: number
  totalMortality: number
  avgEfcr: number
}

const formatAxisDate = (value: string | number) => {
  const text = String(value)
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return text
  return format(parsed, "MMM d")
}

const formatValue = (value?: number, decimals = 0, unit?: string) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--"
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: decimals })
  return unit ? `${formatted} ${unit}` : formatted
}

function StatCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string
  value: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className={`border-l-4 ${accent} bg-card border border-border rounded-sm p-4 shadow-sm`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{title}</p>
          <p className="text-xl font-semibold text-foreground mt-1">{value}</p>
        </div>
        <div className="text-3xl text-muted-foreground/40">{icon}</div>
      </div>
    </div>
  )
}

export default function AnalysisOverview({
  stage,
  system,
  timePeriod,
  periodParam,
}: {
  stage: SummaryRow["growth_stage"]
  system?: string
  timePeriod: TimePeriod
  periodParam?: string | null
}) {
  const { farmId } = useActiveFarm()
  const summaryQuery = useProductionTrend({
    farmId,
    stage: stage ?? undefined,
    system,
    timePeriod: periodParam ?? timePeriod,
  })

  const chartData = useMemo(() => summaryQuery.data ?? [], [summaryQuery.data])

  const latestTotals = useMemo<Totals | null>(() => {
    if (!chartData.length) return null
    const latest = chartData[chartData.length - 1]
    return {
      totalBiomass: latest.total_biomass ?? 0,
      totalFeed: latest.total_feed_amount_period ?? 0,
      totalFish: latest.number_of_fish_inventory ?? 0,
      totalMortality: latest.daily_mortality_count ?? 0,
      avgEfcr: latest.efcr_period ?? 0,
    }
  }, [chartData])

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="xl:col-span-2">
        <CardHeader className="border-b border-border">
          <CardTitle>Production Trend</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {summaryQuery.isLoading ? (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground">Loading chart...</div>
          ) : chartData.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => formatAxisDate(value)} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip labelFormatter={formatAxisDate} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="total_biomass"
                  stroke="var(--color-chart-1)"
                  fill="var(--color-chart-1)"
                  fillOpacity={0.18}
                  name="Biomass"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="total_feed_amount_period"
                  stroke="var(--color-chart-4)"
                  strokeWidth={2}
                  dot={false}
                  name="Feed Used"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="efcr_period"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  dot={false}
                  name="eFCR"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="number_of_fish_inventory"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Population"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground">No data available.</div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <StatCard
          title="Total Fish"
          value={formatValue(latestTotals?.totalFish)}
          icon={<Fish />}
          accent="border-blue-500"
        />
        <StatCard
          title="Total Biomass"
          value={formatValue(latestTotals?.totalBiomass, 1, "kg")}
          icon={<Activity />}
          accent="border-chart-1"
        />
        <StatCard
          title="Feed Used"
          value={formatValue(latestTotals?.totalFeed, 1, "kg")}
          icon={<Package />}
          accent="border-chart-4"
        />
        <StatCard
          title="Mortality"
          value={formatValue(latestTotals?.totalMortality)}
          icon={<Skull />}
          accent="border-destructive"
        />
      </div>
    </div>
  )
}
