"use client"

import { useInsertMutation } from "@/lib/hooks/use-insert-mutation"

export function useRecordTransfer() {
  return useInsertMutation({
    table: "fish_transfer",
    activityTableName: "fish_transfer",
    recentEntryKey: "transfer",
    buildOptimisticEntry: (payload) => {
      if (Array.isArray(payload)) return null
      return {
        id: `optimistic-${Date.now()}`,
        date: payload.date,
        origin_system_id: payload.origin_system_id,
        target_system_id: payload.target_system_id,
        external_target_name: payload.external_target_name ?? null,
        transfer_type: payload.transfer_type ?? "transfer",
        batch_id: payload.batch_id ?? null,
        number_of_fish_transfer: payload.number_of_fish_transfer ?? null,
        total_weight_transfer: payload.total_weight_transfer ?? null,
        abw: payload.abw ?? null,
        notes: payload.notes ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
    },
    invalidate: ["dashboard", "inventory", "recent-activity", "recent-entries"],
    successMessage: "Transfer recorded.",
    errorMessage: "Failed to record transfer.",
  })
}
