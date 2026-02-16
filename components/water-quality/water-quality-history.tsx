"use client"

import { useWaterQualityRatings } from "@/lib/hooks/use-water-quality"
import { useActiveFarm } from "@/hooks/use-active-farm"

export default function WaterQualityHistory() {
  const { farmId } = useActiveFarm()
  const historyQuery = useWaterQualityRatings({ limit: 120, farmId })

  const history =
    historyQuery.data?.status === "success" ? historyQuery.data.data.slice(0, 20) : []
  const loading = historyQuery.isLoading

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Recent Measurements</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">System</th>
              <th className="px-4 py-3 text-left font-semibold">Rating</th>
              <th className="px-4 py-3 text-left font-semibold">Score</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : history.length > 0 ? (
              history.map((row) => (
                <tr key={`${row.system_id ?? "farm"}-${row.rating_date ?? "unknown"}`} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{row.rating_date ?? "--"}</td>
                  <td className="px-4 py-3">{row.system_id ?? "Farm"}</td>
                  <td className="px-4 py-3">{row.rating ?? "--"}</td>
                  <td className="px-4 py-3">{row.rating_numeric ?? "--"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No measurements found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
