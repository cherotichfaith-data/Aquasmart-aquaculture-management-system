"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { insertData } from "@/lib/supabase-actions"
import {
  addOptimisticActivity,
  invalidateDashboardQueries,
  invalidateInventoryQueries,
  invalidateRecentActivityQueries,
  invalidateRecentEntriesQueries,
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
    onMutate: () => {
      addOptimisticActivity(queryClient, { tableName: "fish_mortality" })
    },
    onSuccess: () => {
      invalidateDashboardQueries(queryClient)
      invalidateInventoryQueries(queryClient)
      invalidateRecentActivityQueries(queryClient)
      invalidateRecentEntriesQueries(queryClient)
      toast({ title: "Success", description: "Mortality event recorded." })
    },
    onError: (error: any) => {
      const message = error?.message ?? "Failed to record mortality."
      toast({ variant: "destructive", title: "Error", description: message })
    },
  })
}
