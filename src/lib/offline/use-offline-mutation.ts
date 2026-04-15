"use client"

import { useCallback } from "react"
import { offlineDB, type OfflineTableName } from "@/lib/offline/db"
import { getPendingCount, pushPendingRecordById } from "@/lib/offline/sync"
import { useSyncStore } from "@/lib/offline/sync-store"

type SyncTrackedRecord = {
  localId: string
  syncStatus: "pending"
  createdAtLocal: number
}

type OfflineMutationOptions<TInput, TRecord extends object, TResult> = {
  tableName: OfflineTableName
  buildRecords: (input: TInput) => TRecord[]
  buildPendingResult: (params: { input: TInput; localIds: string[] }) => TResult
  combineSyncedResponses?: (params: { input: TInput; responses: unknown[]; localIds: string[] }) => TResult
}

export function useOfflineMutation<TInput, TRecord extends object, TResult>(
  options: OfflineMutationOptions<TInput, TRecord, TResult>,
) {
  const { setPendingCount, setIsSyncing, setLastSyncedAt, setSyncError } = useSyncStore()

  const mutate = useCallback(
    async (input: TInput): Promise<TResult> => {
      const localIds: string[] = []
      const records = options.buildRecords(input).map((record) => {
        const localId = crypto.randomUUID()
        localIds.push(localId)
        return {
          localId,
          syncStatus: "pending" as const,
          createdAtLocal: Date.now(),
          ...record,
        } satisfies SyncTrackedRecord & TRecord
      })

      await offlineDB.table(options.tableName).bulkAdd(records as Array<SyncTrackedRecord & TRecord>)
      setPendingCount(await getPendingCount())

      if (!navigator.onLine) {
        setSyncError("Saved locally. Will sync when back online.")
        return options.buildPendingResult({ input, localIds })
      }

      setIsSyncing(true)
      setSyncError(null)

      try {
        const responses: unknown[] = []
        let allSynced = true
        let pushedAny = false

        for (const localId of localIds) {
          const result = await pushPendingRecordById(options.tableName, localId)

          if (result.status === "pushed") {
            pushedAny = true
            if (result.response !== undefined) {
              responses.push(result.response)
            }
            continue
          }

          if (result.status === "conflict") {
            if (result.response !== undefined) {
              responses.push(result.response)
            }
            continue
          }

          allSynced = false
        }

        if (pushedAny) {
          setLastSyncedAt(new Date())
          window.dispatchEvent(new CustomEvent("offline-sync-complete"))
        }

        if (allSynced) {
          setSyncError(null)
          setPendingCount(await getPendingCount())
          if (options.combineSyncedResponses) {
            return options.combineSyncedResponses({ input, responses, localIds })
          }
          if (responses[0] !== undefined) {
            return responses[0] as TResult
          }
        } else {
          setSyncError("Saved locally. Some records will retry syncing automatically.")
        }
      } catch {
        setSyncError("Saved locally. Will sync when back online.")
      } finally {
        setIsSyncing(false)
        setPendingCount(await getPendingCount())
      }

      return options.buildPendingResult({ input, localIds })
    },
    [options, setIsSyncing, setLastSyncedAt, setPendingCount, setSyncError],
  )

  return { mutate }
}
