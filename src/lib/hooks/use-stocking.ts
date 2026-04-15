"use client"

import { invalidateInventoryWriteQueries } from "@/lib/cache/react-query"
import type { StockingInput } from "@/lib/commands/operations"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"
import { buildOfflinePendingResult } from "@/lib/offline/pending-result"
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation"
import type { Tables } from "@/lib/types/database"

export function useRecordStocking() {
  const { farmId } = useActiveFarm()

  const offlineMutation = useOfflineMutation<
    StockingInput,
    {
      systemId: number
      batchId: number
      date: string
      numberOfFishStocking: number
      totalWeightStocking: number
      notes?: string | null
      typeOfStocking: StockingInput["type_of_stocking"]
      abw: number
    },
    {
      data: Tables<"fish_stocking">
      meta: { farmId: string; systemId: number | null; date: string; pendingSync?: boolean; localIds?: string[] }
    }
  >({
    tableName: "stocking",
    buildRecords: (payload) => [
      {
        systemId: payload.system_id,
        batchId: payload.batch_id,
        date: payload.date,
        numberOfFishStocking: payload.number_of_fish_stocking,
        totalWeightStocking: payload.total_weight_stocking,
        notes: payload.notes ?? null,
        typeOfStocking: payload.type_of_stocking,
        abw: payload.abw,
      },
    ],
    buildPendingResult: ({ input, localIds }) =>
      buildOfflinePendingResult({
        data: { id: 0 } as Tables<"fish_stocking">,
        farmId,
        systemId: input.system_id,
        date: input.date,
        localIds,
      }),
  })

  return useWriteThroughMutation({
    mutationFn: offlineMutation.mutate,
    activityTableName: "fish_stocking",
    recentEntryKey: "stocking",
    buildOptimisticEntry: (payload) => ({
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
    }),
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
