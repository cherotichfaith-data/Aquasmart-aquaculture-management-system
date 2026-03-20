"use client"

import { useInsertMutation } from "@/lib/hooks/use-insert-mutation"

export function useRecordIncomingFeed() {
  return useInsertMutation({
    table: "feed_incoming",
    activityTableName: "feed_incoming",
    recentEntryKey: "incoming_feed",
    buildOptimisticEntry: (payload) => {
      if (Array.isArray(payload)) return null
      return {
        id: `optimistic-${Date.now()}`,
        date: payload.date,
        feed_type_id: payload.feed_type_id ?? null,
        feed_amount: payload.feed_amount ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
    },
    invalidate: ["dashboard", "inventory", "reports", "recent-activity", "recent-entries"],
    successMessage: "Incoming feed recorded.",
    errorMessage: "Failed to record incoming feed.",
  })
}
