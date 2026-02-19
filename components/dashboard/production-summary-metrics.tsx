"use client"

import { useMemo } from "react"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useProductionSummaryMetrics } from "@/lib/hooks/use-dashboard"
import type { Enums } from "@/lib/types/database"

const formatNumber = (value: number) => Intl.NumberFormat().format(Math.round(value))
const formatKg = (value: number) => `${Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)} kg`

const metricCardClass =
  "rounded-2xl border border-border bg-card p-4 shadow-sm"

export default function ProductionSummaryMetrics({
  stage,
  batch,
  system,
  timePeriod = "2 weeks",
  periodParam,
}: {
  stage: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: Enums<"time_period">
  periodParam?: string | null
}) {
  const { farmId } = useActiveFarm()
  const metricsQuery = useProductionSummaryMetrics({
    farmId,
    stage,
    batch,
    system,
    timePeriod,
    periodParam,
  })

  const metrics = useMemo(() => {
    const data = metricsQuery.data
    if (!data) {
      return [
        { label: "Total Input (Stocked Fish)", value: "--" },
        { label: "Total Mortalities", value: "--" },
        { label: "Net Adjustments (Transfers)", value: "--" },
        { label: "Total Harvested (Fish)", value: "--" },
        { label: "Total Harvested (kg)", value: "--" },
      ]
    }

    return [
      { label: "Total Input (Stocked Fish)", value: formatNumber(data.totalStockedFish) },
      { label: "Total Mortalities", value: formatNumber(data.totalMortalities) },
      { label: "Net Adjustments (Transfers)", value: formatNumber(data.netTransferAdjustments) },
      { label: "Total Harvested (Fish)", value: formatNumber(data.totalHarvestedFish) },
      { label: "Total Harvested (kg)", value: formatKg(data.totalHarvestedKg) },
    ]
  }, [metricsQuery.data])

  if (metricsQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={`${metricCardClass} h-[98px] animate-pulse bg-muted/30`} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className={metricCardClass}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
          </div>
        ))}
      </div>
      {metricsQuery.isError ? (
        <p className="text-xs text-muted-foreground">Unable to load summary metrics for the selected filters.</p>
      ) : null}
    </div>
  )
}

