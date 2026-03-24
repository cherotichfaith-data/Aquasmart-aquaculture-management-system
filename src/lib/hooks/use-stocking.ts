"use client"

import { useInsertMutation } from "@/lib/hooks/use-insert-mutation"

export function useRecordStocking() {
  return useInsertMutation({
    table: "fish_stocking",
    activityTableName: "fish_stocking",
    recentEntryKey: "stocking",
    buildOptimisticEntry: (payload) => {
      const entry = (Array.isArray(payload) ? payload[0] : payload) as
        | {
            date?: string
            system_id?: number
            batch_id?: number | null
            number_of_fish_stocking?: number | null
            total_weight_stocking?: number | null
            notes?: string | null
            type_of_stocking?: string | null
            abw?: number | null
          }
        | undefined
      if (entry) {
        return {
          id: `optimistic-${Date.now()}`,
          date: entry.date,
          system_id: entry.system_id,
          batch_id: entry.batch_id ?? null,
          number_of_fish_stocking: entry.number_of_fish_stocking ?? null,
          total_weight_stocking: entry.total_weight_stocking ?? null,
          notes: entry.notes ?? null,
          type_of_stocking: entry.type_of_stocking ?? null,
          abw: entry.abw ?? null,
          created_at: new Date().toISOString(),
          status: "pending",
        }
      }
      return null
    },
    invalidate: ["dashboard", "inventory", "recent-activity", "recent-entries"],
    successMessage: "Stocking recorded.",
    errorMessage: "Failed to record stocking.",
  })
}
