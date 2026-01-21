"use client"

import { useEffect, useMemo, useState } from "react"
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
import { fetchProductionSummary } from "@/lib/supabase-queries"
import type { Tables } from "@/lib/types/database"
import type { TimePeriod } from "@/components/shared/time-period-selector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type SummaryRow = Tables<"production_summary">

type ChartPoint = {
  date: string
  total_biomass: number
  total_feed: number
  avg_efcr: number
  total_fish: number
  total_mortality: number
}

type Totals = {
  totalBiomass: number
  totalFeed: number
  totalFish: number
  totalMortality: number
  avgEfcr: number
}

const daysByPeriod: Record<TimePeriod, number> = {
  day: 1,
  week: 7,
  "2 weeks": 14,
  month: 30,
  quarter: 90,
  "6 months": 180,
  year: 365,
}

const formatAxisDate = (value: string | number) => {
  const text = String(value)
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return value
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
}: {
  stage: SummaryRow["growth_stage"]
  system?: string
  timePeriod: TimePeriod
}) {
  const [rows, setRows] = useState<SummaryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadSummary = async () => {
      setLoading(true)
      const systemId = system && system !== "all" ? Number(system) : undefined
      const result = await fetchProductionSummary({
        growth_stage: stage ?? undefined,
        system_id: Number.isFinite(systemId) ? systemId : undefined,
        limit: 500,
      })
      if (!isMounted) return
      setRows(result.status === "success" ? result.data : [])
      setLoading(false)
    }
    loadSummary()
    return () => {
      isMounted = false
    }
  }, [stage, system, timePeriod])

  const chartData = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysByPeriod[timePeriod])

    const map = new Map<
      string,
      {
        total_biomass: number
        total_feed: number
        total_fish: number
        total_mortality: number
        efcr_sum: number
        efcr_count: number
      }
    >()

    rows.forEach((row) => {
      if (!row.date) return
      const parsed = new Date(row.date)
      if (!Number.isNaN(parsed.getTime()) && parsed < cutoff) return

      const key = row.date
      const current =
        map.get(key) ?? {
          total_biomass: 0,
          total_feed: 0,
          total_fish: 0,
          total_mortality: 0,
          efcr_sum: 0,
          efcr_count: 0,
        }

      current.total_biomass += row.total_biomass ?? 0
      current.total_feed += row.total_feed_amount_period ?? 0
      current.total_fish += row.number_of_fish_inventory ?? 0
      current.total_mortality += row.daily_mortality_count ?? 0
      if (row.efcr_period !== null && row.efcr_period !== undefined) {
        current.efcr_sum += row.efcr_period
        current.efcr_count += 1
      }

      map.set(key, current)
    })

    return Array.from(map.entries())
      .map(([date, values]) => ({
        date,
        total_biomass: values.total_biomass,
        total_feed: values.total_feed,
        total_fish: values.total_fish,
        total_mortality: values.total_mortality,
        avg_efcr: values.efcr_count ? values.efcr_sum / values.efcr_count : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [rows, timePeriod])

  const latestTotals = useMemo<Totals | null>(() => {
    if (!chartData.length) return null
    const latest = chartData[chartData.length - 1]
    return {
      totalBiomass: latest.total_biomass,
      totalFeed: latest.total_feed,
      totalFish: latest.total_fish,
      totalMortality: latest.total_mortality,
      avgEfcr: latest.avg_efcr,
    }
  }, [chartData])

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="xl:col-span-2">
        <CardHeader className="border-b border-border">
          <CardTitle>Production Trend</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground">Loading chart...</div>
          ) : chartData.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => formatAxisDate(value)} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value: number | string, name) => {
                    const numeric = typeof value === "number" ? value : Number(value)
                    const key = String(name)
                    if (key === "avg_efcr" && Number.isFinite(numeric)) return [numeric.toFixed(2), "eFCR"]
                    if (key === "total_biomass" && Number.isFinite(numeric)) return [`${numeric.toFixed(1)} kg`, "Biomass"]
                    if (key === "total_feed" && Number.isFinite(numeric)) return [`${numeric.toFixed(1)} kg`, "Feed Used"]
                    return [value, name]
                  }}
                  labelFormatter={formatAxisDate}
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
                  dataKey="total_feed"
                  stroke="var(--color-chart-4)"
                  strokeWidth={2}
                  dot={false}
                  name="Feed Used"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avg_efcr"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  dot={false}
                  name="eFCR"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="total_fish"
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
