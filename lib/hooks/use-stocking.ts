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

export function useRecordStocking() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (payload: TablesInsert<"fish_stocking"> | TablesInsert<"fish_stocking">[]) => {
      const result = await insertData("fish_stocking", payload)
      if (!result.success) throw result.error
      return result.data
    },
    onMutate: (payload) => {
      addOptimisticActivity(queryClient, { tableName: "fish_stocking" })
      const entry = Array.isArray(payload) ? payload[0] : payload
      if (entry) {
        const optimistic = {
          id: `optimistic-${Date.now()}`,
          date: entry.date,
          system_id: entry.system_id,
          batch_id: entry.batch_id ?? null,
          number_of_fish_stocking: entry.number_of_fish_stocking ?? null,
          total_weight_stocking: entry.total_weight_stocking ?? null,
          type_of_stocking: entry.type_of_stocking ?? null,
          abw: entry.abw ?? null,
          created_at: new Date().toISOString(),
          status: "pending",
        }
        const previous = addOptimisticRecentEntry(queryClient, { key: "stocking", entry: optimistic })
        return { previous }
      }
      return {}
    },
    onSuccess: () => {
      invalidateDashboardQueries(queryClient)
      invalidateInventoryQueries(queryClient)
      invalidateRecentActivityQueries(queryClient)
      invalidateRecentEntriesQueries(queryClient)
      toast({ title: "Success", description: "Stocking recorded." })
    },
    onError: (error: any, _payload, context) => {
      restoreRecentEntries(queryClient, context?.previous)
      const message = error?.message ?? "Failed to record stocking."
      toast({ variant: "destructive", title: "Error", description: message })
    },
  })
}
