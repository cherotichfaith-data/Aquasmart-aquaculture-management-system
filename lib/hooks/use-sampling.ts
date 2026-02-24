"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { insertData } from "@/lib/supabase-actions"
import {
  addOptimisticActivity,
  addOptimisticRecentEntry,
  invalidateDashboardQueries,
  invalidateInventoryQueries,
  invalidateProductionQueries,
  invalidateRecentActivityQueries,
  invalidateRecentEntriesQueries,
  restoreRecentEntries,
} from "@/lib/hooks/use-mutation-invalidation"
import type { TablesInsert } from "@/lib/types/database"

export function useRecordSampling() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (payload: TablesInsert<"fish_sampling_weight">) => {
      const result = await insertData("fish_sampling_weight", payload)
      if (!result.success) throw result.error
      return result.data
    },
    onMutate: (payload) => {
      addOptimisticActivity(queryClient, { tableName: "fish_sampling_weight" })
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        date: payload.date,
        system_id: payload.system_id,
        batch_id: payload.batch_id ?? null,
        number_of_fish_sampling: payload.number_of_fish_sampling ?? null,
        total_weight_sampling: payload.total_weight_sampling ?? null,
        abw: payload.abw ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
      const previous = addOptimisticRecentEntry(queryClient, { key: "sampling", entry: optimistic })
      return { previous }
    },
    onSuccess: () => {
      invalidateDashboardQueries(queryClient)
      invalidateInventoryQueries(queryClient)
      invalidateProductionQueries(queryClient)
      invalidateRecentActivityQueries(queryClient)
      invalidateRecentEntriesQueries(queryClient)
      toast({ title: "Success", description: "Sampling event recorded." })
    },
    onError: (error: any, _payload, context) => {
      restoreRecentEntries(queryClient, context?.previous)
      const message = error?.message ?? "Failed to record sampling."
      toast({ variant: "destructive", title: "Error", description: message })
    },
  })
}
