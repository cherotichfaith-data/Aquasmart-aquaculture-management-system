"use client"

import { useInsertMutation } from "@/lib/hooks/use-insert-mutation"

export function useRecordFeeding() {
  return useInsertMutation({
    table: "feeding_record",
    activityTableName: "feeding_record",
    recentEntryKey: "feeding",
    buildOptimisticEntry: (payload) => {
      if (Array.isArray(payload)) return null
      return {
        id: `optimistic-${Date.now()}`,
        date: payload.date,
        system_id: payload.system_id,
        batch_id: payload.batch_id ?? null,
        feed_type_id: payload.feed_type_id ?? null,
        feeding_amount: payload.feeding_amount ?? null,
        feeding_response: payload.feeding_response ?? null,
        notes: payload.notes ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
    },
    invalidate: ["dashboard", "inventory", "recent-activity", "recent-entries"],
    successMessage: "Feeding event recorded.",
    errorMessage: "Failed to record feeding event.",
  })
}
