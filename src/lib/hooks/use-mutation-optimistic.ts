"use client"

import type { QueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/cache/query-keys"

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
  | "feed_inventory"
  | "stocking"
  | "systems"

type RecentEntriesPayload = {
  status: "success" | "error"
  data: Record<string, unknown>[]
  error?: string
}

type RecentEntriesCache = Partial<Record<RecentEntriesKey, RecentEntriesPayload>>

export type RecentEntriesSnapshot = {
  queryKey: ReturnType<typeof queryKeys.reports.recentEntries>
  data: unknown
}

export function addOptimisticRecentEntry(
  queryClient: QueryClient,
  params: { farmId?: string | null; key: RecentEntriesKey; entry: Record<string, unknown> },
): RecentEntriesSnapshot | undefined {
  if (!params.farmId) return undefined

  const queryKey = queryKeys.reports.recentEntries(params.farmId)
  const previous = queryClient.getQueryData(queryKey)
  queryClient.setQueryData(queryKey, (old: RecentEntriesCache | undefined) => {
    if (!old) return old
    const current = old[params.key]
    if (!current || current.status !== "success") return old
    const next = [{ ...params.entry }, ...(current.data ?? [])].slice(0, 5)
    return { ...old, [params.key]: { ...current, data: next } }
  })
  return { queryKey, data: previous }
}

export function restoreRecentEntries(queryClient: QueryClient, snapshot: RecentEntriesSnapshot | undefined) {
  if (!snapshot) return
  queryClient.setQueryData(snapshot.queryKey, snapshot.data)
}
