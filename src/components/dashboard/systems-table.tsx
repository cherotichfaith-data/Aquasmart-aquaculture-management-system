"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpDown, Clock, Droplets, Fish, TriangleAlert } from "lucide-react"
import type { Enums } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DashboardPageInitialData, DashboardSystemRow } from "@/features/dashboard/types"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useSystemsTable } from "@/lib/hooks/use-dashboard"
import { buildSystemTimelineMap, useSystemTimelineBounds } from "@/lib/hooks/use-system-timeline"
import { useLatestWaterQualityStatus, useWaterQualityMeasurements, useWaterQualityOverlay } from "@/lib/hooks/use-water-quality"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { getErrorMessage } from "@/lib/utils/query-result"
import SystemHistorySheet from "@/components/systems/system-history-sheet"
import type { TimePeriod } from "@/lib/time-period"
import { resolveSystemTimelineWindow } from "@/lib/system-timeline-window"
import {
  formatAsOfDate,
  formatNumberValue,
  formatProductionPeriod,
  formatUnitValue,
  timelineSourceLabel,
} from "@/lib/analytics-format"

interface SystemsTableProps {
  stage: Enums<"system_growth_stage"> | "all"
  batch?: string
  system?: string
  timePeriod?: TimePeriod
  dateFrom?: string
  dateTo?: string
  scopedSystemIds?: number[] | null
  farmId?: string | null
  initialData?: DashboardPageInitialData["systemsTable"]
}

const PAGE_SIZE = 10

type SortKey =
  | "system_name"
  | "fish_end"
  | "biomass_end"
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

const toLocalDateInput = (value: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value)

const daysAgoDate = (days: number) => {
  const value = new Date()
  value.setDate(value.getDate() - days)
  return toLocalDateInput(value)
}

const ratingToneClass = (value: string | null | undefined) => {
  if (value === "optimal") return "bg-chart-2/15 text-chart-2"
  if (value === "acceptable") return "bg-chart-4/15 text-chart-4"
  if (value === "critical" || value === "lethal") return "bg-destructive/15 text-destructive"
  return "bg-muted text-muted-foreground"
}

const formatPercent = (value: number | null | undefined, decimals = 1, suffix = "%") => {
  if (!isFiniteNumber(value)) return "--"
  return `${formatNumberValue(value * 100, { decimals, minimumDecimals: decimals })}${suffix}`
}

const formatFeedRate = (value: number | null | undefined) => {
  if (!isFiniteNumber(value)) return "--"
  return `${formatNumberValue(value * 100, { decimals: 1, minimumDecimals: 1 })}% BW/day`
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
  initialData,
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
    initialData,
  })

  const systems = systemsQuery.data?.rows ?? []
  const loading = !boundsReady || systemsQuery.isLoading
  const errorMessage = getErrorMessage(systemsQuery.error)

  const timelineQuery = useSystemTimelineBounds({
    farmId,
    enabled: Boolean(farmId) && systems.length > 0,
  })
  const latestStatusQuery = useLatestWaterQualityStatus(undefined, { farmId })
  const doMeasurementsQuery = useWaterQualityMeasurements({
    farmId,
    parameterName: "dissolved_oxygen",
    dateFrom: daysAgoDate(30),
    limit: 5000,
    enabled: Boolean(farmId),
  })
  const today = useMemo(() => toLocalDateInput(new Date()), [])
  const todayOverlayQuery = useWaterQualityOverlay({
    farmId,
    dateFrom: today,
    dateTo: today,
    enabled: Boolean(farmId),
  })

  const timelineMap = useMemo(
    () => (timelineQuery.data?.status === "success" ? buildSystemTimelineMap(timelineQuery.data.data) : new Map()),
    [timelineQuery.data],
  )

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

  const todayFeedBySystem = useMemo(() => {
    const map = new Map<number, number>()
    const rows = todayOverlayQuery.data?.status === "success" ? todayOverlayQuery.data.data : []

    rows.forEach((row) => {
      map.set(row.system_id, (map.get(row.system_id) ?? 0) + (row.feeding_amount ?? 0))
    })

    return map
  }, [todayOverlayQuery.data])

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
    timelineQuery.dataUpdatedAt ?? 0,
    latestStatusQuery.dataUpdatedAt ?? 0,
    doMeasurementsQuery.dataUpdatedAt ?? 0,
    todayOverlayQuery.dataUpdatedAt ?? 0,
  )
  const combinedFetching =
    systemsQuery.isFetching ||
    timelineQuery.isFetching ||
    latestStatusQuery.isFetching ||
    doMeasurementsQuery.isFetching ||
    todayOverlayQuery.isFetching

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

  if (loading) {
    return (
      <div className="rounded-lg border border-border/90 bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">System Status</h2>
            <p className="text-xs text-muted-foreground">Loading active cages...</p>
          </div>
          <span className="text-xs text-muted-foreground">Loading</span>
        </div>
        <div className="h-[260px] rounded-md border border-dashed border-border bg-muted/50" />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/90 bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">System Status</h2>
          <p className="text-xs text-muted-foreground">{totalRows} active cages in scope</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DataUpdatedAt updatedAt={combinedUpdatedAt} />
          <DataFetchingBadge isFetching={combinedFetching} isLoading={loading} />
        </div>
      </div>

      <div className="dense-table-shell max-h-[62vh]">
        <Table className="min-w-[1180px]">
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead className="sticky top-0 bg-muted/70">{renderSortHead("Cage", "system_name")}</TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-right">{renderSortHead("Fish Count", "fish_end", "right")}</TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-right">{renderSortHead("Biomass kg", "biomass_end", "right")}</TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-right">{renderSortHead("ABW g", "abw", "right")}</TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-right">{renderSortHead("Last Sampled", "sample_age_days", "right")}</TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-right">{renderSortHead("eFCR", "efcr", "right")}</TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-right">{renderSortHead("Feed Rate %", "feeding_rate", "right")}</TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-right">{renderSortHead("Mortality %", "mortality_rate", "right")}</TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-right">{renderSortHead("DO Latest", "do_latest", "right")}</TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-right">{renderSortHead("WQ Rating", "water_quality", "right")}</TableHead>
              <TableHead className="sticky top-0 bg-muted/70 text-center text-[11px] font-semibold uppercase tracking-wide text-foreground/80">
                Flags
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedSystems.length > 0 ? (
              pagedSystems.map((row) => {
                const timeline = timelineMap.get(row.system_id)
                const asOf = formatAsOfDate(timeline?.snapshot_as_of ?? row.as_of_date ?? row.input_end_date)
                const effectiveTimeline = resolveSystemTimelineWindow(timeline, {
                  windowStart: dateFrom ?? null,
                  windowEnd: dateTo ?? null,
                })
                const productionPeriod = formatProductionPeriod(
                  effectiveTimeline?.displayStart,
                  effectiveTimeline?.displayEnd,
                  false,
                )
                const productionLabel = timelineSourceLabel(effectiveTimeline?.periodSource ?? timeline?.period_source)
                const latestStatus = latestStatusMap.get(row.system_id)
                const latestDo = latestDoMap.get(row.system_id)?.value ?? null
                const fedToday = (todayFeedBySystem.get(row.system_id) ?? 0) > 0
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
                        className: "bg-chart-4/15 text-chart-4",
                      }
                    : null,
                  !fedToday
                    ? {
                        key: "missing-feed",
                        title: "No feed recorded today.",
                        icon: Fish,
                        className: "bg-chart-4/15 text-chart-4",
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
                    className="cursor-pointer border-b border-border/70 hover:bg-muted/45"
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
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{row.system_name || `System ${row.system_id}`}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {productionLabel && productionPeriod
                            ? `${productionLabel} ${productionPeriod}`
                            : effectiveTimeline?.hasTimeline
                              ? "No activity in selected period"
                              : "No production data"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Density {formatNumberValue(row.biomass_density, { decimals: 2 })} kg/m3 | As of {asOf ?? "N/A"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatNumberValue(row.fish_end)}</TableCell>
                    <TableCell className="text-right text-sm">{formatUnitValue(row.biomass_end, 1, "kg")}</TableCell>
                    <TableCell className="text-right text-sm">{formatUnitValue(row.abw, 1, "g")}</TableCell>
                    <TableCell className="text-right text-sm">
                      {row.sample_age_days == null ? "--" : `${formatNumberValue(row.sample_age_days)}d ago`}
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatNumberValue(row.efcr, { decimals: 2 })}</TableCell>
                    <TableCell className="text-right text-sm">{formatFeedRate(row.feeding_rate)}</TableCell>
                    <TableCell className="text-right text-sm">{formatPercent(row.mortality_rate, 2)}</TableCell>
                    <TableCell className={`text-right text-sm ${doCritical ? "text-destructive" : "text-foreground"}`}>
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
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                  No active cages found
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
              onClick={() => setPageIndex((current) => Math.max(current - 1, 0))}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((current) => Math.min(current + 1, totalPages - 1))}
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
