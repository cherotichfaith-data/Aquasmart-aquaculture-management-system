"use client"

import { invalidateInventoryWriteQueries } from "@/lib/cache/react-query"
import { recordHarvest } from "@/lib/commands/operations"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"

export function useRecordHarvest() {
  return useWriteThroughMutation({
    mutationFn: recordHarvest,
    activityTableName: "fish_harvest",
    recentEntryKey: "harvest",
    buildOptimisticEntry: (payload) => {
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
    invalidate: async ({ queryClient, result }) =>
      invalidateInventoryWriteQueries(queryClient, {
        farmId: result.meta.farmId,
        date: result.meta.date,
        tableName: "fish_harvest",
        includeProductionQueries: true,
      }),
    successMessage: "Harvest recorded.",
    errorMessage: "Failed to record harvest.",
  })
}
