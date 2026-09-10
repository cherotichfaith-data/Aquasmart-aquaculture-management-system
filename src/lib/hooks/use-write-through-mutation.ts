"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useToast } from "@/lib/hooks/app/use-toast"
import { hasPendingSyncMeta } from "@/lib/offline/result"
import { hasPendingApproval } from "@/lib/approvals"
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
  const { farmId } = useActiveFarm()
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
        farmId,
        key: config.recentEntryKey,
        entry: optimistic,
      })

      return { previous }
    },
    onSuccess: async (result, payload) => {
      const pendingSync = hasPendingSyncMeta(result) && Boolean(result.meta.pendingSync)
      const pendingApproval = hasPendingApproval(result)

      if (!pendingSync) {
        void Promise.resolve(config.invalidate?.({ queryClient, payload, result })).catch((error) => {
          console.error("dataEntry:invalidate", error)
        })
      }

      toast({
        variant: pendingSync ? "warning" : "success",
        title: pendingSync ? "Saved offline" : pendingApproval ? "Submitted for approval" : "Record saved",
        description: pendingSync ? "Saved locally; it will be submitted for approval when synced." : pendingApproval ? "A farm manager can review this entry in Approvals." : config.successMessage,
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
