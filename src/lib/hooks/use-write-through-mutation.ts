"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/lib/hooks/app/use-toast"
import { hasPendingSyncMeta } from "@/lib/offline/result"
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
      const pendingSync = hasPendingSyncMeta(result) && Boolean(result.meta.pendingSync)

      if (!pendingSync) {
        void Promise.resolve(config.invalidate?.({ queryClient, payload, result })).catch((error) => {
          console.error("dataEntry:invalidate", error)
        })
      }

      toast({
        variant: pendingSync ? "warning" : "success",
        title: pendingSync ? "Saved offline" : "Record saved",
        description: pendingSync ? "Saved locally and queued for sync." : config.successMessage,
        duration: pendingSync ? 7000 : 6000,
      })
    },
    onError: (error: unknown, _payload, context) => {
      restoreRecentEntries(queryClient, context?.previous)
      const message = error instanceof Error ? error.message : config.errorMessage
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      })
    },
  })
}
