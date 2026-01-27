"use client"

import { useEffect, useState } from "react"
import { fetchFeedData } from "@/lib/supabase-queries"

export default function InventorySummary() {
  const [items, setItems] = useState<Array<{ id: number; name: string; amount: number | null }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      const incomingResult = await fetchFeedData({ limit: 10 })
      if (!isMounted) return
      if (incomingResult.status === "success") {
        const list = incomingResult.data.map((row) => ({
          id: row.id,
          name: row.feed_type?.feed_line || row.feed_type?.feed_category || `Feed ${row.feed_type_id ?? "N/A"}`,
          amount: row.feed_amount ?? null,
        }))
        setItems(list)
      } else {
        setItems([])
      }
      setLoading(false)
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent Feed Deliveries</h2>
      </div>

      {loading ? (
        <div className="mt-4 space-y-4">
          <div className="h-12 rounded-xl bg-muted/40 animate-pulse" />
          <div className="h-12 rounded-xl bg-muted/40 animate-pulse" />
        </div>
      ) : items.length ? (
        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.amount ?? "--"} kg</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 text-sm text-muted-foreground">No recent deliveries available.</div>
      )}
    </div>
  )
}
