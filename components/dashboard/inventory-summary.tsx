"use client"

import { useEffect, useMemo, useState } from "react"
import { fetchFeedData } from "@/lib/supabase-queries"

type InventoryItem = {
  name: string
  amount: number
}

const formatKg = (value: number) => `${value.toFixed(1)} kg`

export default function InventorySummary() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      const result = await fetchFeedData({ limit: 50 })
      if (!isMounted) return

      const totals = new Map<string, number>()
      if (result.status === "success") {
        result.data.forEach((row) => {
          const name = row.feed_type?.name || "Unassigned"
          totals.set(name, (totals.get(name) ?? 0) + (row.feed_amount ?? 0))
        })
      }

      const list = Array.from(totals.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3)

      setItems(list)
      setLoading(false)
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  const maxAmount = useMemo(() => {
    if (!items.length) return 1
    return Math.max(...items.map((item) => item.amount), 1)
  }, [items])

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Inventory</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Alerts only</span>
          <button type="button" role="switch" aria-checked="false" className="w-9 h-5 rounded-full bg-muted relative">
            <span className="absolute left-1 top-1 h-3 w-3 rounded-full bg-card shadow-sm" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 space-y-4">
          <div className="h-12 rounded-xl bg-muted/40 animate-pulse" />
          <div className="h-12 rounded-xl bg-muted/40 animate-pulse" />
        </div>
      ) : items.length ? (
        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <div key={item.name} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{item.name}</span>
                <span className="text-xs text-muted-foreground">{formatKg(item.amount)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted/70">
                <span
                  className="block h-2 rounded-full bg-rose-500"
                  style={{ width: `${Math.max((item.amount / maxAmount) * 100, 10)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 text-sm text-muted-foreground">No inventory data available.</div>
      )}
    </div>
  )
}
