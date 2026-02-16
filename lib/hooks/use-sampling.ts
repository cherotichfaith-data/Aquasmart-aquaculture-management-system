"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { insertData } from "@/lib/supabase-actions"
import {
  addOptimisticActivity,
  invalidateDashboardQueries,
  invalidateInventoryQueries,
  invalidateProductionQueries,
  invalidateRecentActivityQueries,
  invalidateRecentEntriesQueries,
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
    onMutate: () => {
      addOptimisticActivity(queryClient, { tableName: "fish_sampling_weight" })
    },
    onSuccess: () => {
      invalidateDashboardQueries(queryClient)
      invalidateInventoryQueries(queryClient)
      invalidateProductionQueries(queryClient)
      invalidateRecentActivityQueries(queryClient)
      invalidateRecentEntriesQueries(queryClient)
      toast({ title: "Success", description: "Sampling event recorded." })
    },
    onError: (error: any) => {
      const message = error?.message ?? "Failed to record sampling."
      toast({ variant: "destructive", title: "Error", description: message })
    },
  })
}
