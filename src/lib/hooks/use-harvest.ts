"use client"

import { useInsertMutation } from "@/lib/hooks/use-insert-mutation"

export function useRecordHarvest() {
  return useInsertMutation({
    table: "fish_harvest",
    activityTableName: "fish_harvest",
    recentEntryKey: "harvest",
    buildOptimisticEntry: (payload) => {
      if (Array.isArray(payload)) return null
      return {
        id: `optimistic-${Date.now()}`,
        date: payload.date,
        system_id: payload.system_id,
        batch_id: payload.batch_id ?? null,
        number_of_fish_harvest: payload.number_of_fish_harvest ?? null,
        total_weight_harvest: payload.total_weight_harvest ?? null,
        type_of_harvest: payload.type_of_harvest ?? null,
        abw: payload.abw ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
    },
    invalidate: ["dashboard", "inventory", "production", "recent-activity", "recent-entries"],
    successMessage: "Harvest recorded.",
    errorMessage: "Failed to record harvest.",
  })
}
