"use client"

import Link from "next/link"
import { useMemo } from "react"
import Grid from "@mui/material/Grid"
import Box from "@mui/material/Box"
import type { Database, Enums } from "@/lib/types/database"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import type { TimePeriod } from "@/lib/time-period"
import { formatNumberValue } from "@/lib/analytics-format"
import { toDashboardPath } from "@/lib/app-entry"

const formatWholeNumber = (value: number) => formatNumberValue(Math.round(value))
const formatKg = (value: number) => `${formatNumberValue(value, { decimals: 1 })} kg`
type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]

const metricCardClass =
  "rounded-2xl border border-border bg-card p-4"

export default function ProductionSummaryMetrics({
  stage,
  batch,
  system,
  timePeriod = "2 weeks",
  rows,
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
  rows: ProductionSummaryRow[]
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
    params.set("period", timePeriod)
    return `${toDashboardPath("/production")}?${params.toString()}`
  }, [batch, stage, system, timePeriod])

  const metrics = useMemo(() => {
    const totals = rows.reduce(
      (acc, row) => {
        acc.totalStockedFish += row.number_of_fish_stocked ?? 0
        acc.cumulativeMortality += row.daily_mortality_count ?? 0
        acc.transferInFish += row.number_of_fish_transfer_in ?? 0
        acc.transferOutFish += row.number_of_fish_transfer_out ?? 0
        acc.totalHarvestedFish += row.number_of_fish_harvested ?? 0
        acc.totalHarvestedKg += row.total_weight_harvested ?? 0
        return acc
      },
      {
        totalStockedFish: 0,
        cumulativeMortality: 0,
        transferInFish: 0,
        transferOutFish: 0,
        totalHarvestedFish: 0,
        totalHarvestedKg: 0,
      },
    )

    return [
      { label: "Total Stocked", value: `${formatWholeNumber(totals.totalStockedFish)} fish` },
      { label: "Cumulative Mortality", value: `${formatWholeNumber(totals.cumulativeMortality)} fish` },
      {
        label: "Net Transfers",
        value: `+${formatWholeNumber(totals.transferInFish)} fish / -${formatWholeNumber(totals.transferOutFish)} fish`,
      },
      {
        label: "Total Harvested",
        value: `${formatKg(totals.totalHarvestedKg)} | ${formatWholeNumber(totals.totalHarvestedFish)} fish`,
      },
    ]
  }, [rows])

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
