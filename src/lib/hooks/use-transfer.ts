"use client"

import { invalidateInventoryWriteQueries } from "@/lib/cache/react-query"
import { recordTransfer } from "@/lib/commands/operations"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"

export function useRecordTransfer() {
  return useWriteThroughMutation({
    mutationFn: recordTransfer,
    activityTableName: "fish_transfer",
    recentEntryKey: "transfer",
    buildOptimisticEntry: (payload) => {
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
    invalidate: async ({ queryClient, result }) =>
      invalidateInventoryWriteQueries(queryClient, {
        farmId: result.meta.farmId,
        date: result.meta.date,
        tableName: "fish_transfer",
        includeProductionQueries: true,
      }),
    successMessage: "Transfer recorded.",
    errorMessage: "Failed to record transfer.",
  })
}
