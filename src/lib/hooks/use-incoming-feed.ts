"use client"

import { invalidateFeedInventoryWriteQueries } from "@/lib/cache/react-query"
import { recordFeedInventorySnapshot } from "@/lib/commands/operations"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"

export function useRecordFeedInventorySnapshot() {
  return useWriteThroughMutation({
    mutationFn: recordFeedInventorySnapshot,
    activityTableName: "feed_inventory_snapshot",
    recentEntryKey: "incoming_feed",
    buildOptimisticEntry: (payload) => {
      return {
        id: `optimistic-${Date.now()}`,
        farm_id: payload.farm_id,
        date: payload.date,
        snapshot_time: payload.snapshot_time ?? null,
        feed_type_id: payload.feed_type_id ?? null,
        bag_weight_kg: payload.bag_weight_kg ?? null,
        number_of_bags: payload.number_of_bags ?? null,
        open_bags_kg: payload.open_bags_kg ?? null,
        total_stock_kg:
          payload.bag_weight_kg != null && payload.number_of_bags != null
            ? (payload.bag_weight_kg * payload.number_of_bags) + (payload.open_bags_kg ?? 0)
            : null,
        notes: payload.notes ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
    },
    invalidate: async ({ queryClient, result }) =>
      invalidateFeedInventoryWriteQueries(queryClient, {
        farmId: result.meta.farmId,
        date: result.meta.date,
      }),
    successMessage: "Feed inventory snapshot recorded.",
    errorMessage: "Failed to record feed inventory snapshot.",
  })
}
