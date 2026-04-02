"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/lib/hooks/app/use-toast"
import {
  addOptimisticActivity,
  addOptimisticRecentEntry,
  restoreRecentEntries,
  type RecentEntriesKey,
} from "@/lib/hooks/use-mutation-optimistic"

type WriteThroughMutationConfig<TPayload, TResult> = {
  mutationFn: (payload: TPayload) => Promise<TResult>
  activityTableName?: string
  recentEntryKey?: RecentEntriesKey
  buildOptimisticEntry?: (payload: TPayload) => Record<string, unknown> | null | undefined
  invalidate?: (params: {
    queryClient: ReturnType<typeof useQueryClient>
    payload: TPayload
    result: TResult
  }) => Promise<void> | void
  successMessage: string
  errorMessage: string
}

export function useWriteThroughMutation<TPayload, TResult>(config: WriteThroughMutationConfig<TPayload, TResult>) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: config.mutationFn,
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
    onSuccess: async (result, payload) => {
      await config.invalidate?.({ queryClient, payload, result })
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
