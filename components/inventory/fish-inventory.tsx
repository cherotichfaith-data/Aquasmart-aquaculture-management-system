"use client"

import { useEffect, useState } from "react"
import type { Tables } from "@/lib/types/database"
import { fetchProductionSummary } from "@/lib/supabase-queries"

export default function FishInventory({
  selectedBatch,
  selectedSystem,
  selectedStage,
}: {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | "nursing" | "grow_out"
}) {
  const [rows, setRows] = useState<Tables<"production_summary">[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadInventory = async () => {
      setLoading(true)
      const systemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
      const result = await fetchProductionSummary({
        limit: 50,
        system_id: Number.isFinite(systemId) ? systemId : undefined,
        growth_stage: selectedStage === "all" ? undefined : selectedStage,
      })
      setRows(result.status === "success" ? result.data : [])
      setLoading(false)
    }
    loadInventory()
  }, [selectedBatch, selectedStage, selectedSystem])

  const latest = rows[0]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Fish Count (Latest)</p>
          <p className="text-3xl font-bold">{latest?.number_of_fish_inventory ?? "--"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Biomass (Latest)</p>
          <p className="text-3xl font-bold">{latest?.total_biomass ?? "--"} kg</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Daily Mortality (Latest)</p>
          <p className="text-3xl font-bold text-destructive">{latest?.daily_mortality_count ?? "--"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Snapshots</p>
          <p className="text-3xl font-bold">{rows.length}</p>
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
                  <tr key={`${row.system_id}-${row.date}`} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{row.date}</td>
                    <td className="px-4 py-3">{row.system_name ?? row.system_id}</td>
                    <td className="px-4 py-3">{row.growth_stage ?? "-"}</td>
                    <td className="px-4 py-3">{row.number_of_fish_inventory ?? "-"}</td>
                    <td className="px-4 py-3">{row.total_biomass ?? "-"}</td>
                    <td className="px-4 py-3">{row.average_body_weight ?? "-"}</td>
                    <td className="px-4 py-3">{row.daily_mortality_count ?? "-"}</td>
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
      </div>
    </div>
  )
}
