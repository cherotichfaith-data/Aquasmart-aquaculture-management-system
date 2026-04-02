"use client"

import { invalidateInventoryWriteQueries } from "@/lib/cache/react-query"
import { recordStocking } from "@/lib/commands/operations"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"

export function useRecordStocking() {
  return useWriteThroughMutation({
    mutationFn: recordStocking,
    activityTableName: "fish_stocking",
    recentEntryKey: "stocking",
    buildOptimisticEntry: (payload) => {
      return {
        id: `optimistic-${Date.now()}`,
        date: payload.date,
        system_id: payload.system_id,
        batch_id: payload.batch_id ?? null,
        number_of_fish_stocking: payload.number_of_fish_stocking ?? null,
        total_weight_stocking: payload.total_weight_stocking ?? null,
        notes: payload.notes ?? null,
        type_of_stocking: payload.type_of_stocking ?? null,
        abw: payload.abw ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
    },
    invalidate: async ({ queryClient, result }) =>
      invalidateInventoryWriteQueries(queryClient, {
        farmId: result.meta.farmId,
        date: result.meta.date,
        tableName: "fish_stocking",
        includeProductionQueries: true,
      }),
    successMessage: "Stocking recorded.",
    errorMessage: "Failed to record stocking.",
  })
}
