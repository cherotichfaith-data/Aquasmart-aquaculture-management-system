"use client"

import { useEffect, useState } from "react"
import type { Tables } from "@/lib/types/database"
import { fetchFeedData, fetchFeedTypes, type FeedIncomingWithType } from "@/lib/supabase-queries"

export default function FeedInventory({
  selectedBatch,
  selectedSystem,
  selectedStage,
}: {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | "nursing" | "grow_out"
}) {
  const [feedData, setFeedData] = useState<FeedIncomingWithType[]>([])
  const [feedTypes, setFeedTypes] = useState<Tables<"feed_type">[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFeed = async () => {
      setLoading(true)
      const [incomingResult, typesResult] = await Promise.all([fetchFeedData(), fetchFeedTypes()])
      setFeedData(incomingResult.status === "success" ? incomingResult.data : [])
      setFeedTypes(typesResult.status === "success" ? typesResult.data : [])
      setLoading(false)
    }
    loadFeed()
  }, [selectedBatch, selectedSystem, selectedStage])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Feed Types</p>
          <p className="text-3xl font-bold">{feedTypes.length}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Incoming Feed Shipments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-3 text-left font-semibold">Feed Type</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Protein %</th>
                <th className="px-4 py-3 text-left font-semibold">Pellet Size</th>
                <th className="px-4 py-3 text-left font-semibold">Amount (kg)</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : feedData.length > 0 ? (
                feedData.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {row.feed_type?.feed_line ?? `Feed ${row.feed_type_id ?? "N/A"}`}
                    </td>
                    <td className="px-4 py-3">{row.feed_type?.feed_category ?? "-"}</td>
                    <td className="px-4 py-3">{row.feed_type?.crude_protein_percentage ?? "-"}</td>
                    <td className="px-4 py-3">{row.feed_type?.feed_pellet_size ?? "-"}</td>
                    <td className="px-4 py-3">{row.feed_amount}</td>
                    <td className="px-4 py-3">{row.date}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    No feed shipments found
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
