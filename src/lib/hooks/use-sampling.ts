"use client"

import { invalidateInventoryWriteQueries } from "@/lib/cache/react-query"
import type { SamplingInput } from "@/lib/commands/operations"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"
import { buildOfflinePendingResult } from "@/lib/offline/pending-result"
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation"
import type { Tables } from "@/lib/types/database"

export function useRecordSampling() {
  const { farmId } = useActiveFarm()

  const offlineMutation = useOfflineMutation<
    SamplingInput,
    {
      systemId: number
      batchId?: number | null
      date: string
      numberOfFishSampling: number
      totalWeightSampling: number
      abw: number
      notes?: string | null
    },
    {
      data: Tables<"fish_sampling_weight">
      meta: { farmId: string; systemId: number | null; date: string; pendingSync?: boolean; localIds?: string[] }
    }
  >({
    tableName: "sampling",
    buildRecords: (payload) => [
      {
        systemId: payload.system_id,
        batchId: payload.batch_id ?? null,
        date: payload.date,
        numberOfFishSampling: payload.number_of_fish_sampling,
        totalWeightSampling: payload.total_weight_sampling,
        abw: payload.abw,
        notes: payload.notes ?? null,
      },
    ],
    buildPendingResult: ({ input, localIds }) =>
      buildOfflinePendingResult({
        data: { id: 0 } as Tables<"fish_sampling_weight">,
        farmId,
        systemId: input.system_id,
        date: input.date,
        localIds,
      }),
  })

  return useWriteThroughMutation({
    mutationFn: offlineMutation.mutate,
    activityTableName: "fish_sampling_weight",
    recentEntryKey: "sampling",
    buildOptimisticEntry: (payload) => ({
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
    }),
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
