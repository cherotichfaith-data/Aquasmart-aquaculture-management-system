"use client"

import Link from "next/link"
import { useMemo } from "react"
import Grid from "@mui/material/Grid"
import Box from "@mui/material/Box"
import type { Enums } from "@/lib/types/database"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { toTimePeriodUrlValue, type TimePeriod } from "@/lib/time-period"
import { formatNumberValue } from "@/lib/analytics-format"
import { toDashboardPath } from "@/lib/app-entry"
import type { ProductionSummaryMetricsRow } from "@/features/production/types"

const formatWholeNumber = (value: number) => formatNumberValue(Math.round(value))
const formatKg = (value: number) => `${formatNumberValue(value, { decimals: 1 })} kg`
const metricCardClass =
  "rounded-2xl border border-border bg-card p-4"

export default function ProductionSummaryMetrics({
  stage,
  batch,
  system,
  timePeriod = "month",
  summary,
  isLoading,
  isFetching,
  updatedAt,
  error,
  onRetry,
  linkCards = true,
}: {
  stage: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: TimePeriod
  summary: ProductionSummaryMetricsRow | null
  isLoading: boolean
  isFetching: boolean
  updatedAt?: number | null
  error?: string | null
  onRetry?: () => void
  linkCards?: boolean
}) {
  const productionHref = useMemo(() => {
    const params = new URLSearchParams()
    if (system && system !== "all") params.set("system", system)
    if (stage !== "all") params.set("stage", stage)
    if (batch && batch !== "all") params.set("batch", batch)
    params.set("period", toTimePeriodUrlValue(timePeriod))
    return `${toDashboardPath("/production")}?${params.toString()}`
  }, [batch, stage, system, timePeriod])

  const metrics = useMemo(() => {
    const totals = summary ?? {
      period_start_fish: 0,
      mortality_fish: 0,
      transfer_out_fish: 0,
      total_harvested_kg: 0,
      total_harvested_fish: 0,
    }

    return [
      { label: "Period Start Fish", value: `${formatWholeNumber(totals.period_start_fish)} fish` },
      { label: "Mortality In Window", value: `${formatWholeNumber(totals.mortality_fish)} fish` },
      {
        label: "Transfer Out",
        value: `${formatWholeNumber(totals.transfer_out_fish)} fish`,
      },
      {
        label: "Total Harvested",
        value: `${formatKg(totals.total_harvested_kg)} | ${formatWholeNumber(totals.total_harvested_fish)} fish`,
      },
    ]
  }, [summary])

  if (error) {
    return (
      <DataErrorState
        title="Unable to load production summary"
        description={error}
        onRetry={onRetry}
      />
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <DataUpdatedAt updatedAt={updatedAt} />
        <DataFetchingBadge isFetching={isFetching} isLoading={isLoading} />
      </Box>
      <Grid container spacing={2}>
        {metrics.map((metric) => {
          const card = (
            <div className={`${metricCardClass} ${linkCards ? "transition-shadow hover:shadow-md" : ""}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {isLoading ? "Loading..." : metric.value}
              </p>
            </div>
          )

          return (
            <Grid key={metric.label} size={{ xs: 12, sm: 6, xl: 3 }}>
              {linkCards ? (
                <Link href={productionHref} className="block">{card}</Link>
              ) : card}
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )
}
