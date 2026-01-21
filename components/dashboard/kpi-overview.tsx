"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import KPICard from "./kpi-card"
import type { Enums } from "@/lib/types/database"
import { fetchDashboardSnapshot } from "@/lib/supabase-queries"

interface KPIOverviewProps {
  stage: "all" | Enums<"system_growth_stage">
  timePeriod?: Enums<"time_period">
  batch?: string
  system?: string
}

export default function KPIOverview({ stage, timePeriod = "week", batch = "all", system = "all" }: KPIOverviewProps) {
  const router = useRouter()
  const [snapshot, setSnapshot] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const toMetricsPeriod = (period: Enums<"time_period">) => {
    const map: Record<Enums<"time_period">, "7d" | "30d" | "90d" | "180d" | "365d"> = {
      day: "7d",
      week: "7d",
      "2 weeks": "30d",
      month: "30d",
      quarter: "90d",
      "6 months": "180d",
      year: "365d",
    }
    return map[period] ?? "30d"
  }

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true)
      try {
        const systemId = system !== "all" ? Number(system) : undefined
        const data = await fetchDashboardSnapshot({
          system_id: Number.isFinite(systemId) ? systemId : undefined,
          growth_stage: stage === "all" ? undefined : stage,
          time_period: timePeriod,
        })
        setSnapshot(data)
      } catch (err) {
        console.error("[v0] Error loading KPI metrics:", err)
        setSnapshot(null)
      }
      setLoading(false)
    }
    loadMetrics()
  }, [stage, timePeriod, batch, system])

  const handleKPIClick = (metric: string) => {
    const metricMap: Record<string, string> = {
      efcr: "efcr_periodic",
      mortality: "mortality",
      biomass: "biomass_increase",
      "water-quality": "water_quality",
    }
    const metricKey = metricMap[metric] ?? "efcr_periodic"
    const params = new URLSearchParams()
    const period = toMetricsPeriod(timePeriod)

    params.set("period", period)
    if (system !== "all") {
      params.set("system", system)
    }

    const query = params.toString()
    const targetPath = `/production`
    router.push(query ? `${targetPath}?${query}` : targetPath)
  }

  const metrics = useMemo(() => {
    if (!snapshot) return []
    const isConsolidated = system === "all"
    const efcrValue = isConsolidated ? snapshot.efcr_period_consolidated : snapshot.efcr
    const mortalityRate = snapshot.mortality_rate
    const mortalityValue =
      typeof mortalityRate === "number" && Number.isFinite(mortalityRate) ? mortalityRate * 100 : mortalityRate
    const biomassValue = snapshot.average_biomass
    const waterQualityValue = snapshot.water_quality_rating_numeric_average

    return [
      {
        key: "efcr",
        label: "eFCR",
        value: efcrValue,
        decimals: 2,
        previous: null,
        inverse: true,
      },
      {
        key: "mortality",
        label: "Mortality",
        value: mortalityValue,
        unit: "%",
        decimals: 1,
        previous: null,
        inverse: true,
      },
      {
        key: "biomass",
        label: "Biomass",
        value: biomassValue,
        unit: "kg",
        decimals: 1,
        inverse: false,
      },
      {
        key: "water-quality",
        label: "Water Quality",
        value: waterQualityValue,
        decimals: 1,
        inverse: false,
      },
    ]
  }, [snapshot, system])

  const formatValue = (value: number | null, unit?: string, decimals?: number) => {
    if (value === null || value === undefined) return "--"
    if (typeof decimals === "number") {
      return `${value.toFixed(decimals)}${unit ? unit : ""}`
    }
    return `${value}${unit ? unit : ""}`
  }

  const formatChange = (
    current: number | null,
    previous: number | null,
    inverse: boolean,
  ): { text: string | null; trend: "up" | "down" | "flat"; status: "positive" | "negative" | "neutral" } => {
    if (current === null || current === undefined || previous === null || previous === undefined || previous === 0) {
      return { text: null, trend: "flat", status: "neutral" }
    }

    const diff = ((current - previous) / previous) * 100
    const trend = diff > 0 ? "up" : diff < 0 ? "down" : "flat"
    const text = `${diff > 0 ? "+" : ""}${diff.toFixed(1)}% from last period`
    const positive = diff > 0
    const negative = diff < 0

    if (inverse) {
      return { text, trend, status: positive ? "negative" : negative ? "positive" : "neutral" }
    }

    return { text, trend, status: positive ? "positive" : negative ? "negative" : "neutral" }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="bg-muted/30 rounded-2xl p-4 h-28 animate-pulse"></div>
          ))}
      </div>
    )
  }

  if (!snapshot) {
    const placeholders = ["eFCR", "Mortality", "Biomass", "Water Quality"]
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">No KPI data available for the selected period.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {placeholders.map((label) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold text-foreground mt-2">--</p>
              <p className="text-xs mt-2 text-muted-foreground">No data</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const formattedValue = formatValue(metric.value, metric.unit, metric.decimals)
          const { text, trend, status } = formatChange(metric.value, metric.previous ?? null, metric.inverse ?? false)
          return (
            <KPICard
              key={metric.key}
              title={metric.label}
              value={formattedValue}
              change={text ?? undefined}
              status={status}
              trend={trend}
              onClick={() => handleKPIClick(metric.key)}
            />
          )
        })}
      </div>
    </div>
  )
}
