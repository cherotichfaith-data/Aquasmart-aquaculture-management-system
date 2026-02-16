"use client"

import { useMemo } from "react"
import KPICard from "./kpi-card"
import type { Enums } from "@/lib/types/database"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useKpiOverview, type KPIOverviewMetric } from "@/lib/hooks/use-dashboard"

interface KPIOverviewProps {
  stage: "all" | Enums<"system_growth_stage">
  timePeriod?: Enums<"time_period">
  batch?: string
  system?: string
  periodParam?: string | null
}

export default function KPIOverview({
  stage,
  timePeriod = "2 weeks",
  batch = "all",
  system = "all",
  periodParam,
}: KPIOverviewProps) {
  const { farmId } = useActiveFarm()
  const metricsQuery = useKpiOverview({
    farmId,
    stage,
    timePeriod,
    batch,
    system,
    periodParam,
  })

  const metrics = metricsQuery.data?.metrics ?? []
  const dateBounds = metricsQuery.data?.dateBounds ?? { start: null, end: null }

  const withTone = (metrics: KPIOverviewMetric[]): KPIOverviewMetric[] => {
    return metrics.map((metric): KPIOverviewMetric => {
      if (metric.tone || metric.badge) {
        return { ...metric, tone: metric.tone ?? "neutral", badge: metric.badge }
      }
      if (metric.value === null || metric.value === undefined) {
        return { ...metric, tone: "neutral", badge: "No data" }
      }

      if (metric.trend === null || metric.trend === undefined) {
        return { ...metric, tone: "neutral", badge: "Monitoring" }
      }

      if (metric.trend === 0) {
        return { ...metric, tone: "neutral", badge: "Stable" }
      }

      const positive =
        metric.invertTrend ? metric.trend < 0 : metric.trend > 0
      return {
        ...metric,
        tone: positive ? "good" : "warn",
        badge: positive ? "Good" : "Watch",
      }
    })
  }

  if (metricsQuery.isLoading) {
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

  const tonedMetrics = withTone(metrics)

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tonedMetrics.map((metric) => {
          return (
            <KPICard
              key={metric.key}
              title={metric.label}
              average={metric.value}
              trend={metric.trend}
              decimals={metric.decimals}
              formatUnit={metric.unit}
              invertTrend={metric.invertTrend}
              tone={metric.tone}
              badge={metric.badge}
              href={`/production?metric=${metric.key}&period=${timePeriod}${dateBounds.start && dateBounds.end ? `&startDate=${dateBounds.start}&endDate=${dateBounds.end}` : ""}${system !== "all" ? `&system=${system}` : ""}`}
            />
          )
        })}
      </div>
    </div>
  )
}
