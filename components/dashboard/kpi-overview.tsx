"use client"

import { useEffect, useMemo, useState } from "react"
import KPICard from "./kpi-card"
import type { Enums } from "@/lib/types/database"
import { fetchDashboardConsolidatedSnapshot, fetchDashboardSnapshot } from "@/lib/supabase-queries"

interface KPIOverviewProps {
  stage: "all" | Enums<"system_growth_stage">
  timePeriod?: Enums<"time_period">
  batch?: string
  system?: string
}

export default function KPIOverview({ stage, timePeriod = "week", batch = "all", system = "all" }: KPIOverviewProps) {
  const [snapshot, setSnapshot] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isFarmSnapshot, setIsFarmSnapshot] = useState(false)

  const percentChange = (current: number | null | undefined, delta: number | null | undefined) => {
    if (!Number.isFinite(current) || !Number.isFinite(delta)) return null
    const previous = current - delta
    if (!Number.isFinite(previous) || previous === 0) return null
    return (delta / previous) * 100
  }

  const scaleValue = (value: number | null | undefined, scale: number) => {
    if (!Number.isFinite(value)) return value
    const scaled = value * scale
    return Number.isFinite(scaled) ? scaled : value
  }

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true)
      try {
        const systemId = system !== "all" ? Number(system) : undefined
        
        // Fetch pre-calculated KPI data from materialized view
        if (system === "all") {
          const data = await fetchDashboardConsolidatedSnapshot({
            time_period: timePeriod,
          })
          setSnapshot(data)
          setIsFarmSnapshot(true)
        } else {
          const data = await fetchDashboardSnapshot({
            system_id: Number.isFinite(systemId) ? systemId : undefined,
            growth_stage: stage === "all" ? undefined : stage,
            time_period: timePeriod,
          })
          setSnapshot(data)
          setIsFarmSnapshot(false)
        }
      } catch (err) {
        console.error("[KPI] Error loading KPI metrics:", err)
        setSnapshot(null)
      }
      setLoading(false)
    }
    loadMetrics()
  }, [stage, timePeriod, batch, system])

  const metrics = useMemo(() => {
    if (!snapshot) return []
    
    if (isFarmSnapshot) {
      return [
        {
          key: "efcr",
          label: "eFCR",
          value: snapshot.efcr_period_consolidated,
          decimals: 2,
          trend: percentChange(snapshot.efcr_period_consolidated, snapshot.efcr_period_consolidated_delta),
          invertTrend: true,
        },
        {
          key: "mortality",
          label: "Daily Mortality Rate",
          value: scaleValue(snapshot.mortality_rate, 100),
          unit: "%",
          decimals: 2,
          trend: percentChange(snapshot.mortality_rate, snapshot.mortality_rate_delta),
          invertTrend: true,
        },
        {
          key: "biomass",
          label: "Avg Biomass",
          value: snapshot.average_biomass,
          unit: "kg",
          decimals: 1,
          trend: percentChange(snapshot.average_biomass, snapshot.average_biomass_delta),
          invertTrend: false,
        },
        {
          key: "feeding",
          label: "Feeding Rate",
          value: snapshot.feeding_rate,
          unit: "kg/t",
          decimals: 2,
          trend: null,
          invertTrend: false,
        },
      ]
    }

    return [
      {
        key: "efcr",
        label: "eFCR",
        value: snapshot.efcr,
        decimals: 2,
        trend: null,
        invertTrend: true,
      },
      {
        key: "mortality",
        label: "Daily Mortality Rate",
        value: scaleValue(snapshot.mortality_rate, 100),
        unit: "%",
        decimals: 2,
        trend: null,
        invertTrend: true,
      },
      {
        key: "biomass",
        label: "Avg Biomass",
        value: snapshot.average_biomass,
        unit: "kg",
        decimals: 1,
        trend: null,
        invertTrend: false,
      },
      {
        key: "feeding",
        label: "Feeding Rate",
        value: snapshot.feeding_rate,
        unit: "kg/t",
        decimals: 2,
        trend: null,
        invertTrend: false,
      },
    ]
  }, [isFarmSnapshot, percentChange, snapshot])

  const formatValue = (value: number | null, unit?: string, decimals?: number) => {
    if (value === null || value === undefined) return "--"
    if (typeof decimals === "number") {
      return `${value.toFixed(decimals)}${unit ? unit : ""}`
    }
    return `${value}${unit ? unit : ""}`
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
    const placeholders = ["eFCR", "Mortality", "Biomass", "Feeding"]
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
          return (
            <KPICard
              key={metric.key}
              title={metric.label}
              average={metric.value}
              trend={metric.trend}
              decimals={metric.decimals}
              formatUnit={metric.unit}
              invertTrend={metric.invertTrend}
              href={`/production?metric=${metric.key}&period=${timePeriod}${snapshot?.input_start_date && snapshot?.input_end_date ? `&startDate=${snapshot.input_start_date}&endDate=${snapshot.input_end_date}` : ""}${system !== "all" ? `&system=${system}` : ""}`}
            />
          )
        })}
      </div>
    </div>
  )
}
