"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpDown, Clock, Droplets, TriangleAlert } from "lucide-react"
import type { Enums } from "@/lib/types/database"
import MuiButton from "@mui/material/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/app-ui/table"
import type { DashboardSystemRow } from "@/features/dashboard/types"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useSystemsTable } from "@/lib/hooks/use-dashboard"
import { useLatestWaterQualityStatus, useWaterQualityMeasurements } from "@/lib/hooks/use-water-quality"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { getErrorMessage } from "@/lib/utils/query-result"
import SystemHistorySheet from "@/components/systems/system-history-sheet"
import type { TimePeriod } from "@/lib/time-period"
import {
  formatAsOfDate,
  formatNumberValue,
  formatUnitValue,
} from "@/lib/analytics-format"
import { formatCageLabel } from "@/lib/system-options"
import { getUtcDateInputDaysAgo } from "@/lib/deterministic-format"

interface SystemsTableProps {
  stage: Enums<"system_growth_stage"> | "all"
  batch?: string
  system?: string
  timePeriod?: TimePeriod
  dateFrom?: string
  dateTo?: string
  scopedSystemIds?: number[] | null
  farmId?: string | null
  showHeader?: boolean
}

const PAGE_SIZE = 10

type SortKey =
  | "system_name"
  | "fish_end"
  | "biomass_end"
  | "biomass_density"
  | "abw"
  | "sample_age_days"
  | "efcr"
  | "feeding_rate"
  | "mortality_rate"
  | "do_latest"
  | "water_quality"

type SortDirection = "asc" | "desc"

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

const ratingToneClass = (value: string | null | undefined) => {
  if (value === "optimal") return "bg-success/15 text-success"
  if (value === "acceptable") return "bg-warning/15 text-warning"
  if (value === "critical" || value === "lethal") return "bg-destructive/15 text-destructive"
  return "bg-muted text-muted-foreground"
}

const formatPercent = (value: number | null | undefined, decimals = 1, suffix = "%") => {
  if (!isFiniteNumber(value)) return "--"
  return `${formatNumberValue(value, { decimals, minimumDecimals: decimals })}${suffix}`
}

const formatFeedRate = (value: number | null | undefined) => {
  if (!isFiniteNumber(value)) return "--"
  return `${formatNumberValue(value, { decimals: 1, minimumDecimals: 1 })}% BW/day`
}

const median = (values: number[]) => {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export default function SystemsTable({
  stage,
  batch = "all",
  system = "all",
  timePeriod = "2 weeks",
  dateFrom,
  dateTo,
  scopedSystemIds,
  farmId: initialFarmId,
  showHeader = true,
}: SystemsTableProps) {
  const { farmId: activeFarmId } = useActiveFarm()
  const farmId = initialFarmId ?? activeFarmId
  const boundsReady = Boolean(dateFrom && dateTo)
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("system_name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const systemsQuery = useSystemsTable({
    farmId,
    stage,
    batch,
    system,
    timePeriod,
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
    includeIncomplete: true,
    scopedSystemIds,
  })

  const systems = systemsQuery.data?.rows ?? []
  const loading = !boundsReady || systemsQuery.isLoading
  const errorMessage = getErrorMessage(systemsQuery.error)
  const emptyReason = systemsQuery.data?.meta.reason ?? null

  const latestStatusQuery = useLatestWaterQualityStatus(undefined, { farmId })
  const doMeasurementsQuery = useWaterQualityMeasurements({
    farmId,
    parameterName: "dissolved_oxygen",
    dateFrom: getUtcDateInputDaysAgo(30),
    limit: 5000,
    enabled: Boolean(farmId),
  })
  const latestStatusMap = useMemo(() => {
    const rows = latestStatusQuery.data?.status === "success" ? latestStatusQuery.data.data : []
    const map = new Map<number, (typeof rows)[number]>()
    rows.forEach((row) => {
      map.set(row.system_id, row)
    })
    return map
  }, [latestStatusQuery.data])

  const latestDoMap = useMemo(() => {
    const map = new Map<number, { value: number | null; timestamp: string | null }>()
    const rows = doMeasurementsQuery.data?.status === "success" ? doMeasurementsQuery.data.data : []

    rows.forEach((row) => {
      if (typeof row.system_id !== "number" || row.parameter_value == null || !row.date) return
      const timestamp = `${row.date}T${row.time ?? "00:00:00"}`
      const current = map.get(row.system_id)
      if (!current || !current.timestamp || timestamp > current.timestamp) {
        map.set(row.system_id, { value: row.parameter_value, timestamp })
      }
    })

    return map
  }, [doMeasurementsQuery.data])

  const farmMedianEfcr = useMemo(
    () => median(systems.map((row) => row.efcr).filter(isFiniteNumber)),
    [systems],
  )

  const sortedSystems = useMemo(() => {
    const getSortValue = (row: DashboardSystemRow) => {
      if (sortKey === "system_name") return row.system_name?.toLowerCase() ?? ""
      if (sortKey === "do_latest") return latestDoMap.get(row.system_id)?.value ?? -1
      if (sortKey === "water_quality") return row.water_quality_rating_numeric_average ?? -1
      return row[sortKey] ?? -1
    }

    const sorted = [...systems].sort((left, right) => {
      const leftValue = getSortValue(left)
      const rightValue = getSortValue(right)

      if (typeof leftValue === "string" && typeof rightValue === "string") {
        const compare = leftValue.localeCompare(rightValue)
        return sortDirection === "asc" ? compare : compare * -1
      }

      const numericLeft = typeof leftValue === "number" ? leftValue : -1
      const numericRight = typeof rightValue === "number" ? rightValue : -1
      const compare = numericLeft - numericRight
      return sortDirection === "asc" ? compare : compare * -1
    })

    return sorted
  }, [latestDoMap, sortDirection, sortKey, systems])

  const totalRows = sortedSystems.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const currentPage = Math.min(pageIndex, totalPages - 1)
  const startIndex = currentPage * PAGE_SIZE
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRows)
  const pagedSystems = sortedSystems.slice(startIndex, endIndex)
  const showPagination = totalRows > PAGE_SIZE
  const selectedSystem = sortedSystems.find((row) => row.system_id === selectedSystemId) ?? null

  const combinedUpdatedAt = Math.max(
    systemsQuery.dataUpdatedAt ?? 0,
    latestStatusQuery.dataUpdatedAt ?? 0,
    doMeasurementsQuery.dataUpdatedAt ?? 0,
  )
  const combinedFetching =
    systemsQuery.isFetching ||
    latestStatusQuery.isFetching ||
    doMeasurementsQuery.isFetching

  useEffect(() => {
    setPageIndex(0)
  }, [batch, farmId, stage, system, timePeriod, sortDirection, sortKey])

  useEffect(() => {
    if (selectedSystemId === null) return
    if (!sortedSystems.some((row) => row.system_id === selectedSystemId)) {
      setSelectedSystemId(null)
    }
  }, [selectedSystemId, sortedSystems])

  const handleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(nextKey)
    setSortDirection(nextKey === "system_name" ? "asc" : "desc")
  }

  const renderSortHead = (label: string, key: SortKey, align: "left" | "right" = "left") => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className={`inline-flex w-full items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/80 ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
    >
      <span>{label}</span>
      <ArrowUpDown className="h-3 w-3" />
    </button>
  )

  if (systemsQuery.isError) {
    return (
      <DataErrorState
        title="Unable to load system table"
        description={errorMessage ?? "Please retry or check your connection."}
        onRetry={() => systemsQuery.refetch()}
      />
    )
  }

  if (!boundsReady) {
    return (
      <div className="soft-panel p-4 sm:p-6">
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No time range selected for the dashboard yet.
        </div>
      </div>
    )
  }

  return (
    <Card>
      {showHeader ? (
        <CardHeader className="pb-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>System Status</CardTitle>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">{totalRows} active cages in scope</p>
            </div>
            <DataFetchingBadge isFetching={combinedFetching} isLoading={loading} />
          </div>
          <DataUpdatedAt updatedAt={combinedUpdatedAt} />
        </CardHeader>
      ) : null}

      <CardContent className={showHeader ? "pt-2" : undefined}>
        {loading ? (
          <div className="flex h-[240px] items-center justify-center text-muted-foreground">
            Loading table...
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {pagedSystems.length > 0 ? (
                pagedSystems.map((row) => {
            const asOf = formatAsOfDate(row.as_of_date ?? row.input_end_date)
            const latestStatus = latestStatusMap.get(row.system_id)
            const latestDo = latestDoMap.get(row.system_id)?.value ?? null
            const staleSample = (row.sample_age_days ?? 0) > 30
            const doCritical = Boolean(latestStatus?.do_exceeded)
            const efcrOutlier =
              isFiniteNumber(row.efcr) &&
              isFiniteNumber(farmMedianEfcr) &&
              farmMedianEfcr > 0 &&
              row.efcr > farmMedianEfcr * 3
            const flags = [
              staleSample ? "Sample stale" : null,
              doCritical ? "Low DO" : null,
              efcrOutlier ? "eFCR outlier" : null,
            ].filter(Boolean)

            return (
              <button
                key={row.system_id}
                type="button"
                onClick={() => setSelectedSystemId(row.system_id)}
                className="w-full rounded-lg border border-border/70 bg-background p-3 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5 text-foreground">
                      {formatCageLabel({ id: row.system_id, label: row.system_name, unit: null })}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">As of {asOf ?? "N/A"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${ratingToneClass(row.water_quality_rating_average)}`}>
                    {row.water_quality_rating_average ?? "Unknown"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/45 px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fish</p>
                    <p className="mt-0.5 font-semibold text-foreground">{formatNumberValue(row.fish_end)}</p>
                  </div>
                  <div className="rounded-md bg-muted/45 px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Biomass</p>
                    <p className="mt-0.5 font-semibold text-foreground">{formatUnitValue(row.biomass_end, 1, "kg")}</p>
                  </div>
                  <div className="rounded-md bg-muted/45 px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">ABW</p>
                    <p className="mt-0.5 font-semibold text-foreground">{formatUnitValue(row.abw, 1, "g")}</p>
                  </div>
                  <div className="rounded-md bg-muted/45 px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Density</p>
                    <p className="mt-0.5 font-semibold text-foreground">
                      {formatUnitValue(row.biomass_density, 2, "kg/m3")}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/45 px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">DO</p>
                    <p className={`mt-0.5 font-semibold ${doCritical ? "text-destructive" : "text-foreground"}`}>
                      {latestDo == null ? "--" : `${formatNumberValue(latestDo, { decimals: 1, minimumDecimals: 1 })} mg/L`}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {flags.length > 0 ? (
                    flags.map((flag) => (
                      <span key={flag} className="rounded-full bg-warning/15 px-2 py-1 text-[11px] font-semibold text-warning">
                        {flag}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-success/15 px-2 py-1 text-[11px] font-semibold text-success">No active flags</span>
                  )}
                </div>
              </button>
            )
                })
              ) : (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  {emptyReason === "Missing time bounds"
                    ? "No time range selected"
                    : emptyReason === "No scoped systems"
                      ? "No systems match the selected filters"
                      : "No active cages found"}
                </div>
              )}
            </div>

            <div className="soft-table-shell hidden max-h-[480px] md:block">
              <Table className="min-w-[1180px]">
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead>{renderSortHead("Cage", "system_name")}</TableHead>
                    <TableHead className="text-right">{renderSortHead("Fish Count", "fish_end", "right")}</TableHead>
                    <TableHead className="text-right">{renderSortHead("Biomass kg", "biomass_end", "right")}</TableHead>
                    <TableHead className="text-right">{renderSortHead("Density kg/m3", "biomass_density", "right")}</TableHead>
                    <TableHead className="text-right">{renderSortHead("ABW g", "abw", "right")}</TableHead>
                    <TableHead className="text-right">{renderSortHead("Last Sampled", "sample_age_days", "right")}</TableHead>
                    <TableHead className="text-right">{renderSortHead("eFCR", "efcr", "right")}</TableHead>
                    <TableHead className="text-right">{renderSortHead("Feed Rate %", "feeding_rate", "right")}</TableHead>
                    <TableHead className="text-right">{renderSortHead("Mortality %", "mortality_rate", "right")}</TableHead>
                    <TableHead className="text-right">{renderSortHead("DO Latest", "do_latest", "right")}</TableHead>
                    <TableHead className="text-right">{renderSortHead("WQ Rating", "water_quality", "right")}</TableHead>
                    <TableHead className="text-center">Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedSystems.length > 0 ? (
                    pagedSystems.map((row) => {
                const asOf = formatAsOfDate(row.as_of_date ?? row.input_end_date)
                const latestStatus = latestStatusMap.get(row.system_id)
                const latestDo = latestDoMap.get(row.system_id)?.value ?? null
                const staleSample = (row.sample_age_days ?? 0) > 30
                const doCritical = Boolean(latestStatus?.do_exceeded)
                const efcrOutlier =
                  isFiniteNumber(row.efcr) &&
                  isFiniteNumber(farmMedianEfcr) &&
                  farmMedianEfcr > 0 &&
                  row.efcr > farmMedianEfcr * 3

                const flags = [
                  staleSample
                    ? {
                        key: "stale-sample",
                        title: `Sample is ${row.sample_age_days} days old.`,
                        icon: Clock,
                        className: "bg-warning/15 text-warning",
                      }
                    : null,
                  doCritical
                    ? {
                        key: "do-critical",
                        title: "Latest dissolved oxygen breached the low-DO threshold.",
                        icon: Droplets,
                        className: "bg-destructive/15 text-destructive",
                      }
                    : null,
                  efcrOutlier
                    ? {
                        key: "efcr-outlier",
                        title: "eFCR is above 3x the current farm median.",
                        icon: TriangleAlert,
                        className: "bg-destructive/15 text-destructive",
                      }
                    : null,
                ].filter(Boolean) as Array<{
                  key: string
                  title: string
                  icon: typeof Clock
                  className: string
                }>

                return (
                  <TableRow
                    key={row.system_id}
                    className="cursor-pointer"
                    onClick={() => setSelectedSystemId(row.system_id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        setSelectedSystemId(row.system_id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <TableCell className="min-w-[220px]">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {formatCageLabel({ id: row.system_id, label: row.system_name, unit: null })}
                        </p>
                        <p className="text-[11px] text-muted-foreground">As of {asOf ?? "N/A"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatNumberValue(row.fish_end)}</TableCell>
                    <TableCell className="text-right">{formatUnitValue(row.biomass_end, 1, "kg")}</TableCell>
                    <TableCell className="text-right">{formatUnitValue(row.biomass_density, 2, "kg/m3")}</TableCell>
                    <TableCell className="text-right">{formatUnitValue(row.abw, 1, "g")}</TableCell>
                    <TableCell className="text-right">
                      {row.sample_age_days == null ? "--" : `${formatNumberValue(row.sample_age_days)}d ago`}
                    </TableCell>
                    <TableCell className="text-right">{formatNumberValue(row.efcr, { decimals: 2 })}</TableCell>
                    <TableCell className="text-right">{formatFeedRate(row.feeding_rate)}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.mortality_rate, 2)}</TableCell>
                    <TableCell className={`text-right ${doCritical ? "text-destructive" : "text-foreground"}`}>
                      {latestDo == null ? "--" : `${formatNumberValue(latestDo, { decimals: 1, minimumDecimals: 1 })} mg/L`}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${ratingToneClass(row.water_quality_rating_average)}`}>
                        {row.water_quality_rating_average ?? "Unknown"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {flags.length > 0 ? (
                          flags.map((flag) => {
                            const Icon = flag.icon
                            return (
                              <span
                                key={flag.key}
                                title={flag.title}
                                aria-label={flag.title}
                                className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${flag.className}`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                            )
                          })
                        ) : (
                          <span className="text-[11px] text-muted-foreground">--</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                        {emptyReason === "Missing time bounds"
                          ? "No time range selected"
                          : emptyReason === "No scoped systems"
                            ? "No systems match the selected filters"
                            : "No active cages found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
        {showPagination && !loading ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <span>
              Showing {startIndex + 1}-{endIndex} of {totalRows}
            </span>
            <div className="flex items-center gap-2">
              <MuiButton
                variant="outlined"
                size="small"
                onClick={() => setPageIndex((current) => Math.max(current - 1, 0))}
                disabled={currentPage === 0}
              >
                Previous
              </MuiButton>
              <MuiButton
                variant="outlined"
                size="small"
                onClick={() => setPageIndex((current) => Math.min(current + 1, totalPages - 1))}
                disabled={currentPage >= totalPages - 1}
              >
                Next
              </MuiButton>
            </div>
          </div>
        ) : null}
      </CardContent>

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
    </Card>
  )
}
