"use client"

import type { QueryClient } from "@tanstack/react-query"

const RECENT_ENTRIES_KEY = ["reports", "recent-entries"]

export function invalidateDashboardQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  queryClient.invalidateQueries({ queryKey: ["kpi-overview"] })
  queryClient.invalidateQueries({ queryKey: ["health-summary"] })
  queryClient.invalidateQueries({ queryKey: ["systems-table"] })
  queryClient.invalidateQueries({ queryKey: ["production-summary-metrics"] })
  queryClient.invalidateQueries({ queryKey: ["recommended-actions"] })
}

export function invalidateInventoryQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["inventory"] })
  queryClient.invalidateQueries({ queryKey: ["inventory-summary"] })
}

export function invalidateProductionQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["production"] })
  queryClient.invalidateQueries({ queryKey: ["production-trend"] })
}

export function invalidateWaterQualityQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["wq"] })
}

export function invalidateRecentActivityQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["recent-activities"] })
}

export function invalidateRecentEntriesQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: RECENT_ENTRIES_KEY })
}

export function invalidateReportsQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["reports"] })
}

export function invalidateOptionsQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["options"] })
}

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

  queryClient.setQueriesData({ queryKey: ["recent-activities"] }, (old: any) => {
    if (!old || old.status !== "success") return old
    const next = [optimistic, ...(old.data ?? [])].slice(0, 10)
    return { ...old, data: next }
  })
}

type RecentEntriesKey =
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
  data: any[]
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
