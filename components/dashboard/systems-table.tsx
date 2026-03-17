"use client"

import { useEffect, useMemo, useState } from "react"
import type { Enums } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DashboardPageInitialData } from "@/features/dashboard/types"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useSystemsTable } from "@/lib/hooks/use-dashboard"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { getErrorMessage } from "@/lib/utils/query-result"
import SystemHistorySheet from "@/components/systems/system-history-sheet"

interface SystemsTableProps {
  stage: Enums<"system_growth_stage"> | "all"
  batch?: string
  system?: string
  timePeriod?: Enums<"time_period">
  periodParam?: string | null
  dateFrom?: string
  dateTo?: string
  farmId?: string | null
  initialData?: DashboardPageInitialData["systemsTable"]
}

const PAGE_SIZE = 8
type SystemFilterMode = "all" | "top5" | "bottom5" | "missing"

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

const hasMissingData = (row: {
  fish_end: number | null
  biomass_end: number | null
  feed_total: number | null
  efcr: number | null
  abw: number | null
  feeding_rate: number | null
  mortality_rate: number | null
  biomass_density: number | null
  water_quality_rating_average: string | null
  missing_days_count: number | null
}) => {
  const hasRequiredMetricGap = ![
    row.fish_end,
    row.biomass_end,
    row.feed_total,
    row.efcr,
    row.abw,
    row.feeding_rate,
    row.mortality_rate,
    row.biomass_density,
  ].every((value) => isFiniteNumber(value))

  const hasMissingWaterQuality =
    typeof row.water_quality_rating_average !== "string" ||
    row.water_quality_rating_average.trim().length === 0

  return hasRequiredMetricGap || hasMissingWaterQuality
}

const formatNumber = (value: number | null | undefined, decimals = 0) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--"
  return value.toLocaleString(undefined, { maximumFractionDigits: decimals })
}

const formatWithUnit = (value: number | null | undefined, decimals: number, unit: string) => {
  const formatted = formatNumber(value, decimals)
  return formatted === "--" ? "--" : `${formatted} ${unit}`
}

const formatRate = (value: number | null | undefined, decimals = 4, unit = "rate/day") => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--"
  if (!Number.isFinite(value)) return "--"
  return `${value.toLocaleString(undefined, { maximumFractionDigits: decimals })} ${unit}`
}

const formatAsOfDate = (value: string | null | undefined) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(parsed)
}

export default function SystemsTable({
  stage,
  batch = "all",
  system = "all",
  timePeriod = "2 weeks",
  periodParam,
  dateFrom,
  dateTo,
  farmId: initialFarmId,
  initialData,
}: SystemsTableProps) {
  const { farmId: activeFarmId } = useActiveFarm()
  const farmId = initialFarmId ?? activeFarmId
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null)
  const [filterMode, setFilterMode] = useState<SystemFilterMode>("all")

  const handleRowClick = (systemId: number) => {
    if (!Number.isFinite(systemId)) return
    setSelectedSystemId(systemId)
  }

  const systemsQuery = useSystemsTable({
    farmId,
    stage,
    batch,
    system,
    timePeriod,
    periodParam,
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
    includeIncomplete: true,
    initialData,
  })

  const systems = systemsQuery.data?.rows ?? []
  const filteredSystems = useMemo(() => {
    if (filterMode === "all") return systems

    if (filterMode === "missing") {
      return systems.filter((row) => hasMissingData(row))
    }

    const ranked = systems
      .filter((row) => isFiniteNumber(row.efcr))
      .sort((a, b) => (a.efcr as number) - (b.efcr as number))

    if (filterMode === "top5") {
      return ranked.filter((row) => (row.efcr as number) < 2).slice(0, 5)
    }

    return ranked.filter((row) => (row.efcr as number) > 2).slice(-5)
  }, [filterMode, systems])
  const loading = systemsQuery.isLoading
  const errorMessage = getErrorMessage(systemsQuery.error)

  const totalRows = filteredSystems.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const currentPage = Math.min(pageIndex, totalPages - 1)
  const startIndex = currentPage * PAGE_SIZE
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRows)
  const pagedSystems = filteredSystems.slice(startIndex, endIndex)
  const showPagination = totalRows > PAGE_SIZE
  const selectedSystem = filteredSystems.find((system) => system.system_id === selectedSystemId) ?? null

  useEffect(() => {
    setPageIndex(0)
  }, [batch, farmId, stage, system, timePeriod, periodParam, filterMode])

  useEffect(() => {
    if (selectedSystemId === null) return
    if (!filteredSystems.some((row) => row.system_id === selectedSystemId)) {
      setSelectedSystemId(null)
    }
  }, [filteredSystems, selectedSystemId])

  if (systemsQuery.isError) {
    return (
      <DataErrorState
        title="Unable to load system table"
        description={errorMessage ?? "Please retry or check your connection."}
        onRetry={() => systemsQuery.refetch()}
      />
    )
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border/90 bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Production</h2>
            <p className="text-xs text-muted-foreground">Loading systems...</p>
          </div>
          <span className="text-xs text-muted-foreground">Loading</span>
        </div>
        <div className="h-[240px] rounded-md border border-dashed border-border bg-muted/50" />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/90 bg-card p-6 shadow-sm">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">System Status</h2>
          <div className="flex items-center gap-3">
            <DataUpdatedAt updatedAt={systemsQuery.dataUpdatedAt} />
            <DataFetchingBadge isFetching={systemsQuery.isFetching} isLoading={systemsQuery.isLoading} />
          </div>
        </div>
        <div className="filter-bar mt-3">
          <div className="legend-pills">
            <div className="legend-pill">{totalRows} systems shown</div>
            <div className="legend-pill">{filterMode === "all" ? "Full queue" : filterMode === "top5" ? "Best eFCR" : filterMode === "bottom5" ? "Worst eFCR" : "Missing data"}</div>
          </div>
          <select
            className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
            value={filterMode}
            onChange={(event) => setFilterMode(event.target.value as SystemFilterMode)}
            aria-label="System performance filter"
          >
            <option value="all">All systems</option>
            <option value="top5">Top 5 (best eFCR)</option>
            <option value="bottom5">Bottom 5 (worst eFCR)</option>
            <option value="missing">Missing data</option>
          </select>
        </div>
      </div>
      <div className="dense-table-shell max-h-[60vh]">
        <Table>
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead className="sticky top-0 bg-muted/70 text-[11px] uppercase tracking-wide text-foreground/80">
                System
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-[11px] uppercase tracking-wide text-foreground/80 text-right">
                Fish
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-[11px] uppercase tracking-wide text-foreground/80 text-right">
                Biomass
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-[11px] uppercase tracking-wide text-foreground/80 text-right">
                Feed
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-[11px] uppercase tracking-wide text-foreground/80 text-right">
                eFCR
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-[11px] uppercase tracking-wide text-foreground/80 text-right">
                ABW
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-[11px] uppercase tracking-wide text-foreground/80 text-right hidden lg:table-cell">
                Feeding
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-[11px] uppercase tracking-wide text-foreground/80 text-right hidden lg:table-cell">
                Mortality
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-[11px] uppercase tracking-wide text-foreground/80 text-right hidden xl:table-cell">
                Density
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-[11px] uppercase tracking-wide text-foreground/80 text-right hidden xl:table-cell">
                Water Quality
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-[11px] uppercase tracking-wide text-foreground/80 hidden 2xl:table-cell">
                Flags
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedSystems.length > 0 ? (
              pagedSystems.map((system, i) => {
                const asOf = formatAsOfDate(system.as_of_date ?? system.input_end_date)
                const hasMissingDays = (system.missing_days_count ?? 0) > 0
                const staleSampling = (system.sample_age_days ?? 0) > 14
                const criticalWaterQuality =
                  system.water_quality_rating_average === "critical" || system.water_quality_rating_average === "lethal"
                const flags = [
                  hasMissingDays ? `Missing ${system.missing_days_count}d` : null,
                  staleSampling ? `Sampling ${system.sample_age_days}d old` : null,
                  criticalWaterQuality ? `WQ ${system.water_quality_rating_average}` : null,
                ].filter(Boolean) as string[]

                return (
                  <TableRow
                    key={i}
                    className="cursor-pointer border-b border-border/70 hover:bg-muted/45"
                    onClick={() => handleRowClick(system.system_id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        handleRowClick(system.system_id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-chart-2" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{system.system_name || system.system_id}</p>
                          <p className="text-[11px] text-muted-foreground">
                            As of {asOf ?? "N/A"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-foreground">{formatNumber(system.fish_end, 0)}</TableCell>
                    <TableCell className="text-right text-sm text-foreground">{formatWithUnit(system.biomass_end, 1, "kg")}</TableCell>
                    <TableCell className="text-right text-sm text-foreground">{formatWithUnit(system.feed_total, 1, "kg")}</TableCell>
                    <TableCell className="text-right text-sm text-foreground">{formatNumber(system.efcr, 2)}</TableCell>
                    <TableCell className="text-right text-sm text-foreground">{formatWithUnit(system.abw, 1, "g")}</TableCell>
                    <TableCell className="text-right text-sm text-foreground hidden lg:table-cell">
                      {formatWithUnit(system.feeding_rate, 2, "kg/t")}
                    </TableCell>
                    <TableCell className="text-right text-sm text-foreground hidden lg:table-cell">
                      {formatRate(system.mortality_rate, 4, "rate/day")}
                    </TableCell>
                    <TableCell className="text-right text-sm text-foreground hidden xl:table-cell">
                      {formatNumber(system.biomass_density, 2)}
                    </TableCell>
                    <TableCell className="text-right hidden xl:table-cell">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${
                        system.water_quality_rating_average === "optimal" ? "bg-chart-2/15 text-chart-2" :
                        system.water_quality_rating_average === "acceptable" ? "bg-chart-4/15 text-chart-4" :
                        system.water_quality_rating_average === "critical" ? "bg-chart-4/15 text-chart-4" :
                        "bg-destructive/15 text-destructive"
                      }`}>
                        {system.water_quality_rating_average || "Unknown"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell">
                      {flags.length ? (
                        <div className="flex flex-wrap gap-1">
                          {flags.map((flag) => (
                            <span key={flag} className="inline-flex rounded-full bg-chart-4/15 px-2 py-1 text-[10px] font-semibold text-chart-4">
                              {flag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">None</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                  No systems found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {showPagination ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span>
            Showing {startIndex + 1}-{endIndex} of {totalRows}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((prev) => Math.min(prev + 1, totalPages - 1))}
              disabled={currentPage >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
      <SystemHistorySheet
        open={selectedSystemId !== null}
        onOpenChange={(open) => !open && setSelectedSystemId(null)}
        farmId={farmId}
        systemId={selectedSystemId}
        systemLabel={selectedSystem?.system_name ?? null}
        dateFrom={dateFrom ?? undefined}
        dateTo={dateTo ?? undefined}
        summaryRow={selectedSystem}
      />
    </div>
  )
}


