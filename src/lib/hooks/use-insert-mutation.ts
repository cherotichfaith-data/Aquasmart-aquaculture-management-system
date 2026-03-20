"use client"

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useToast } from "@/lib/hooks/app/use-toast"
import {
  addOptimisticActivity,
  addOptimisticRecentEntry,
  invalidateDashboardQueries,
  invalidateInventoryQueries,
  invalidateOptionsQueries,
  invalidateProductionQueries,
  invalidateRecentActivityQueries,
  invalidateRecentEntriesQueries,
  invalidateReportsQueries,
  invalidateWaterQualityQueries,
  restoreRecentEntries,
  type RecentEntriesKey,
} from "@/lib/hooks/use-mutation-invalidation"
import { insertData } from "@/lib/supabase-actions"
import type { TablesInsert } from "@/lib/types/database"
import type { Database } from "@/lib/types/database"

type TableName = keyof Database["public"]["Tables"]
type InvalidateTarget =
  | "dashboard"
  | "inventory"
  | "options"
  | "production"
  | "recent-activity"
  | "recent-entries"
  | "reports"
  | "water-quality"

type MutationPayload<TTable extends TableName> = TablesInsert<TTable> | TablesInsert<TTable>[]

type InsertMutationConfig<TTable extends TableName> = {
  table: TTable
  activityTableName?: string
  recentEntryKey?: RecentEntriesKey
  buildOptimisticEntry?: (payload: MutationPayload<TTable>) => Record<string, unknown> | null | undefined
  invalidate?: InvalidateTarget[]
  successMessage: string
  errorMessage: string
}

const INVALIDATORS: Record<InvalidateTarget, (queryClient: QueryClient) => void> = {
  dashboard: invalidateDashboardQueries,
  inventory: invalidateInventoryQueries,
  options: invalidateOptionsQueries,
  production: invalidateProductionQueries,
  "recent-activity": invalidateRecentActivityQueries,
  "recent-entries": invalidateRecentEntriesQueries,
  reports: invalidateReportsQueries,
  "water-quality": invalidateWaterQualityQueries,
}

export function useInsertMutation<TTable extends TableName>(config: InsertMutationConfig<TTable>) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (payload: MutationPayload<TTable>) => {
      const result = await insertData(config.table, payload)
      if (!result.success) throw result.error
      return result.data
    },
    onMutate: (payload) => {
      if (config.activityTableName) {
        addOptimisticActivity(queryClient, { tableName: config.activityTableName })
      }

      if (!config.recentEntryKey || !config.buildOptimisticEntry) {
        return {}
      }

      const optimistic = config.buildOptimisticEntry(payload)
      if (!optimistic) {
        return {}
      }

      const previous = addOptimisticRecentEntry(queryClient, {
        key: config.recentEntryKey,
        entry: optimistic,
      })
      return { previous }
    },
    onSuccess: () => {
      config.invalidate?.forEach((target) => INVALIDATORS[target](queryClient))
      toast({ title: "Success", description: config.successMessage })
    },
    onError: (error: any, _payload, context) => {
      restoreRecentEntries(queryClient, context?.previous)
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message ?? config.errorMessage,
      })
    },
  })
}
