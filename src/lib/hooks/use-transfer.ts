"use client"

import { invalidateInventoryWriteQueries } from "@/lib/cache/react-query"
import type { TransferInput } from "@/lib/commands/operations"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"
import { buildOfflinePendingResult } from "@/lib/offline/pending-result"
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation"
import type { Tables } from "@/lib/types/database"

export function useRecordTransfer() {
  const { farmId } = useActiveFarm()

  const offlineMutation = useOfflineMutation<
    TransferInput,
    {
      originSystemId: number
      targetSystemId?: number | null
      externalTargetName?: string | null
      batchId?: number | null
      date: string
      numberOfFishTransfer: number
      totalWeightTransfer: number
      abw?: number | null
      transferType: TransferInput["transfer_type"]
      notes?: string | null
    },
    {
      data: Tables<"fish_transfer">
      meta: { farmId: string; systemId: number | null; date: string; pendingSync?: boolean; localIds?: string[] }
    }
  >({
    tableName: "transfer",
    buildRecords: (payload) => [
      {
        originSystemId: payload.origin_system_id,
        targetSystemId: payload.target_system_id ?? null,
        externalTargetName: payload.external_target_name ?? null,
        batchId: payload.batch_id ?? null,
        date: payload.date,
        numberOfFishTransfer: payload.number_of_fish_transfer,
        totalWeightTransfer: payload.total_weight_transfer,
        abw: payload.abw ?? null,
        transferType: payload.transfer_type,
        notes: payload.notes ?? null,
      },
    ],
    buildPendingResult: ({ input, localIds }) =>
      buildOfflinePendingResult({
        data: { id: 0 } as Tables<"fish_transfer">,
        farmId,
        systemId: input.origin_system_id,
        date: input.date,
        localIds,
      }),
  })

  return useWriteThroughMutation({
    mutationFn: offlineMutation.mutate,
    activityTableName: "fish_transfer",
    recentEntryKey: "transfer",
    buildOptimisticEntry: (payload) => ({
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
    }),
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
