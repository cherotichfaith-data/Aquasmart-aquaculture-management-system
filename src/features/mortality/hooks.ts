"use client"

import { invalidateAfterWrite } from "@/lib/cache/react-query"
import type { MortalityInput } from "@/lib/commands/operations"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"
import { buildOfflinePendingResult } from "@/lib/offline/pending-result"
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation"
import type { MortalityCause } from "@/lib/mortality"
import type { Tables, TablesInsert } from "@/lib/types/database"

type MortalityEventInsert = Omit<TablesInsert<"fish_mortality">, "cause"> & {
  cause?: MortalityCause
  farm_id?: string | null
}

export function useRecordMortality() {
  const { farmId } = useActiveFarm()

  const offlineMutation = useOfflineMutation<
    MortalityInput,
    {
      systemId: number
      farmId?: string | null
      batchId?: number | null
      date: string
      numberOfFishMortality: number
      totalWeightMortality?: number | null
      cause: MortalityInput["cause"]
      notes?: string | null
    },
    {
      data: Tables<"fish_mortality">
      meta: { farmId: string; systemId: number | null; date: string; pendingSync?: boolean; localIds?: string[] }
    }
  >({
    tableName: "mortality",
    buildRecords: (payload) => [
      {
        systemId: payload.system_id,
        farmId,
        batchId: payload.batch_id ?? null,
        date: payload.date,
        numberOfFishMortality: payload.number_of_fish_mortality,
        totalWeightMortality: payload.total_weight_mortality ?? null,
        cause: payload.cause,
        notes: payload.notes ?? null,
      },
    ],
    buildPendingResult: ({ input, localIds }) =>
      buildOfflinePendingResult({
        data: { id: 0 } as Tables<"fish_mortality">,
        farmId,
        systemId: input.system_id,
        date: input.date,
        localIds,
      }),
  })

  return useWriteThroughMutation({
    mutationFn: offlineMutation.mutate,
    activityTableName: "fish_mortality",
    recentEntryKey: "mortality",
    buildOptimisticEntry: (payload: MortalityEventInsert) => ({
      id: `optimistic-${Date.now()}`,
      date: payload.date,
      system_id: payload.system_id,
      batch_id: payload.batch_id ?? null,
      number_of_fish_mortality: payload.number_of_fish_mortality,
      created_at: new Date().toISOString(),
      status: "pending",
    }),
    invalidate: async ({ queryClient, result }) => {
      await invalidateAfterWrite(queryClient, {
        type: "mortality",
        farmId: result.meta.farmId,
        systemId: result.meta.systemId ?? 0,
        date: result.meta.date,
      })
    },
    successMessage: "Mortality recorded.",
    errorMessage: "Failed to record mortality.",
  })
}
