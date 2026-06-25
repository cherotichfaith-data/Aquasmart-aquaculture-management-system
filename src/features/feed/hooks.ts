"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/cache/query-keys"
import { invalidateAfterWrite } from "@/lib/cache/react-query"
import type { FeedingInsertInput } from "@/lib/commands/feeding"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useToast } from "@/lib/hooks/app/use-toast"
import {
  addOptimisticActivity,
  addOptimisticRecentEntry,
  restoreRecentEntries,
} from "@/lib/hooks/use-mutation-optimistic"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"
import { buildOfflinePendingResult } from "@/lib/offline/pending-result"
import { hasPendingSyncMeta } from "@/lib/offline/result"
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation"
import type { Tables } from "@/lib/types/database"
import { recordFeedInventorySnapshotAction } from "./mutations.server"

export function useRecordFeeding() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { farmId } = useActiveFarm()

  const offlineMutation = useOfflineMutation<
    FeedingInsertInput,
    {
      farmId?: string | null
      systemId: number
      batchId?: number | null
      date: string
      feedTypeId?: number | null
      feedingAmount: number
      feedingResponse?: FeedingInsertInput["feeding_response"] | null
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
        farmId: payload.farm_id ?? farmId,
        systemId: payload.system_id,
        batchId: payload.batch_id ?? null,
        date: payload.date,
        feedTypeId: payload.feed_type_id ?? null,
        feedingAmount: payload.feeding_amount,
        feedingResponse: payload.feeding_response ?? null,
        notes: payload.notes ?? null,
      },
    ],
    buildPendingResult: ({ input, localIds }) =>
      buildOfflinePendingResult({
        data: { id: 0 } as Tables<"feeding_record">,
        farmId: input.farm_id ?? farmId,
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
        toast({
          variant: "warning",
          title: "Saved offline",
          description: "Saved locally and queued for sync.",
          duration: 7000,
        })
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

      void invalidateAfterWrite(queryClient, {
        type: "feeding",
        farmId: meta.farmId,
        date: meta.date,
      }).catch((error) => {
        console.error("dataEntry:feeding:invalidate", error)
      })

      toast({
        variant: "success",
        title: "Record saved",
        description: "Feeding event recorded.",
        duration: 6000,
      })
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

export function useRecordFeedInventorySnapshot() {
  return useWriteThroughMutation({
    mutationFn: recordFeedInventorySnapshotAction,
    activityTableName: "feed_inventory",
    recentEntryKey: "feed_inventory",
    buildOptimisticEntry: (payload) => {
      return {
        id: `optimistic-${Date.now()}`,
        farm_id: payload.farm_id,
        inventory_date: payload.inventory_date,
        inventory_time: payload.inventory_time ?? null,
        feed_type_id: payload.feed_type_id ?? null,
        feed_type_label: payload.feed_type_label,
        bag_weight: payload.bag_weight,
        amount_of_bags: payload.amount_of_bags,
        opened_bags: payload.opened_bags ?? null,
        snapshot_kg: null,
        comments: payload.comments ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
    },
    invalidate: async ({ queryClient, result }) =>
      invalidateAfterWrite(queryClient, {
        type: "feedInventory",
        farmId: result.meta.farmId,
        date: result.meta.date,
      }),
    successMessage: "Feed inventory recorded.",
    errorMessage: "Failed to record feed inventory.",
  })
}
