"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { insertData } from "@/lib/supabase-actions"
import {
  addOptimisticActivity,
  addOptimisticRecentEntry,
  invalidateDashboardQueries,
  invalidateInventoryQueries,
  invalidateRecentActivityQueries,
  invalidateRecentEntriesQueries,
  invalidateReportsQueries,
  restoreRecentEntries,
} from "@/lib/hooks/use-mutation-invalidation"
import type { TablesInsert } from "@/lib/types/database"

export function useRecordIncomingFeed() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (payload: TablesInsert<"feed_incoming">) => {
      const result = await insertData("feed_incoming", payload)
      if (!result.success) throw result.error
      return result.data
    },
    onMutate: (payload) => {
      addOptimisticActivity(queryClient, { tableName: "feed_incoming" })
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        date: payload.date,
        feed_type_id: payload.feed_type_id ?? null,
        feed_amount: payload.feed_amount ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
      const previous = addOptimisticRecentEntry(queryClient, { key: "incoming_feed", entry: optimistic })
      return { previous }
    },
    onSuccess: () => {
      invalidateDashboardQueries(queryClient)
      invalidateInventoryQueries(queryClient)
      invalidateReportsQueries(queryClient)
      invalidateRecentActivityQueries(queryClient)
      invalidateRecentEntriesQueries(queryClient)
      toast({ title: "Success", description: "Incoming feed recorded." })
    },
    onError: (error: any, _payload, context) => {
      restoreRecentEntries(queryClient, context?.previous)
      const message = error?.message ?? "Failed to record incoming feed."
      toast({ variant: "destructive", title: "Error", description: message })
    },
  })
}
