"use client"

import { invalidateInventoryWriteQueries } from "@/lib/cache/react-query"
import type { HarvestInput } from "@/lib/commands/operations"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"
import { buildOfflinePendingResult } from "@/lib/offline/pending-result"
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation"
import type { Tables } from "@/lib/types/database"

export function useRecordHarvest() {
  const { farmId } = useActiveFarm()

  const offlineMutation = useOfflineMutation<
    HarvestInput,
    {
      systemId: number
      batchId?: number | null
      date: string
      numberOfFishHarvest: number
      totalWeightHarvest: number
      abw: number
      typeOfHarvest: HarvestInput["type_of_harvest"]
    },
    {
      data: Tables<"fish_harvest">
      meta: { farmId: string; systemId: number | null; date: string; pendingSync?: boolean; localIds?: string[] }
    }
  >({
    tableName: "harvest",
    buildRecords: (payload) => [
      {
        systemId: payload.system_id,
        batchId: payload.batch_id ?? null,
        date: payload.date,
        numberOfFishHarvest: payload.number_of_fish_harvest,
        totalWeightHarvest: payload.total_weight_harvest,
        abw: payload.abw,
        typeOfHarvest: payload.type_of_harvest,
      },
    ],
    buildPendingResult: ({ input, localIds }) =>
      buildOfflinePendingResult({
        data: { id: 0 } as Tables<"fish_harvest">,
        farmId,
        systemId: input.system_id,
        date: input.date,
        localIds,
      }),
  })

  return useWriteThroughMutation({
    mutationFn: offlineMutation.mutate,
    activityTableName: "fish_harvest",
    recentEntryKey: "harvest",
    buildOptimisticEntry: (payload) => ({
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
    }),
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
