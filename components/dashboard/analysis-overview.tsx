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

  const chartData = useMemo(() => {
    const rows = summaryQuery.data ?? []
    const byDate = new Map<
      string,
      {
        totalBiomass: number
        totalFeed: number
        totalFish: number
        totalMortality: number
        weightedEfcr: number
        efcrWeight: number
        efcrFallback: number
        efcrCount: number
      }
    >()

    rows.forEach((row) => {
      if (!row.date) return
      const current = byDate.get(row.date) ?? {
        totalBiomass: 0,
        totalFeed: 0,
        totalFish: 0,
        totalMortality: 0,
        weightedEfcr: 0,
        efcrWeight: 0,
        efcrFallback: 0,
        efcrCount: 0,
      }
      current.totalBiomass += row.total_biomass ?? 0
      current.totalFeed += row.total_feed_amount_period ?? 0
      current.totalFish += row.number_of_fish_inventory ?? 0
      current.totalMortality += row.daily_mortality_count ?? 0

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
        total_biomass: current.totalBiomass,
        total_feed_amount_period: current.totalFeed,
        number_of_fish_inventory: current.totalFish,
        daily_mortality_count: current.totalMortality,
        efcr_period:
          current.efcrWeight > 0
            ? current.weightedEfcr / current.efcrWeight
            : current.efcrCount > 0
              ? current.efcrFallback / current.efcrCount
              : null,
      }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [summaryQuery.data])

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
                <Tooltip
                  labelFormatter={formatAxisDate}
                  formatter={(value, name) => {
                    const key = String(name).toLowerCase()
                    if (key.includes("efcr")) return [formatValue(Number(value), 2), String(name)]
                    if (key.includes("biomass") || key.includes("feed")) return [formatValue(Number(value), 1, "kg"), String(name)]
                    return [formatValue(Number(value), 0), String(name)]
                  }}
                />
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
                  stroke="var(--color-chart-3)"
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
          accent="border-chart-3"
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
