"use client"

import { useHarvests } from "@/lib/hooks/use-reports"

export default function ReconciliationReport({
  selectedBatch,
  selectedSystem,
  selectedStage,
}: {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | "nursing" | "grow_out"
}) {
  const systemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
  const batchId = selectedBatch !== "all" ? Number(selectedBatch) : undefined
  const harvestsQuery = useHarvests({
    limit: 50,
    systemId: Number.isFinite(systemId) ? systemId : undefined,
    batchId: Number.isFinite(batchId) ? batchId : undefined,
  })

  const harvests = harvestsQuery.data?.status === "success" ? harvestsQuery.data.data : []
  const loading = harvestsQuery.isLoading

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Harvest Events</p>
          <p className="text-3xl font-bold">{harvests.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Latest Harvest</p>
          <p className="text-3xl font-bold">{harvests[0]?.date ?? "N/A"}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Harvest Records</h3>
          <p className="text-xs text-muted-foreground mt-1">Source: fish_harvest table</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">System</th>
                <th className="px-4 py-3 text-left font-semibold">Batch</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Fish Count</th>
                <th className="px-4 py-3 text-left font-semibold">Total Weight (kg)</th>
                <th className="px-4 py-3 text-left font-semibold">ABW</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : harvests.length > 0 ? (
                harvests.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{row.date}</td>
                    <td className="px-4 py-3">{row.system_id}</td>
                    <td className="px-4 py-3">{row.batch_id ?? "-"}</td>
                    <td className="px-4 py-3">{row.type_of_harvest}</td>
                    <td className="px-4 py-3">{row.number_of_fish_harvest}</td>
                    <td className="px-4 py-3">{row.total_weight_harvest}</td>
                    <td className="px-4 py-3">{row.abw}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No harvest records found
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
