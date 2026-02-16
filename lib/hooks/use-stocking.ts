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

export function useRecordStocking() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (payload: TablesInsert<"fish_stocking"> | TablesInsert<"fish_stocking">[]) => {
      const result = await insertData("fish_stocking", payload)
      if (!result.success) throw result.error
      return result.data
    },
    onMutate: () => {
      addOptimisticActivity(queryClient, { tableName: "fish_stocking" })
    },
    onSuccess: () => {
      invalidateDashboardQueries(queryClient)
      invalidateInventoryQueries(queryClient)
      invalidateRecentActivityQueries(queryClient)
      invalidateRecentEntriesQueries(queryClient)
      toast({ title: "Success", description: "Stocking recorded." })
    },
    onError: (error: any) => {
      const message = error?.message ?? "Failed to record stocking."
      toast({ variant: "destructive", title: "Error", description: message })
    },
  })
}
