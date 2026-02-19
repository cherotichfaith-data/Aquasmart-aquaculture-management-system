"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Enums } from "@/lib/types/database"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null)

  const handleRowClick = (systemId: number) => {
    if (!Number.isFinite(systemId)) return
    setSelectedSystemId(systemId)
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
  const selectedSystem = systems.find((system) => system.system_id === selectedSystemId) ?? null
  const selectedAsOf = formatAsOfDate(selectedSystem?.as_of_date ?? selectedSystem?.input_end_date)
  const selectedFlags = selectedSystem
    ? [
        (selectedSystem.missing_days_count ?? 0) > 0 ? `Missing ${selectedSystem.missing_days_count} day(s)` : null,
        (selectedSystem.sample_age_days ?? 0) > 14 ? `Sampling ${selectedSystem.sample_age_days} day(s) old` : null,
        selectedSystem.water_quality_rating_average === "critical" ||
        selectedSystem.water_quality_rating_average === "lethal"
          ? `Water quality ${selectedSystem.water_quality_rating_average}`
          : null,
      ].filter(Boolean)
    : []

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
        <h2 className="text-base font-semibold text-foreground">Production</h2>
        <p className="mt-2 text-xs text-muted-foreground">{systems.length} systems tracked</p>
        {debugReason ? (
          <p className="mt-2 text-[11px] text-chart-4">
            Debug: {debugReason}{debugError ? ` (${debugError})` : ""}
          </p>
        ) : null}
      </div>
      <div className="max-h-[60vh] overflow-auto rounded-md border border-border/80">
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
      <Sheet open={selectedSystemId !== null} onOpenChange={(open) => !open && setSelectedSystemId(null)}>
        <SheetContent className="w-full sm:max-w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedSystem?.system_name || `System ${selectedSystem?.system_id ?? ""}`}</SheetTitle>
            <SheetDescription>
              {selectedAsOf ? `As of ${selectedAsOf}` : "Operational detail and suggested next actions."}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Biomass</dt>
                  <dd className="font-semibold">{formatWithUnit(selectedSystem?.biomass_end, 1, "kg")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">eFCR</dt>
                  <dd className="font-semibold">{formatNumber(selectedSystem?.efcr, 2)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">ABW</dt>
                  <dd className="font-semibold">{formatWithUnit(selectedSystem?.abw, 1, "g")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mortality</dt>
                  <dd className="font-semibold">{formatRate(selectedSystem?.mortality_rate, 4, "rate/day")}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-md border border-border bg-muted/20 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flags / Exceptions</h3>
              {selectedFlags.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {selectedFlags.map((flag) => (
                    <li key={String(flag)} className="flex items-start gap-2 text-sm">
                      <TriangleAlert className="mt-0.5 h-4 w-4 text-chart-4" />
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No current exceptions.</p>
              )}
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" className="cursor-pointer" onClick={() => setSelectedSystemId(null)}>
              Acknowledge
            </Button>
            <Button className="cursor-pointer" onClick={() => router.push("/data-entry")}>
              Add Record
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
