"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, TriangleAlert, type LucideIcon } from "lucide-react"
import type { Enums } from "@/lib/types/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/app-ui/table"
import type { DashboardSystemRow } from "@/features/dashboard/types"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useSystemsTable } from "@/features/dashboard/hooks"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { getErrorMessage } from "@/lib/utils/query-result"
import type { TimePeriod } from "@/lib/time-period"
import { toTimePeriodUrlValue } from "@/lib/time-period"
import { formatNumberValue, formatUnitValue } from "@/lib/analytics-format"
import { formatCageLabel } from "@/lib/system-options"
import { toDashboardPath } from "@/lib/app-entry"

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

type SortKey =
  | "system_name"
  | "fish_end"
  | "efcr"
  | "abw"
  | "sgr"
  | "feed_total"
  | "mortality_rate"
  | "biomass_end"
  | "biomass_density"
  | "water_quality"

type SortDirection = "asc" | "desc"

type SystemFlag = {
  key: string
  title: string
  icon: LucideIcon
  className: string
}

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

const normalizeWaterQuality = (value: string | null | undefined) => value?.trim().toLowerCase() ?? null

const waterQualityLabel = (value: string | null | undefined) => {
  const normalized = normalizeWaterQuality(value)
  if (normalized === "optimal") return "Optimal"
  if (normalized === "acceptable") return "Acceptable"
  if (normalized === "critical") return "Critical"
  if (normalized === "lethal") return "Lethal"
  return value ?? "Unknown"
}

const ratingToneClass = (value: string | null | undefined) => {
  const normalized = normalizeWaterQuality(value)
  if (normalized === "optimal") return "bg-success/15 text-success"
  if (normalized === "acceptable") return "bg-warning/15 text-warning"
  if (normalized === "critical" || normalized === "lethal") return "bg-destructive/15 text-destructive"
  return "bg-muted text-muted-foreground"
}

const formatPercent = (value: number | null | undefined, decimals = 1, suffix = "%") => {
  if (!isFiniteNumber(value)) return "--"
  return `${formatNumberValue(value, { decimals, minimumDecimals: decimals })}${suffix}`
}

const formatMetricValue = (value: number | null | undefined, decimals = 1) => {
  if (!isFiniteNumber(value)) return "--"
  return formatNumberValue(value, { decimals, minimumDecimals: decimals })
}

const formatSampleAgeText = (value: number | null | undefined) => {
  if (!isFiniteNumber(value)) return "No sample"
  if (value === 0) return "Today"
  if (value === 1) return "Yesterday"
  return `${formatNumberValue(value)}d ago`
}

const hasWaterQualityData = (value: string | null | undefined) => Boolean(normalizeWaterQuality(value))

const worstParameterLabel = (value: string | null | undefined) => {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "dissolved_oxygen") return "DO"
  if (normalized === "temperature") return "Temp"
  if (normalized === "ph") return "pH"
  if (normalized === "ammonia") return "Ammonia"
  if (normalized === "nitrite") return "Nitrite"
  if (normalized === "nitrate") return "Nitrate"
  return value ?? null
}

const formatWorstParameterText = (row: DashboardSystemRow) => {
  const label = worstParameterLabel(row.worst_parameter)
  if (!label || !isFiniteNumber(row.worst_parameter_value)) return null
  const unit = row.worst_parameter_unit ? ` ${row.worst_parameter_unit}` : ""
  return `${label} ${formatNumberValue(row.worst_parameter_value, { decimals: 1, minimumDecimals: 1 })}${unit}`
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
  const router = useRouter()
  const { farmId: activeFarmId } = useActiveFarm()
  const farmId = initialFarmId ?? activeFarmId
  const boundsReady = Boolean(dateFrom && dateTo)
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

  const farmMedianEfcr = useMemo(() => median(systems.map((row) => row.efcr).filter(isFiniteNumber)), [systems])

  const sortedSystems = useMemo(() => {
    const getSortValue = (row: DashboardSystemRow) => {
      if (sortKey === "system_name") return (row.batch_name ?? row.system_name ?? "").toLowerCase()
      if (sortKey === "water_quality") return row.water_quality_rating_numeric_average ?? -1
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

  const combinedUpdatedAt = systemsQuery.dataUpdatedAt ?? 0
  const combinedFetching = systemsQuery.isFetching

  const handleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(nextKey)
    setSortDirection(nextKey === "system_name" ? "asc" : "desc")
  }

  const openSystemDetailPage = (systemId: number) => {
    const params = new URLSearchParams()
    if (farmId) params.set("farmId", farmId)
    if (batch && batch !== "all") params.set("batch", batch)
    if (stage && stage !== "all") params.set("stage", stage)
    if (timePeriod) params.set("period", toTimePeriodUrlValue(timePeriod))

    const nextPath = `${toDashboardPath(`/systems/${systemId}`)}${params.toString() ? `?${params.toString()}` : ""}`
    router.push(nextPath)
  }

  const SortChevron = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) {
      return <span className="ml-1 text-[10px] text-slate-400">↕</span>
    }

    return <span className="ml-1 text-[10px] text-slate-600">{sortDirection === "asc" ? "↑" : "↓"}</span>
  }

  const renderSortHead = (label: string, key: SortKey, unit?: string, align: "left" | "right" = "left") => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className={`inline-flex w-full items-center gap-0.5 text-[11px] font-semibold text-slate-700 transition-colors hover:text-slate-900 ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
    >
      <span>{label}</span>
      {unit ? <span className="font-medium text-slate-500">({unit})</span> : null}
      <SortChevron col={key} />
    </button>
  )

  const renderValueBlock = (value: string, subtitle?: string | null, align: "left" | "right" = "left") => (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="text-sm leading-5 text-foreground">{value}</p>
      {subtitle ? <p className="mt-0.5 text-[10px] leading-3 text-muted-foreground">{subtitle}</p> : null}
    </div>
  )

  const headerCellClass = "py-2.5 align-middle normal-case tracking-normal text-slate-700"
  const borderedHeaderCellClass = `border-r border-slate-200 ${headerCellClass}`

  const buildFlags = (row: DashboardSystemRow): SystemFlag[] => {
    const staleSample = (row.sample_age_days ?? 0) > 30
    const wqBreach =
      isFiniteNumber(row.water_quality_rating_numeric_average) &&
      row.water_quality_rating_numeric_average <= 1
    const efcrOutlier =
      isFiniteNumber(row.efcr) &&
      isFiniteNumber(farmMedianEfcr) &&
      farmMedianEfcr > 0 &&
      row.efcr > farmMedianEfcr * 3

    return [
      staleSample
        ? {
            key: "stale-sample",
            title: `Sample is ${row.sample_age_days} days old.`,
            icon: Clock,
            className: "bg-warning/15 text-warning",
          }
        : null,
      wqBreach
        ? {
            key: "wq-breach",
            title: `Water quality is ${row.water_quality_rating_average}. Immediate action required.`,
            icon: TriangleAlert,
            className: "bg-destructive/15 text-destructive",
          }
        : null,
      efcrOutlier
        ? {
            key: "efcr-outlier",
            title: "eFCR is above 3x the farm median.",
            icon: TriangleAlert,
            className: "bg-destructive/15 text-destructive",
          }
        : null,
    ].filter(Boolean) as SystemFlag[]
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
    <Card className="!border-0 !bg-transparent">
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

      <CardContent className={showHeader ? "!px-0 pt-2" : "!px-0"}>
        {loading ? (
          <div className="flex h-[240px] items-center justify-center text-muted-foreground">Loading table...</div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {sortedSystems.length > 0 ? (
                sortedSystems.map((row) => {
                  const cageLabel = formatCageLabel({ id: row.system_id, label: row.system_name, unit: null })
                  const title = row.batch_name ?? cageLabel
                  const subtitle = row.batch_name ? cageLabel : null
                  const flags = buildFlags(row)
                  const showWaterQuality = hasWaterQualityData(row.water_quality_rating_average)
                  const thresholdFlag = flags.find((flag) => flag.key === "wq-breach") ?? null
                  const displayFlags = showWaterQuality ? flags.filter((flag) => flag.key !== "wq-breach") : flags
                  const worstParameterText = formatWorstParameterText(row)

                  return (
                    <button
                      key={row.system_id}
                      type="button"
                      onClick={() => openSystemDetailPage(row.system_id)}
                      className="w-full rounded-lg border border-border/70 bg-background p-3 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-5 text-foreground">{title}</p>
                        {subtitle ? <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{subtitle}</p> : null}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md bg-muted/45 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fish</p>
                          <p className="mt-0.5 font-semibold text-foreground">{formatNumberValue(row.fish_end)}</p>
                        </div>
                        <div className="rounded-md bg-muted/45 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">eFCR</p>
                          <p className="mt-0.5 font-semibold text-foreground">{formatNumberValue(row.efcr, { decimals: 2 })}</p>
                        </div>
                        <div className="rounded-md bg-muted/45 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">ABW</p>
                          <p className="mt-0.5 font-semibold text-foreground">{formatUnitValue(row.abw, 1, "g")}</p>
                          <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{formatSampleAgeText(row.sample_age_days)}</p>
                        </div>
                        <div className="rounded-md bg-muted/45 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">SGR</p>
                          <p className="mt-0.5 font-semibold text-foreground">{formatPercent(row.sgr, 2, "%/day")}</p>
                        </div>
                        <div className="rounded-md bg-muted/45 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Feed kg</p>
                          <p className="mt-0.5 font-semibold text-foreground">{formatUnitValue(row.feed_total, 1, "kg")}</p>
                        </div>
                        <div className="rounded-md bg-muted/45 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Mortality</p>
                          <p className="mt-0.5 font-semibold text-foreground">{formatPercent(row.mortality_rate, 2)}</p>
                        </div>
                        <div className="rounded-md bg-muted/45 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Biomass</p>
                          <p className="mt-0.5 font-semibold text-foreground">{formatUnitValue(row.biomass_end, 1, "kg")}</p>
                        </div>
                        <div className="rounded-md bg-muted/45 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Density</p>
                          <p className="mt-0.5 font-semibold text-foreground">{formatUnitValue(row.biomass_density, 2, "kg/m3")}</p>
                        </div>
                        <div className="col-span-2 rounded-md bg-muted/45 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">WQ / Flags</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {showWaterQuality ? (
                              <span className="relative inline-flex">
                                <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${ratingToneClass(row.water_quality_rating_average)}`}>
                                  {waterQualityLabel(row.water_quality_rating_average)}
                                </span>
                                {thresholdFlag ? (
                                  <span
                                    title={thresholdFlag.title}
                                    aria-label={thresholdFlag.title}
                                    className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                                  >
                                    <TriangleAlert className="h-2.5 w-2.5" />
                                  </span>
                                ) : null}
                              </span>
                            ) : null}
                            {displayFlags.map((flag) => {
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
                            })}
                            {!showWaterQuality && displayFlags.length === 0 ? (
                              <span className="text-[11px] text-muted-foreground">-</span>
                            ) : null}
                          </div>
                          {worstParameterText ? <p className="mt-1 text-[11px] text-muted-foreground">{worstParameterText}</p> : null}
                        </div>
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
              <Table className="w-[1124px] min-w-[1124px] table-fixed">
                <colgroup>
                  <col className="w-[146px]" />
                  <col className="w-[94px]" />
                  <col className="w-[82px]" />
                  <col className="w-[94px]" />
                  <col className="w-[86px]" />
                  <col className="w-[90px]" />
                  <col className="w-[96px]" />
                  <col className="w-[96px]" />
                  <col className="w-[94px]" />
                  <col className="w-[152px]" />
                </colgroup>

                <TableHeader>
                  <TableRow className="border-b border-slate-200 bg-[#eef3f7] hover:bg-[#eef3f7]">
                    <TableHead className={borderedHeaderCellClass}>
                      {renderSortHead("Batch", "system_name")}
                    </TableHead>
                    <TableHead className={borderedHeaderCellClass}>
                      {renderSortHead("Fish count", "fish_end")}
                    </TableHead>
                    <TableHead className={borderedHeaderCellClass}>
                      {renderSortHead("eFCR", "efcr")}
                    </TableHead>
                    <TableHead className={borderedHeaderCellClass}>
                      {renderSortHead("ABW", "abw", "g")}
                    </TableHead>
                    <TableHead className={borderedHeaderCellClass}>
                      {renderSortHead("SGR", "sgr", "%/day")}
                    </TableHead>
                    <TableHead className={borderedHeaderCellClass}>
                      {renderSortHead("Feed", "feed_total", "kg")}
                    </TableHead>
                    <TableHead className={borderedHeaderCellClass}>
                      {renderSortHead("Mortality", "mortality_rate", "%")}
                    </TableHead>
                    <TableHead className={borderedHeaderCellClass}>
                      {renderSortHead("Biomass", "biomass_end", "kg")}
                    </TableHead>
                    <TableHead className={borderedHeaderCellClass}>
                      {renderSortHead("Density", "biomass_density", "kg/m³")}
                    </TableHead>
                    <TableHead className={headerCellClass}>{renderSortHead("WQ / Flags", "water_quality")}</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sortedSystems.length > 0 ? (
                    sortedSystems.map((row) => {
                      const cageLabel = formatCageLabel({ id: row.system_id, label: row.system_name, unit: null })
                      const title = row.batch_name ?? cageLabel
                      const subtitle = row.batch_name ? cageLabel : null
                      const flags = buildFlags(row)
                      const showWaterQuality = hasWaterQualityData(row.water_quality_rating_average)
                      const thresholdFlag = flags.find((flag) => flag.key === "wq-breach") ?? null
                      const displayFlags = showWaterQuality ? flags.filter((flag) => flag.key !== "wq-breach") : flags
                      const worstParameterText = formatWorstParameterText(row)

                      return (
                        <TableRow
                          key={row.system_id}
                          className="cursor-pointer border-b border-border/50 transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                          onClick={() => openSystemDetailPage(row.system_id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              openSystemDetailPage(row.system_id)
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <TableCell className="py-2 align-middle">
                            <div>
                              <p className="text-sm font-medium leading-5 text-foreground">{title}</p>
                              {subtitle ? <p className="mt-0.5 text-[10px] leading-3 text-muted-foreground">{subtitle}</p> : null}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 align-middle">{renderValueBlock(formatNumberValue(row.fish_end))}</TableCell>
                          <TableCell className="py-2 align-middle">
                            {renderValueBlock(formatNumberValue(row.efcr, { decimals: 2 }))}
                          </TableCell>
                          <TableCell className="py-2 align-middle" title={formatSampleAgeText(row.sample_age_days)}>
                            {renderValueBlock(formatMetricValue(row.abw, 1))}
                          </TableCell>
                          <TableCell className="py-2 align-middle">{renderValueBlock(formatPercent(row.sgr, 2, ""))}</TableCell>
                          <TableCell className="py-2 align-middle">{renderValueBlock(formatMetricValue(row.feed_total, 1))}</TableCell>
                          <TableCell className="py-2 align-middle">{renderValueBlock(formatPercent(row.mortality_rate, 2, ""))}</TableCell>
                          <TableCell className="py-2 align-middle">{renderValueBlock(formatMetricValue(row.biomass_end, 1))}</TableCell>
                          <TableCell className="py-2 align-middle">
                            {renderValueBlock(formatMetricValue(row.biomass_density, 2))}
                          </TableCell>
                          <TableCell className="py-2 align-middle">
                            <div className="flex flex-wrap items-center gap-1">
                              {showWaterQuality ? (
                                <span className="relative inline-flex">
                                  <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ratingToneClass(row.water_quality_rating_average)}`}>
                                    {waterQualityLabel(row.water_quality_rating_average)}
                                  </span>
                                  {thresholdFlag ? (
                                    <span
                                      title={thresholdFlag.title}
                                      aria-label={thresholdFlag.title}
                                      className="absolute -right-1 -top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                                    >
                                      <TriangleAlert className="h-2 w-2" />
                                    </span>
                                  ) : null}
                                </span>
                              ) : null}
                              {displayFlags.map((flag) => {
                                const Icon = flag.icon
                                return (
                                  <span
                                    key={flag.key}
                                    title={flag.title}
                                    aria-label={flag.title}
                                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${flag.className}`}
                                  >
                                    <Icon className="h-3 w-3" />
                                  </span>
                                )
                              })}
                              {!showWaterQuality && displayFlags.length === 0 ? (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              ) : null}
                              {worstParameterText ? (
                                <p className="mt-0.5 w-full text-[10px] leading-3 text-muted-foreground">{worstParameterText}</p>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
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

      </CardContent>
    </Card>
  )
}
