"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { insertData } from "@/lib/supabase-actions"
import {
  addOptimisticActivity,
  addOptimisticRecentEntry,
  invalidateDashboardQueries,
  invalidateOptionsQueries,
  invalidateRecentActivityQueries,
  invalidateRecentEntriesQueries,
  restoreRecentEntries,
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
    onMutate: (payload) => {
      addOptimisticActivity(queryClient, { tableName: "system" })
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        name: payload.name ?? null,
        type: payload.type ?? null,
        growth_stage: payload.growth_stage ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
      const previous = addOptimisticRecentEntry(queryClient, { key: "systems", entry: optimistic })
      return { previous }
    },
    onSuccess: () => {
      invalidateDashboardQueries(queryClient)
      invalidateOptionsQueries(queryClient)
      invalidateRecentActivityQueries(queryClient)
      invalidateRecentEntriesQueries(queryClient)
      toast({ title: "Success", description: "System created successfully." })
    },
    onError: (error: any, _payload, context) => {
      restoreRecentEntries(queryClient, context?.previous)
      const message = error?.message ?? "Failed to create system."
      toast({ variant: "destructive", title: "Error", description: message })
    },
  })
}
