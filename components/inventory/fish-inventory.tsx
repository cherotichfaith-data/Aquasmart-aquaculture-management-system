"use client"

import { useEffect, useState } from "react"
import type { Tables } from "@/lib/types/database"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { Button } from "@/components/ui/button"
import { useDailyFishInventory, useDailyFishInventoryCount, useLatestInventory } from "@/lib/hooks/use-inventory"

const PAGE_SIZE = 50

type InventoryCursor = {
  inventoryDate: string
}

export default function FishInventory({
  selectedBatch,
  selectedSystem,
  selectedStage,
}: {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | "nursing" | "grow_out"
}) {
  const { farmId } = useActiveFarm()
  const systemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
  const [pageIndex, setPageIndex] = useState(0)
  const [cursors, setCursors] = useState<Array<InventoryCursor | null>>([null])
  const currentCursor = cursors[pageIndex]

  useEffect(() => {
    setPageIndex(0)
    setCursors([null])
  }, [farmId, selectedSystem, selectedBatch, selectedStage])

  const inventoryQuery = useDailyFishInventory({
    farmId,
    systemId: Number.isFinite(systemId) ? systemId : undefined,
    limit: PAGE_SIZE,
    cursorDate: currentCursor?.inventoryDate,
    orderAsc: true,
  })
  const countQuery = useDailyFishInventoryCount({
    farmId,
    systemId: Number.isFinite(systemId) ? systemId : undefined,
  })
  const latestQuery = useLatestInventory({
    farmId,
    systemId: Number.isFinite(systemId) ? systemId : undefined,
  })

  const rows = inventoryQuery.data?.status === "success" ? inventoryQuery.data.data : []
  const loading = inventoryQuery.isLoading
  const latest =
    latestQuery.data?.status === "success"
      ? (latestQuery.data.data[0] as Tables<"api_daily_fish_inventory"> | undefined)
      : undefined
  const totalSnapshots = countQuery.data?.status === "success" ? countQuery.data.data : null

  const pageStart = rows.length > 0 ? pageIndex * PAGE_SIZE + 1 : 0
  const pageEnd = pageIndex * PAGE_SIZE + rows.length
  const lastRow = rows.length > 0 ? rows[rows.length - 1] : null
  const canCreateNextCursor = Boolean(lastRow?.inventory_date)
  const hasPrevious = pageIndex > 0
  const hasNext = canCreateNextCursor && rows.length === PAGE_SIZE && (typeof totalSnapshots !== "number" || pageEnd < totalSnapshots)

  const handlePrevious = () => {
    if (!hasPrevious) return
    setPageIndex((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    if (!hasNext || !lastRow?.inventory_date) return
    const nextCursor: InventoryCursor = {
      inventoryDate: lastRow.inventory_date,
    }
    setCursors((prev) => [...prev.slice(0, pageIndex + 1), nextCursor])
    setPageIndex((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Fish Count (Latest)</p>
          <p className="text-3xl font-bold">{latest?.number_of_fish ?? "--"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Biomass (Latest)</p>
          <p className="text-3xl font-bold">{latest?.biomass_last_sampling ?? "--"} kg</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Daily Mortality (Latest)</p>
          <p className="text-3xl font-bold text-destructive">{latest?.number_of_fish_mortality ?? "--"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Snapshots</p>
          <p className="text-3xl font-bold">{typeof totalSnapshots === "number" ? totalSnapshots : rows.length}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Inventory Snapshots</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">System</th>
                <th className="px-4 py-3 text-left font-semibold">Stage</th>
                <th className="px-4 py-3 text-left font-semibold">Fish Count</th>
                <th className="px-4 py-3 text-left font-semibold">Biomass (kg)</th>
                <th className="px-4 py-3 text-left font-semibold">ABW</th>
                <th className="px-4 py-3 text-left font-semibold">Mortality</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={`${row.system_id}-${row.inventory_date}`} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{row.inventory_date}</td>
                    <td className="px-4 py-3">{row.system_name ?? row.system_id}</td>
                    <td className="px-4 py-3">-</td>
                    <td className="px-4 py-3">{row.number_of_fish ?? "-"}</td>
                    <td className="px-4 py-3">{row.biomass_last_sampling ?? "-"}</td>
                    <td className="px-4 py-3">{row.abw_last_sampling ?? "-"}</td>
                    <td className="px-4 py-3">{row.number_of_fish_mortality ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No inventory snapshots found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {typeof totalSnapshots === "number" ? `Showing ${pageStart}-${pageEnd} of ${totalSnapshots}` : `Showing ${pageStart}-${pageEnd}`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevious} disabled={loading || !hasPrevious}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext} disabled={loading || !hasNext}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
