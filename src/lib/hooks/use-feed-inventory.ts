"use client"

import { invalidateAfterWrite } from "@/lib/cache/react-query"
import { recordFeedInventorySnapshotAction } from "@/features/feed/mutations.server"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"

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
        feed_type_label: payload.feed_type_label ?? (payload.feed_type_id ? `Feed ${payload.feed_type_id}` : "Feed"),
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
