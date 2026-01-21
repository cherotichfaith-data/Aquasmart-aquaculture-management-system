"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Enums } from "@/lib/types/database"
import { fetchSystems } from "@/lib/supabase-queries"
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

  const toMetricsPeriod = (period: Enums<"time_period">) => {
    const map: Record<Enums<"time_period">, "7d" | "30d" | "90d" | "180d" | "365d"> = {
      day: "7d",
      week: "7d",
      "2 weeks": "30d",
      month: "30d",
      quarter: "90d",
      "6 months": "180d",
      year: "365d",
    }
    return map[period] ?? "30d"
  }

  const handleRowClick = (systemId: number) => {
    if (!Number.isFinite(systemId)) return
    const params = new URLSearchParams({
      system: String(systemId),
      period: toMetricsPeriod(timePeriod),
    })
    router.push(`/production?${params.toString()}`)
  }

  useEffect(() => {
    const loadSystems = async () => {
      setLoading(true)
      setPageIndex(0)
      const systemId = system !== "all" ? Number(system) : undefined
      const result = await fetchSystems({
        growth_stage: stage,
        system_id: Number.isFinite(systemId) ? systemId : undefined,
        ongoing_cycle: true,
      })
      const rows = result.status === "success" ? result.data : []
      const latestBySystem = new Map<number, any>()

      rows.forEach((row) => {
        const id = row.system_id
        if (!Number.isFinite(id)) return
        if (!latestBySystem.has(id)) {
          latestBySystem.set(id, row)
        }
      })

      const latestSystems = Array.from(latestBySystem.values()).sort((a, b) => {
        const nameA = String(a.system_name ?? a.system_id ?? "")
        const nameB = String(b.system_name ?? b.system_id ?? "")
        return nameA.localeCompare(nameB)
      })

      setSystems(latestSystems)
      setLoading(false)
    }
    loadSystems()
  }, [stage, batch, system])

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
        <p className="text-sm text-muted-foreground">{systems.length} systems tracked</p>
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
                Feed
              </TableHead>
              <TableHead className="sticky top-0 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground text-right hidden lg:table-cell">
                Mortality
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
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{system.system_name || system.system_id}</p>
                        {system.date ? <p className="text-[11px] text-muted-foreground">{system.date}</p> : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(system.efcr_period, 2)}</TableCell>
                  <TableCell className="text-right">{formatWithUnit(system.average_body_weight, 1, "g")}</TableCell>
                  <TableCell className="text-right hidden lg:table-cell">
                    {formatWithUnit(system.total_feed_amount_period, 1, "kg")}
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell">
                    {formatNumber(system.daily_mortality_count, 0)}
                  </TableCell>
                  <TableCell className="text-right hidden xl:table-cell">
                    {formatNumber(system.biomass_density, 2)}
                  </TableCell>
                  <TableCell className="text-right hidden xl:table-cell">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-600 px-2 py-1 text-[11px] font-semibold">
                      Good
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
