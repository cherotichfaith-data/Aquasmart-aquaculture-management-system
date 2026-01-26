"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Enums } from "@/lib/types/database"
import { fetchSystemsDashboard } from "@/lib/supabase-queries"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface SystemsTableProps {
  stage: Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: Enums<"time_period">
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

const formatPercent = (value: number | null | undefined, decimals = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--"
  const scaled = value * 100
  if (!Number.isFinite(scaled)) return "--"
  return `${scaled.toLocaleString(undefined, { maximumFractionDigits: decimals })} %`
}

export default function SystemsTable({
  stage,
  batch = "all",
  system = "all",
  timePeriod = "week",
}: SystemsTableProps) {
  const router = useRouter()
  const [systems, setSystems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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
    const loadSystems = async () => {
      setLoading(true)
      setPageIndex(0)
      const systemId = system !== "all" ? Number(system) : undefined
      
      // Fetch all dashboard data for the selected time period and stage
      const result = await fetchSystemsDashboard({
        growth_stage: stage,
        system_id: Number.isFinite(systemId) ? systemId : undefined,
        time_period: timePeriod,
      })
      
      const dashboardRows = result.status === "success" ? result.data : []
      
      // Group by system and get the latest/only record per system for this time period
      const systemsMap = new Map<number, any>()
      dashboardRows.forEach((row) => {
        if (row.system_id && !systemsMap.has(row.system_id)) {
          systemsMap.set(row.system_id, row)
        }
      })

      const systemsList = Array.from(systemsMap.values()).sort((a, b) => {
        const nameA = String(a.system_name ?? a.system_id ?? "")
        const nameB = String(b.system_name ?? b.system_id ?? "")
        return nameA.localeCompare(nameB)
      })

      setSystems(systemsList)
      setLoading(false)
    }
    loadSystems()
  }, [stage, batch, system, timePeriod])

  const totalRows = systems.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const currentPage = Math.min(pageIndex, totalPages - 1)
  const startIndex = currentPage * PAGE_SIZE
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRows)
  const pagedSystems = systems.slice(startIndex, endIndex)
  const showPagination = totalRows > PAGE_SIZE

  if (loading) {
    return (
      <div className="rounded-md border bg-card p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Production</h2>
            <p className="text-sm text-muted-foreground">Loading systems...</p>
          </div>
          <span className="text-xs text-muted-foreground">Loading</span>
        </div>
        <div className="h-[240px] rounded-md border border-dashed border-border/70 bg-muted/20" />
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-card p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Production</h2>
        <p className="text-sm text-muted-foreground mt-2">{systems.length} systems tracked</p>
      </div>
      <div className="max-h-[60vh] overflow-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                System
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground text-right">
                eFCR
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground text-right">
                ABW
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground text-right hidden lg:table-cell">
                Feeding Rate
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground text-right hidden lg:table-cell">
                Mortality Rate
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground text-right hidden xl:table-cell">
                Density
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground text-right hidden xl:table-cell">
                Water Quality
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedSystems.length > 0 ? (
              pagedSystems.map((system, i) => (
                <TableRow
                  key={i}
                  className="cursor-pointer"
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
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{system.system_name || system.system_id}</p>
                        {system.sampling_end_date ? <p className="text-[11px] text-muted-foreground">{system.sampling_end_date}</p> : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(system.efcr, 2)}</TableCell>
                  <TableCell className="text-right">{formatWithUnit(system.abw, 1, "g")}</TableCell>
                  <TableCell className="text-right hidden lg:table-cell">
                    {formatWithUnit(system.feeding_rate, 2, "kg/t")}
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell">
                    {formatPercent(system.mortality_rate, 2)}
                  </TableCell>
                  <TableCell className="text-right hidden xl:table-cell">
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
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No systems found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {showPagination ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
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
