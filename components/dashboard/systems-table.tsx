"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Enums } from "@/lib/types/database"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useSystemsTable } from "@/lib/hooks/use-dashboard"

interface SystemsTableProps {
  stage: Enums<"system_growth_stage"> | "all"
  batch?: string
  system?: string
  timePeriod?: Enums<"time_period">
  periodParam?: string | null
}

const PAGE_SIZE = 8

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
}: SystemsTableProps) {
  const router = useRouter()
  const { farmId } = useActiveFarm()
  const [pageIndex, setPageIndex] = useState(0)

  const handleRowClick = (systemId: number, startDate: string, endDate: string) => {
    if (!Number.isFinite(systemId)) return
    const params = new URLSearchParams({
      system: String(systemId),
      startDate,
      endDate,
    })
    router.push(`/production?${params.toString()}`)
  }

  useEffect(() => {
    setPageIndex(0)
  }, [batch, farmId, stage, system, timePeriod, periodParam])

  const systemsQuery = useSystemsTable({
    farmId,
    stage,
    batch,
    system,
    timePeriod,
    periodParam,
  })

  const systems = systemsQuery.data?.rows ?? []
  const meta = systemsQuery.data?.meta
  const loading = systemsQuery.isLoading
  const debugReason =
    meta && "reason" in meta && typeof meta.reason === "string" ? meta.reason : null
  const debugError =
    meta && "error" in meta && typeof meta.error === "string" ? meta.error : null

  const totalRows = systems.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const currentPage = Math.min(pageIndex, totalPages - 1)
  const startIndex = currentPage * PAGE_SIZE
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRows)
  const pagedSystems = systems.slice(startIndex, endIndex)
  const showPagination = totalRows > PAGE_SIZE

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Production</h2>
            <p className="text-xs text-slate-500">Loading systems...</p>
          </div>
          <span className="text-xs text-slate-400">Loading</span>
        </div>
        <div className="h-[240px] rounded-md border border-dashed border-slate-200 bg-slate-50/60" />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-900">Production</h2>
        <p className="text-xs text-slate-500 mt-2">{systems.length} systems tracked</p>
        {debugReason ? (
          <p className="mt-2 text-[11px] text-amber-600">
            Debug: {debugReason}{debugError ? ` (${debugError})` : ""}
          </p>
        ) : null}
      </div>
      <div className="max-h-[60vh] overflow-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                System
              </TableHead>
              <TableHead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 text-right">
                Fish
              </TableHead>
              <TableHead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 text-right">
                Biomass
              </TableHead>
              <TableHead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 text-right">
                Feed
              </TableHead>
              <TableHead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 text-right">
                eFCR
              </TableHead>
              <TableHead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 text-right">
                ABW
              </TableHead>
              <TableHead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 text-right hidden lg:table-cell">
                Feeding
              </TableHead>
              <TableHead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 text-right hidden lg:table-cell">
                Mortality
              </TableHead>
              <TableHead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 text-right hidden xl:table-cell">
                Density
              </TableHead>
              <TableHead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 text-right hidden xl:table-cell">
                Water Quality
              </TableHead>
              <TableHead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 hidden 2xl:table-cell">
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
                    className="cursor-pointer hover:bg-slate-50/70"
                    onClick={() => handleRowClick(system.system_id, system.input_start_date || "", system.input_end_date || "")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        handleRowClick(system.system_id, system.input_start_date || "", system.input_end_date || "")
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#4C7DFF]" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{system.system_name || system.system_id}</p>
                          <p className="text-[11px] text-slate-500">
                            As of {asOf ?? "N/A"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-900">{formatNumber(system.fish_end, 0)}</TableCell>
                    <TableCell className="text-right text-sm text-slate-900">{formatWithUnit(system.biomass_end, 1, "kg")}</TableCell>
                    <TableCell className="text-right text-sm text-slate-900">{formatWithUnit(system.feed_total, 1, "kg")}</TableCell>
                    <TableCell className="text-right text-sm text-slate-900">{formatNumber(system.efcr, 2)}</TableCell>
                    <TableCell className="text-right text-sm text-slate-900">{formatWithUnit(system.abw, 1, "g")}</TableCell>
                    <TableCell className="text-right text-sm text-slate-900 hidden lg:table-cell">
                      {formatWithUnit(system.feeding_rate, 2, "kg/t")}
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-900 hidden lg:table-cell">
                      {formatRate(system.mortality_rate, 4, "rate/day")}
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-900 hidden xl:table-cell">
                      {formatNumber(system.biomass_density, 2)}
                    </TableCell>
                    <TableCell className="text-right hidden xl:table-cell">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${
                        system.water_quality_rating_average === "optimal" ? "bg-emerald-50 text-emerald-600" :
                        system.water_quality_rating_average === "acceptable" ? "bg-blue-50 text-blue-600" :
                        system.water_quality_rating_average === "critical" ? "bg-amber-50 text-amber-600" :
                        "bg-red-50 text-red-600"
                      }`}>
                        {system.water_quality_rating_average || "Unknown"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell">
                      {flags.length ? (
                        <div className="flex flex-wrap gap-1">
                          {flags.map((flag) => (
                            <span key={flag} className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                              {flag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">None</span>
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
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
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
    </div>
  )
}
