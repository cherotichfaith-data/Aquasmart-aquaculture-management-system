"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { insertData } from "@/lib/supabase-actions"
import {
  addOptimisticActivity,
  invalidateDashboardQueries,
  invalidateOptionsQueries,
  invalidateRecentActivityQueries,
  invalidateRecentEntriesQueries,
} from "@/lib/hooks/use-mutation-invalidation"
import type { TablesInsert } from "@/lib/types/database"

export function useCreateSystem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (payload: TablesInsert<"system">) => {
      const result = await insertData("system", payload)
      if (!result.success) throw result.error
      return result.data
    },
    onMutate: () => {
      addOptimisticActivity(queryClient, { tableName: "system" })
    },
    onSuccess: () => {
      invalidateDashboardQueries(queryClient)
      invalidateOptionsQueries(queryClient)
      invalidateRecentActivityQueries(queryClient)
      invalidateRecentEntriesQueries(queryClient)
      toast({ title: "Success", description: "System created successfully." })
    },
    onError: (error: any) => {
      const message = error?.message ?? "Failed to create system."
      toast({ variant: "destructive", title: "Error", description: message })
    },
  })
}
