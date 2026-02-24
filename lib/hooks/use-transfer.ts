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
  restoreRecentEntries,
} from "@/lib/hooks/use-mutation-invalidation"
import type { TablesInsert } from "@/lib/types/database"

export function useRecordTransfer() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (payload: TablesInsert<"fish_transfer">) => {
      const result = await insertData("fish_transfer", payload)
      if (!result.success) throw result.error
      return result.data
    },
    onMutate: (payload) => {
      addOptimisticActivity(queryClient, { tableName: "fish_transfer" })
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        date: payload.date,
        origin_system_id: payload.origin_system_id,
        target_system_id: payload.target_system_id,
        batch_id: payload.batch_id ?? null,
        number_of_fish_transfer: payload.number_of_fish_transfer ?? null,
        total_weight_transfer: payload.total_weight_transfer ?? null,
        abw: payload.abw ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
      const previous = addOptimisticRecentEntry(queryClient, { key: "transfer", entry: optimistic })
      return { previous }
    },
    onSuccess: () => {
      invalidateDashboardQueries(queryClient)
      invalidateInventoryQueries(queryClient)
      invalidateRecentActivityQueries(queryClient)
      invalidateRecentEntriesQueries(queryClient)
      toast({ title: "Success", description: "Transfer recorded." })
    },
    onError: (error: any, _payload, context) => {
      restoreRecentEntries(queryClient, context?.previous)
      const message = error?.message ?? "Failed to record transfer."
      toast({ variant: "destructive", title: "Error", description: message })
    },
  })
}
