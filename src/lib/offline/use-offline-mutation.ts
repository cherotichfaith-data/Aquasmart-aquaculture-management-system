"use client"

import { useCallback } from "react"
import { registerBackgroundSync } from "@/lib/offline/background-sync"
import { offlineDB, type OfflineTableName } from "@/lib/offline/db"
import { getPendingCount, pushPendingRecordById, pushRecordDirect } from "@/lib/offline/sync"
import { useSyncStore } from "@/lib/offline/sync-store"

type SyncTrackedRecord = {
  localId: string
  syncStatus: "pending"
  createdAtLocal: number
}

function isNetworkSaveError(error: unknown) {
  if (!error || typeof error !== "object") return false
  const name = String((error as { name?: unknown }).name ?? "")
  const message = String((error as { message?: unknown }).message ?? "")
  return (
    name === "TypeError" ||
    name === "AbortError" ||
    /fetch failed|failed to fetch|network|load failed/i.test(message)
  )
}

/**
 * Thrown when the initial (online-path) push fails with a 401. Handled like a
 * network error -- the record still gets queued locally so the entry isn't
 * lost -- but surfaces a "sign in again" state instead of a generic
 * "will sync when back online" message, since retrying without a fresh
 * session will just 401 again.
 */
class AuthSyncError extends Error {}

type OfflineMutationOptions<TInput, TRecord extends object, TResult> = {
  tableName: OfflineTableName
  buildRecords: (input: TInput) => TRecord[]
  buildPendingResult: (params: { input: TInput; localIds: string[] }) => TResult
  combineSyncedResponses?: (params: { input: TInput; responses: unknown[]; localIds: string[] }) => TResult
}

export function useOfflineMutation<TInput, TRecord extends object, TResult>(
  options: OfflineMutationOptions<TInput, TRecord, TResult>,
) {
  const { setPendingCount, setIsSyncing, setLastSyncedAt, setSyncError, setNeedsReauth } = useSyncStore()

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

      try {
        const responses: unknown[] = []

        for (const record of records) {
          // `options.tableName` is widened to `OfflineTableName` here (it isn't tied to a
          // single literal at this generic boundary), so `pushRecordDirect`'s parameter type
          // resolves to the full union of offline record shapes. Every concrete caller of
          // `useOfflineMutation` supplies a `TRecord` that matches its own `tableName` literal,
          // so this cast reflects a real invariant the generic signature can't express, not a
          // way to bypass it.
          const result = await pushRecordDirect(
            options.tableName,
            record as unknown as Parameters<typeof pushRecordDirect>[1],
          )

          if (result.status === "pushed" || result.status === "conflict") {
            if (result.response !== undefined) {
              responses.push(result.response)
            }
            continue
          }

          if (result.status === "auth") {
            throw new AuthSyncError(result.errorMessage ?? "Your session has expired.")
          }

          throw new Error(result.errorMessage ?? "Unable to save this record.")
        }

        setSyncError(null)
        setNeedsReauth(false)
        setLastSyncedAt(new Date())
        window.dispatchEvent(new CustomEvent("offline-sync-complete"))

        if (options.combineSyncedResponses) {
          return options.combineSyncedResponses({ input, responses, localIds })
        }
        if (responses[0] !== undefined) {
          return responses[0] as TResult
        }
      } catch (error) {
        const isAuthError = error instanceof AuthSyncError
        if (!isNetworkSaveError(error) && !isAuthError) {
          throw error
        }

        await offlineDB.table(options.tableName).bulkAdd(records as Array<SyncTrackedRecord & TRecord>)
        setPendingCount(await getPendingCount())
        void registerBackgroundSync()

        if (isAuthError) {
          // Already know we're online (we got an actual 401 response), so
          // there's no point immediately retrying the push below -- it would
          // just 401 again. Leave it queued for the background sync loop,
          // which will pick it up once the user signs back in.
          setNeedsReauth(true)
          setSyncError("Saved locally. Sign in again to sync this record.")
          return options.buildPendingResult({ input, localIds })
        }
      }

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
        let authErrorAny = false

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

          if (result.status === "auth") {
            authErrorAny = true
          }

          allSynced = false
        }

        if (pushedAny) {
          setLastSyncedAt(new Date())
          window.dispatchEvent(new CustomEvent("offline-sync-complete"))
        }

        if (allSynced) {
          setSyncError(null)
          setNeedsReauth(false)
          setPendingCount(await getPendingCount())
          if (options.combineSyncedResponses) {
            return options.combineSyncedResponses({ input, responses, localIds })
          }
          if (responses[0] !== undefined) {
            return responses[0] as TResult
          }
        } else if (authErrorAny) {
          setNeedsReauth(true)
          setSyncError("Saved locally. Sign in again to sync this record.")
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
    [options, setIsSyncing, setLastSyncedAt, setNeedsReauth, setPendingCount, setSyncError],
  )

  return { mutate }
}
