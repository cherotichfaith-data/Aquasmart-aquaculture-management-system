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

export function useRecordMortality() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (payload: TablesInsert<"fish_mortality">) => {
      const result = await insertData("fish_mortality", payload)
      if (!result.success) throw result.error
      return result.data
    },
    onMutate: (payload) => {
      addOptimisticActivity(queryClient, { tableName: "fish_mortality" })
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        date: payload.date,
        system_id: payload.system_id,
        batch_id: payload.batch_id ?? null,
        number_of_fish_mortality: payload.number_of_fish_mortality ?? null,
        total_weight_mortality: payload.total_weight_mortality ?? null,
        abw: payload.abw ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
      const previous = addOptimisticRecentEntry(queryClient, { key: "mortality", entry: optimistic })
      return { previous }
    },
    onSuccess: () => {
      invalidateDashboardQueries(queryClient)
      invalidateInventoryQueries(queryClient)
      invalidateRecentActivityQueries(queryClient)
      invalidateRecentEntriesQueries(queryClient)
      toast({ title: "Success", description: "Mortality event recorded." })
    },
    onError: (error: any, _payload, context) => {
      restoreRecentEntries(queryClient, context?.previous)
      const message = error?.message ?? "Failed to record mortality."
      toast({ variant: "destructive", title: "Error", description: message })
    },
  })
}
