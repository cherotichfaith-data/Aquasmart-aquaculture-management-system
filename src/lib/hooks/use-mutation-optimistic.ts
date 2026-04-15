"use client"

import type { QueryClient } from "@tanstack/react-query"

const RECENT_ENTRIES_KEY = ["reports", "recent-entries"]

export function addOptimisticActivity(
  queryClient: QueryClient,
  params: { tableName: string; changeType?: string; columnName?: string },
) {
  const optimistic = {
    id: `optimistic-${Date.now()}`,
    table_name: params.tableName,
    change_type: params.changeType ?? "insert",
    column_name: params.columnName ?? null,
    change_time: new Date().toISOString(),
  }

  queryClient.setQueriesData({ queryKey: ["recent-activities"] }, (old: unknown) => {
    if (!old || typeof old !== "object") return old
    const o = old as { status?: string; data?: unknown[] }
    if (o.status !== "success") return old
    const next = [optimistic, ...(o.data ?? [])].slice(0, 10)
    return { ...o, data: next }
  })
}

export type RecentEntriesKey =
  | "mortality"
  | "feeding"
  | "sampling"
  | "transfer"
  | "harvest"
  | "water_quality"
  | "incoming_feed"
  | "stocking"
  | "systems"

type RecentEntriesPayload = {
  status: "success" | "error"
  data: Record<string, unknown>[]
  error?: string
}

type RecentEntriesCache = Partial<Record<RecentEntriesKey, RecentEntriesPayload>>

export function addOptimisticRecentEntry(
  queryClient: QueryClient,
  params: { key: RecentEntriesKey; entry: Record<string, unknown> },
) {
  const previous = queryClient.getQueryData(RECENT_ENTRIES_KEY)
  queryClient.setQueriesData({ queryKey: RECENT_ENTRIES_KEY }, (old: RecentEntriesCache | undefined) => {
    if (!old) return old
    const current = old[params.key]
    if (!current || current.status !== "success") return old
    const next = [{ ...params.entry }, ...(current.data ?? [])].slice(0, 5)
    return { ...old, [params.key]: { ...current, data: next } }
  })
  return previous
}

export function restoreRecentEntries(queryClient: QueryClient, previous: unknown) {
  if (!previous) return
  queryClient.setQueryData(RECENT_ENTRIES_KEY, previous)
}
