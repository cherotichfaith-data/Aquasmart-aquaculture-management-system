"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/cache/query-keys"
import { invalidateFeedingWriteQueries } from "@/lib/cache/react-query"
import type { FeedingInsertInput } from "@/lib/commands/feeding"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useToast } from "@/lib/hooks/app/use-toast"
import {
  addOptimisticActivity,
  addOptimisticRecentEntry,
  restoreRecentEntries,
} from "@/lib/hooks/use-mutation-optimistic"
import { buildOfflinePendingResult } from "@/lib/offline/pending-result"
import { hasPendingSyncMeta } from "@/lib/offline/result"
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation"
import type { Tables } from "@/lib/types/database"

export function useRecordFeeding() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { farmId } = useActiveFarm()

  const offlineMutation = useOfflineMutation<
    FeedingInsertInput,
    {
      systemId: number
      batchId?: number | null
      date: string
      feedTypeId: number
      feedingAmount: number
      feedingResponse: FeedingInsertInput["feeding_response"]
      notes?: string | null
    },
    {
      data: Tables<"feeding_record">
      meta: { farmId: string; systemId: number | null; date: string; pendingSync?: boolean; localIds?: string[] }
    }
  >({
    tableName: "feeding",
    buildRecords: (payload) => [
      {
        systemId: payload.system_id,
        batchId: payload.batch_id ?? null,
        date: payload.date,
        feedTypeId: payload.feed_type_id,
        feedingAmount: payload.feeding_amount,
        feedingResponse: payload.feeding_response,
        notes: payload.notes ?? null,
      },
    ],
    buildPendingResult: ({ input, localIds }) =>
      buildOfflinePendingResult({
        data: { id: 0 } as Tables<"feeding_record">,
        farmId,
        systemId: input.system_id,
        date: input.date,
        localIds,
      }),
  })

  return useMutation({
    mutationFn: offlineMutation.mutate,
    onMutate: (payload) => {
      addOptimisticActivity(queryClient, { tableName: "feeding_record" })

      const optimistic = {
        id: `optimistic-${Date.now()}`,
        date: payload.date,
        system_id: payload.system_id,
        batch_id: payload.batch_id ?? null,
        feed_type_id: payload.feed_type_id ?? null,
        feeding_amount: payload.feeding_amount ?? null,
        feeding_response: payload.feeding_response ?? null,
        notes: payload.notes ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }

      const previous = addOptimisticRecentEntry(queryClient, {
        key: "feeding",
        entry: optimistic,
      })

      return { previous }
    },
    onSuccess: async ({ data, meta }) => {
      if (hasPendingSyncMeta({ meta }) && meta.pendingSync) {
        toast({ title: "Saved Offline", description: "Saved locally and queued for sync." })
        return
      }

      queryClient.setQueryData(queryKeys.reports.recentEntries(meta.farmId), (old: unknown) => {
        if (!old || typeof old !== "object") return old
        const o = old as Record<string, unknown>
        const feeding = o.feeding as { status?: string; data?: unknown[] } | undefined
        if (!feeding || feeding.status !== "success") return old
        const nextFeeding = [data, ...(feeding.data ?? [])].slice(0, 5)
        return { ...o, feeding: { ...feeding, data: nextFeeding } }
      })

      await invalidateFeedingWriteQueries(queryClient, {
        farmId: meta.farmId,
        date: meta.date,
      })

      toast({ title: "Success", description: "Feeding event recorded." })
    },
    onError: (error: unknown, _payload, context) => {
      restoreRecentEntries(queryClient, context?.previous)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record feeding event.",
      })
    },
  })
}
