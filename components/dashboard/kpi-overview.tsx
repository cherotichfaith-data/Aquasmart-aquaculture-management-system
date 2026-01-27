"use client"

import { useEffect, useState } from "react"
import KPICard from "./kpi-card"
import type { Enums } from "@/lib/types/database"
import {
  fetchDashboardConsolidatedSnapshot,
  fetchDashboardSnapshot,
  fetchTimePeriodBounds,
} from "@/lib/supabase-queries"

interface KPIOverviewProps {
  stage: "all" | Enums<"system_growth_stage">
  timePeriod?: Enums<"time_period">
  batch?: string
  system?: string
}

type Metric = {
  key: string
  label: string
  value: number | null
  unit?: string
  decimals?: number
  trend: number | null
  invertTrend: boolean
}

export default function KPIOverview({ stage, timePeriod = "week", batch = "all", system = "all" }: KPIOverviewProps) {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)
  const [dateBounds, setDateBounds] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  })

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true)
      try {
        const bounds = await fetchTimePeriodBounds(timePeriod)
        setDateBounds({ start: bounds.start, end: bounds.end })

        if (system === "all") {
          const snapshot = await fetchDashboardConsolidatedSnapshot({ time_period: timePeriod })
          if (!snapshot) {
            setMetrics([])
            setLoading(false)
            return
          }

          const nextMetrics: Metric[] = [
            {
              key: "efcr",
              label: "eFCR",
              value: snapshot.efcr_period_consolidated ?? null,
              decimals: 2,
              trend: snapshot.efcr_period_consolidated_delta ?? null,
              invertTrend: true,
            },
            {
              key: "mortality",
              label: "Daily Mortality Rate",
              value: snapshot.mortality_rate ?? null,
              unit: "%",
              decimals: 2,
              trend: snapshot.mortality_rate_delta ?? null,
              invertTrend: true,
            },
            {
              key: "biomass",
              label: "Avg Biomass",
              value: snapshot.average_biomass ?? null,
              unit: "kg",
              decimals: 1,
              trend: snapshot.average_biomass_delta ?? null,
              invertTrend: false,
            },
            {
              key: "feeding",
              label: "Feeding Rate",
              value: snapshot.feeding_rate ?? null,
              unit: "%",
              decimals: 2,
              trend: null,
              invertTrend: false,
            },
          ]

          setMetrics(nextMetrics)
          setLoading(false)
          return
        }

        const systemId = Number(system)
        if (!Number.isFinite(systemId)) {
          setMetrics([])
          setLoading(false)
          return
        }

        const snapshot = await fetchDashboardSnapshot({
          system_id: systemId,
          time_period: timePeriod,
          growth_stage: stage === "all" ? undefined : stage,
        })

        if (!snapshot) {
          setMetrics([])
          setLoading(false)
          return
        }

        const nextMetrics: Metric[] = [
          {
            key: "efcr",
            label: "eFCR",
            value: snapshot.efcr ?? null,
            decimals: 2,
            trend: null,
            invertTrend: true,
          },
          {
            key: "mortality",
            label: "Daily Mortality Rate",
            value: snapshot.mortality_rate ?? null,
            unit: "%",
            decimals: 2,
            trend: null,
            invertTrend: true,
          },
          {
            key: "biomass",
            label: "Avg Biomass",
            value: snapshot.average_biomass ?? null,
            unit: "kg",
            decimals: 1,
            trend: null,
            invertTrend: false,
          },
          {
            key: "feeding",
            label: "Feeding Rate",
            value: snapshot.feeding_rate ?? null,
            unit: "%",
            decimals: 2,
            trend: null,
            invertTrend: false,
          },
        ]

        setMetrics(nextMetrics)
      } catch (err) {
        console.error("[KPI] Error loading KPI metrics:", err)
        setMetrics([])
      }
      setLoading(false)
    }
    loadMetrics()
  }, [stage, timePeriod, batch, system])

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

  if (!metrics.length) {
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
          return (
            <KPICard
              key={metric.key}
              title={metric.label}
              average={metric.value}
              trend={metric.trend}
              decimals={metric.decimals}
              formatUnit={metric.unit}
              invertTrend={metric.invertTrend}
              href={`/production?metric=${metric.key}&period=${timePeriod}${dateBounds.start && dateBounds.end ? `&startDate=${dateBounds.start}&endDate=${dateBounds.end}` : ""}${system !== "all" ? `&system=${system}` : ""}`}
            />
          )
        })}
      </div>
    </div>
  )
}
