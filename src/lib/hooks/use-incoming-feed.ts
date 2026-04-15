"use client"

import { invalidateFeedInventoryWriteQueries } from "@/lib/cache/react-query"
import { recordFeedInventorySnapshot } from "@/lib/commands/operations"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"

export function useRecordFeedInventorySnapshot() {
  return useWriteThroughMutation({
    mutationFn: recordFeedInventorySnapshot,
    activityTableName: "feed_incoming",
    recentEntryKey: "incoming_feed",
    buildOptimisticEntry: (payload) => {
      return {
        id: `optimistic-${Date.now()}`,
        farm_id: payload.farm_id,
        date: payload.date,
        feed_type_id: payload.feed_type_id ?? null,
        feed_amount: payload.feed_amount ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
    },
    invalidate: async ({ queryClient, result }) =>
      invalidateFeedInventoryWriteQueries(queryClient, {
        farmId: result.meta.farmId,
        date: result.meta.date,
      }),
    successMessage: "Feed delivery recorded.",
    errorMessage: "Failed to record feed delivery.",
  })
}
