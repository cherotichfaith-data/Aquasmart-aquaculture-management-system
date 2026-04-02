"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/cache/query-keys"
import { invalidateFeedingWriteQueries } from "@/lib/cache/react-query"
import { recordFeeding, type FeedingInsertInput } from "@/lib/commands/feeding"
import { useToast } from "@/lib/hooks/app/use-toast"
import {
  addOptimisticActivity,
  addOptimisticRecentEntry,
  restoreRecentEntries,
} from "@/lib/hooks/use-mutation-optimistic"

export function useRecordFeeding() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (payload: FeedingInsertInput) => recordFeeding(payload),
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
      queryClient.setQueryData(queryKeys.reports.recentEntries(meta.farmId), (old: any) => {
        if (!old || typeof old !== "object" || !old.feeding || old.feeding.status !== "success") return old
        const nextFeeding = [data, ...(old.feeding.data ?? [])].slice(0, 5)
        return {
          ...old,
          feeding: {
            ...old.feeding,
            data: nextFeeding,
          },
        }
      })

      await invalidateFeedingWriteQueries(queryClient, {
        farmId: meta.farmId,
        date: meta.date,
      })

      toast({ title: "Success", description: "Feeding event recorded." })
    },
    onError: (error: any, _payload, context) => {
      restoreRecentEntries(queryClient, context?.previous)
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message ?? "Failed to record feeding event.",
      })
    },
  })
}
