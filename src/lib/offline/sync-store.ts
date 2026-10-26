"use client"

import { useSyncExternalStore } from "react"

type SyncState = {
  isSyncing: boolean
  pendingCount: number
  lastSyncedAt: Date | null
  syncError: string | null
  manualSync: (() => Promise<void>) | null
  /** True when at least one pending record can't sync because the session has
   * expired (401), rather than a transient network/server issue. Distinct from
   * `syncError` so the UI can offer a "sign in again" action instead of "retry". */
  needsReauth: boolean
  /** Browser-reported connectivity (navigator.onLine + online/offline events),
   * tracked independently of pendingCount -- a crew that's offline with
   * nothing queued yet still needs to see that they're offline, not just
   * once they have something pending. */
  isOffline: boolean
}

type SyncStore = SyncState & {
  setIsSyncing: (value: boolean) => void
  setPendingCount: (value: number) => void
  setLastSyncedAt: (value: Date | null) => void
  setSyncError: (value: string | null) => void
  setManualSync: (value: (() => Promise<void>) | null) => void
  setNeedsReauth: (value: boolean) => void
  setIsOffline: (value: boolean) => void
}

const listeners = new Set<() => void>()

let state: SyncState = {
  isSyncing: false,
  pendingCount: 0,
  lastSyncedAt: null,
  syncError: null,
  manualSync: null,
  needsReauth: false,
  isOffline: false,
}

const emitChange = () => {
  listeners.forEach((listener) => listener())
}

const setState = (patch: Partial<SyncState>) => {
  const nextState = { ...state, ...patch }
  const hasChanged = Object.keys(patch).some((key) => {
    const typedKey = key as keyof SyncState
    return !Object.is(state[typedKey], nextState[typedKey])
  })

  if (!hasChanged) {
    return
  }

  state = nextState
  emitChange()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => state

const actions = {
  setIsSyncing: (isSyncing: boolean) => setState({ isSyncing }),
  setPendingCount: (pendingCount: number) => setState({ pendingCount }),
  setLastSyncedAt: (lastSyncedAt: Date | null) => setState({ lastSyncedAt }),
  setSyncError: (syncError: string | null) => setState({ syncError }),
  setManualSync: (manualSync: (() => Promise<void>) | null) => setState({ manualSync }),
  setNeedsReauth: (needsReauth: boolean) => setState({ needsReauth }),
  setIsOffline: (isOffline: boolean) => setState({ isOffline }),
}

export function useSyncStore(): SyncStore {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    ...snapshot,
    ...actions,
  }
}
