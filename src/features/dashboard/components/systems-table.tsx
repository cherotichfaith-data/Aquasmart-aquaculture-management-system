"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowDownRight, ArrowRight, ArrowUpDown, ArrowUpRight, type LucideIcon } from "lucide-react"
import type { Enums } from "@/lib/types/database"
import MuiButton from "@mui/material/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/app-ui/table"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useSystemsTable } from "@/lib/hooks/use-dashboard"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { getErrorMessage } from "@/lib/utils/query-result"
import SystemHistorySheet from "@/components/systems/system-history-sheet"
import type { TimePeriod } from "@/lib/time-period"
import { formatDateOnly, formatNumberValue, formatUnitValue } from "@/lib/analytics-format"
import type { DashboardSystemRow } from "@/features/dashboard/types"

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
  | "efcr"
  | "abw"
  | "feeding_rate"
  | "mortality_rate"
  | "biomass_density"
  | "water_quality_rating_average"

type SortDirection = "asc" | "desc"
type MetricKey = Exclude<SortKey, "system_name">
type TrendArrow = NonNullable<DashboardSystemRow["efcr_arrow"]>

const metricColumns = [
  {
    key: "efcr" as const,
    label: "eFCR",
    width: "w-[140px]",
    value: (row: DashboardSystemRow) => formatNumberValue(row.efcr, { decimals: 2, fallback: "" }),
    date: (row: DashboardSystemRow) => row.efcr_latest_date,
    arrow: (row: DashboardSystemRow) => row.efcr_arrow,
  },
  {
    key: "abw" as const,
    label: "ABW",
    width: "w-[135px]",
    value: (row: DashboardSystemRow) => formatUnitValue(row.abw, 1, "g", ""),
    date: (row: DashboardSystemRow) => row.abw_latest_date,
    arrow: (row: DashboardSystemRow) => row.abw_arrow,
  },
  {
    key: "feeding_rate" as const,
    label: "Feeding rate",
    width: "w-[150px]",
    value: (row: DashboardSystemRow) => formatUnitValue(row.feeding_rate, 2, "% BW/day", ""),
    date: (row: DashboardSystemRow) => row.feeding_rate_latest_date,
    arrow: (row: DashboardSystemRow) => row.feeding_rate_arrow,
  },
  {
    key: "mortality_rate" as const,
    label: "Mortality rate",
    width: "w-[145px]",
    value: (row: DashboardSystemRow) => formatUnitValue(row.mortality_rate, 2, "%", ""),
    date: (row: DashboardSystemRow) => row.mortality_rate_latest_date,
    arrow: (row: DashboardSystemRow) => row.mortality_rate_arrow,
  },
  {
    key: "biomass_density" as const,
    label: "Density",
    width: "w-[135px]",
    value: (row: DashboardSystemRow) => formatUnitValue(row.biomass_density, 2, "kg/m3", ""),
    date: (row: DashboardSystemRow) => row.biomass_density_latest_date,
    arrow: (row: DashboardSystemRow) => row.biomass_density_arrow,
  },
  {
    key: "water_quality_rating_average" as const,
    label: "Water quality",
    width: "w-[145px]",
    value: (row: DashboardSystemRow) => waterQualityLabel(row.water_quality_rating_average),
    date: (row: DashboardSystemRow) => row.water_quality_latest_date,
    arrow: (row: DashboardSystemRow) => row.water_quality_arrow,
  },
] as const

const waterQualityLabel = (value: string | null | undefined) => {
  if (value === "optimal") return "Good"
  if (value === "acceptable") return "Fair"
  if (value === "critical") return "Poor"
  if (value === "lethal") return "Critical"
  return value ?? ""
}

const formatMetricDate = (value: string | null | undefined) =>
  value ? formatDateOnly(value, "", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""

const getTrendIcon = (arrow: TrendArrow): LucideIcon | null => {
  if (arrow === "up") return ArrowUpRight
  if (arrow === "down") return ArrowDownRight
  if (arrow === "straight") return ArrowRight
  return null
}

const trendToneClass = (metric: MetricKey, arrow: TrendArrow) => {
  if (metric === "water_quality_rating_average" || metric === "efcr") return "text-primary"
  if (!arrow || arrow === "straight") return "text-muted-foreground"
  if (metric === "mortality_rate") return arrow === "down" ? "text-emerald-600" : "text-rose-500"
  return arrow === "up" ? "text-emerald-600" : "text-rose-500"
}

export default function SystemsTable({
  stage,
  batch = "all",
  system = "all",
  timePeriod = "month",
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
  const emptyMessage =
    emptyReason === "Missing time bounds"
      ? "No time range selected"
      : emptyReason === "No scoped systems"
        ? "No systems match the selected filters"
        : emptyReason === "No active systems"
          ? "No active cages match the selected filters"
          : emptyReason === "RPC error"
            ? systemsQuery.data?.meta.error ?? "Unable to load system inventory"
            : "No active cages found"

  const sortedSystems = useMemo(() => {
    const getSortValue = (row: DashboardSystemRow) => {
      if (sortKey === "system_name") return row.system_name.toLowerCase()
      if (sortKey === "water_quality_rating_average") return row.water_quality_rating_average?.toLowerCase() ?? ""
      return row[sortKey] ?? -1
    }

    return [...systems].sort((left, right) => {
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
  }, [sortDirection, sortKey, systems])

  const totalRows = sortedSystems.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const currentPage = Math.min(pageIndex, totalPages - 1)
  const startIndex = currentPage * PAGE_SIZE
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRows)
  const pagedSystems = sortedSystems.slice(startIndex, endIndex)
  const showPagination = totalRows > PAGE_SIZE
  const selectedSystem = sortedSystems.find((row) => row.system_id === selectedSystemId) ?? null

  const combinedUpdatedAt = systemsQuery.dataUpdatedAt ?? 0
  const combinedFetching = systemsQuery.isFetching

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
      className={`inline-flex w-full items-center gap-1 text-[11px] font-semibold text-foreground/85 ${
        align === "right" ? "justify-end md:justify-start" : "justify-start"
      }`}
    >
      <span>{label}</span>
      {key === "system_name" || sortKey === key ? <ArrowUpDown className="h-3 w-3 text-muted-foreground" /> : null}
    </button>
  )

  const renderMetricCell = (row: DashboardSystemRow, metric: (typeof metricColumns)[number]) => {
    const arrow = metric.arrow(row)
    const TrendIcon = getTrendIcon(arrow)
    const isWaterQuality = metric.key === "water_quality_rating_average"
    const value = metric.value(row)

    return (
      <div className="flex flex-col items-start gap-1 text-left md:items-start md:text-left">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-sm font-semibold leading-5 ${
              isWaterQuality ? "text-primary underline decoration-primary/40 underline-offset-2" : "text-foreground"
            }`}
          >
            {value}
          </span>
          {TrendIcon ? <TrendIcon className={`h-3.5 w-3.5 ${trendToneClass(metric.key, arrow)}`} /> : null}
        </div>
        <span className="text-[10px] leading-4 text-muted-foreground">{formatMetricDate(metric.date(row))}</span>
      </div>
    )
  }

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
    <Card className="soft-panel gap-0 overflow-hidden !py-0">
      {showHeader ? (
        <CardHeader className="border-b border-border/60 pb-3 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Production</CardTitle>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">{totalRows} active cages in scope</p>
            </div>
            <DataFetchingBadge isFetching={combinedFetching} isLoading={loading} />
          </div>
          <DataUpdatedAt updatedAt={combinedUpdatedAt} />
        </CardHeader>
      ) : null}

      <CardContent className={showHeader ? "!px-0 pt-0" : "!px-0 !pt-0"}>
        {loading ? (
          <div className="flex h-[240px] items-center justify-center text-muted-foreground">Loading table...</div>
        ) : (
          <>
            <div className="grid gap-3 p-3 md:hidden">
              {pagedSystems.length > 0 ? (
                pagedSystems.map((row) => (
                  <button
                    key={row.system_id}
                    type="button"
                    onClick={() => setSelectedSystemId(row.system_id)}
                    className="group w-full rounded-[1rem] border border-border/70 bg-background p-3.5 text-left transition-colors hover:bg-muted/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-hidden="true" />
                      <p className="truncate text-sm font-semibold leading-5 text-foreground group-hover:underline">
                        {row.system_name}
                      </p>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {metricColumns.map((metric) => (
                        <div key={metric.key} className="rounded-xl border border-border/60 bg-muted/[0.18] px-2.5 py-2.5">
                          <p className="text-[10px] font-semibold text-muted-foreground">{metric.label}</p>
                          <div className="mt-1">{renderMetricCell(row, metric)}</div>
                        </div>
                      ))}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              )}
            </div>

            <div className="soft-table-shell hidden max-h-[520px] rounded-none border-0 md:block">
              <Table className="min-w-[1030px] table-fixed">
                <colgroup>
                  <col className="w-[170px]" />
                  {metricColumns.map((metric) => (
                    <col key={metric.key} className={metric.width} />
                  ))}
                </colgroup>
                <TableHeader className="bg-background">
                  <TableRow className="hover:bg-background">
                    <TableHead className="w-[170px] border-b border-border/60 bg-background normal-case tracking-normal">
                      {renderSortHead("System", "system_name")}
                    </TableHead>
                    {metricColumns.map((metric) => (
                      <TableHead
                        key={metric.key}
                        className="border-b border-border/60 bg-background text-left normal-case tracking-normal"
                      >
                        {renderSortHead(metric.label, metric.key as SortKey, "right")}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedSystems.length > 0 ? (
                    pagedSystems.map((row) => (
                      <TableRow
                        key={row.system_id}
                        className="group cursor-pointer bg-background hover:bg-muted/15"
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
                        <TableCell className="w-[170px] py-3 align-top">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-hidden="true" />
                            <span className="text-sm font-medium leading-5 text-foreground group-hover:underline">
                              {row.system_name}
                            </span>
                          </div>
                        </TableCell>
                        {metricColumns.map((metric) => (
                          <TableCell key={metric.key} className="py-3 align-top text-left">
                            {renderMetricCell(row, metric)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        {emptyMessage}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {showPagination && !loading ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-3 pb-3 text-[11px] text-muted-foreground md:px-0 md:pb-0">
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
