"use client"

import { invalidateInventoryWriteQueries } from "@/lib/cache/react-query"
import { recordSampling } from "@/lib/commands/operations"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"

export function useRecordSampling() {
  return useWriteThroughMutation({
    mutationFn: recordSampling,
    activityTableName: "fish_sampling_weight",
    recentEntryKey: "sampling",
    buildOptimisticEntry: (payload) => {
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
    invalidate: async ({ queryClient, result }) =>
      invalidateInventoryWriteQueries(queryClient, {
        farmId: result.meta.farmId,
        date: result.meta.date,
        tableName: "fish_sampling_weight",
        includeProductionQueries: true,
      }),
    successMessage: "Sampling event recorded.",
    errorMessage: "Failed to record sampling.",
  })
}
