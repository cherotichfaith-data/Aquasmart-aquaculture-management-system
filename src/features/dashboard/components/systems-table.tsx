"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import type { Enums } from "@/lib/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { DataTable } from "@/components/shared/data-table"
import type { DashboardSystemRow } from "@/features/dashboard/types"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import type { TimePeriod } from "@/lib/time-period"
import { toTimePeriodUrlValue } from "@/lib/time-period"
import { buildDashboardSystemColumns } from "./systems-table-columns"
import {
  formatSampleAgeText,
  isFiniteNumber,
  median,
  WaterQualityFlagsCell,
} from "@/features/dashboard/lib/table-cells"
import { formatNumberValue, formatUnitValue } from "@/lib/analytics-format"
import { formatCageLabel } from "@/lib/system-options"

interface SystemsTableProps {
  rows: DashboardSystemRow[]
  isLoading: boolean
  isFetching: boolean
  isError?: boolean
  errorMessage?: string | null
  emptyReason?: string | null
  updatedAt?: number
  onRetry?: () => void
  stage: Enums<"system_growth_stage"> | "all"
  batch?: string
  timePeriod?: TimePeriod
  farmId?: string | null
  showHeader?: boolean
  stalenessDays?: number | null
}

const formatPercent = (value: number | null | undefined, decimals = 1, suffix = "%") => {
  if (!isFiniteNumber(value)) return "--"
  return `${formatNumberValue(value, { decimals, minimumDecimals: decimals })}${suffix}`
}

export default function SystemsTable({
  rows,
  isLoading,
  isFetching,
  isError = false,
  errorMessage,
  emptyReason,
  updatedAt,
  onRetry,
  stage,
  batch = "all",
  timePeriod = "2 weeks",
  farmId,
  showHeader = true,
  stalenessDays,
}: SystemsTableProps) {
  const router = useRouter()

  const farmMedianEfcr = useMemo(() => median(rows.map((row) => row.efcr).filter(isFiniteNumber)), [rows])
  const columns = useMemo(
    () => buildDashboardSystemColumns({ farmMedianEfcr, timePeriod }),
    [farmMedianEfcr, timePeriod],
  )

  const emptyMessage =
    emptyReason === "Missing time bounds"
      ? "No time range selected"
      : emptyReason === "No scoped systems"
        ? "No systems match the selected filters"
        : "No active cages found"

  const openProductionPage = (systemId: number) => {
    const params = new URLSearchParams()
    params.set("system", String(systemId))
    if (farmId) params.set("farmId", farmId)
    if (batch && batch !== "all") params.set("batch", batch)
    if (stage && stage !== "all") params.set("stage", stage)
    if (timePeriod) params.set("period", toTimePeriodUrlValue(timePeriod))

    router.push(`/production?${params.toString()}`)
  }

  if (isError) {
    return (
      <DataErrorState
        title="Unable to load system table"
        description={errorMessage ?? "Please retry or check your connection."}
        onRetry={onRetry}
      />
    )
  }

  const subtitle = [
    "Latest values per system in the selected period",
    stalenessDays != null && stalenessDays > 0 ? `data as of ${stalenessDays}d ago` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <Card className="rounded-2xl">
      {showHeader ? (
        <CardHeader className="pb-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Production</CardTitle>
              <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>
            </div>
            <DataFetchingBadge isFetching={isFetching} isLoading={isLoading} />
          </div>
          <DataUpdatedAt updatedAt={updatedAt ?? 0} />
        </CardHeader>
      ) : null}

      <CardContent className="pt-2">
        {isLoading ? (
          <div className="h-[240px] animate-pulse rounded-lg bg-muted/50" />
        ) : (
          <>
            <MobileSystemCards
              systems={rows}
              farmMedianEfcr={farmMedianEfcr}
              emptyMessage={emptyMessage}
              onOpenSystem={openProductionPage}
            />

            <div className="hidden md:block">
              <DataTable<DashboardSystemRow>
                columns={columns}
                data={rows}
                rowKey={(row) => row.system_id}
                onRowClick={(row) => openProductionPage(row.system_id)}
                emptyMessage={emptyMessage}
                initialSorting={[{ id: "system", desc: false }]}
                shellClassName="max-h-[520px]"
                tableClassName="min-w-[960px] table-fixed"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MobileSystemCards({
  systems,
  farmMedianEfcr,
  emptyMessage,
  onOpenSystem,
}: {
  systems: DashboardSystemRow[]
  farmMedianEfcr: number | null
  emptyMessage: string
  onOpenSystem: (systemId: number) => void
}) {
  if (systems.length === 0) {
    return (
      <div className="grid gap-3 md:hidden">
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:hidden">
      {systems.map((row) => {
        const cageLabel = formatCageLabel({ id: row.system_id, label: row.system_name, unit: null })
        const title = row.batch_name ?? cageLabel
        const subtitle = row.batch_name ? cageLabel : null

        return (
          <button
            key={row.system_id}
            type="button"
            onClick={() => onOpenSystem(row.system_id)}
            className="w-full rounded-lg border border-border/70 bg-background p-3 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-5 text-foreground">{title}</p>
              {subtitle ? <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{subtitle}</p> : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <MobileMetric label="Fish" value={formatNumberValue(row.fish_end)} />
              <MobileMetric label="eFCR" value={formatNumberValue(row.efcr, { decimals: 2 })} />
              <MobileMetric
                label="ABW"
                value={formatUnitValue(row.abw, 1, "g")}
                subtext={formatSampleAgeText(row.sample_age_days)}
              />
              <MobileMetric label="SGR" value={formatPercent(row.sgr, 2, "%/day")} />
              <MobileMetric label="Feed kg" value={formatUnitValue(row.feed_total, 1, "kg")} />
              <MobileMetric label="Mortality" value={formatPercent(row.mortality_rate, 2)} />
              <MobileMetric label="Biomass" value={formatUnitValue(row.biomass_end, 1, "kg")} />
              <MobileMetric label="Density" value={formatUnitValue(row.biomass_density, 2, "kg/m3")} />
              <div className="col-span-2 rounded-md bg-muted/45 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">WQ / Flags</p>
                <WaterQualityFlagsCell row={row} farmMedianEfcr={farmMedianEfcr} size="card" />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function MobileMetric({ label, value, subtext }: { label: string; value: string; subtext?: string | null }) {
  return (
    <div className="rounded-md bg-muted/45 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold text-foreground">{value}</p>
      {subtext ? <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{subtext}</p> : null}
    </div>
  )
}
