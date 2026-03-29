"use client"

import { useInsertMutation } from "@/lib/hooks/use-insert-mutation"

export function useRecordSampling() {
  return useInsertMutation({
    table: "fish_sampling_weight",
    activityTableName: "fish_sampling_weight",
    recentEntryKey: "sampling",
    buildOptimisticEntry: (payload) => {
      if (Array.isArray(payload)) return null
      return {
        id: `optimistic-${Date.now()}`,
        date: payload.date,
        system_id: payload.system_id,
        batch_id: payload.batch_id ?? null,
        number_of_fish_sampling: payload.number_of_fish_sampling ?? null,
        total_weight_sampling: payload.total_weight_sampling ?? null,
        abw: payload.abw ?? null,
        notes: payload.notes ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
    },
    invalidate: ["dashboard", "inventory", "production", "recent-activity", "recent-entries"],
    successMessage: "Sampling event recorded.",
    errorMessage: "Failed to record sampling.",
  })
}
