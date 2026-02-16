"use client"

import type { QueryClient } from "@tanstack/react-query"

export function invalidateDashboardQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  queryClient.invalidateQueries({ queryKey: ["kpi-overview"] })
  queryClient.invalidateQueries({ queryKey: ["health-summary"] })
  queryClient.invalidateQueries({ queryKey: ["systems-table"] })
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
  queryClient.invalidateQueries({ queryKey: ["water-quality"] })
}

export function invalidateRecentActivityQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["recent-activities"] })
}

export function invalidateRecentEntriesQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["reports", "recent-entries"] })
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
