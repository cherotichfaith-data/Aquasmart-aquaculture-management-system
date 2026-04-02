"use client"

import type { QueryClient } from "@tanstack/react-query"

const DASHBOARD_ROOTS = new Set([
  "systems-table",
  "kpi-overview",
  "recommended-actions",
  "production-summary-metrics",
  "production-trend",
])

const toStringValue = (value: unknown) => (typeof value === "string" ? value : String(value ?? ""))

const hasPrefix = (queryKey: readonly unknown[], prefix: readonly unknown[]) =>
  prefix.every((part, index) => queryKey[index] === part)

const isFarmScopedReportsQuery = (queryKey: readonly unknown[], farmId: string) =>
  toStringValue(queryKey[0]) === "reports" && toStringValue(queryKey[2]) === farmId

const isFarmScopedDashboardQuery = (queryKey: readonly unknown[], farmId: string) =>
  DASHBOARD_ROOTS.has(toStringValue(queryKey[0])) && toStringValue(queryKey[1]) === farmId

const overlapsDate = (from: unknown, to: unknown, date: string) => {
  const start = toStringValue(from)
  const end = toStringValue(to)

  if (!start || start === "all") {
    return !end || end === "all" || date <= end
  }
  if (!end || end === "all") {
    return date >= start
  }
  return date >= start && date <= end
}

async function invalidateRecentActivityQueries(
  queryClient: QueryClient,
  params: { tableName: string; date: string },
) {
  await queryClient.invalidateQueries({
    predicate: ({ queryKey }) => {
      if (!hasPrefix(queryKey, ["recent-activities"])) return false
      const tableName = toStringValue(queryKey[1])
      if (tableName !== "all" && tableName !== params.tableName) return false
      return overlapsDate(queryKey[3], queryKey[4], params.date)
    },
  })
}

export async function invalidateFeedingWriteQueries(
  queryClient: QueryClient,
  params: { farmId: string; date: string },
) {
  await Promise.all([
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        hasPrefix(queryKey, ["inventory", "daily"]) && toStringValue(queryKey[2]) === params.farmId,
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedReportsQuery(queryKey, params.farmId),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedDashboardQuery(queryKey, params.farmId),
    }),
    invalidateRecentActivityQueries(queryClient, { tableName: "feeding_record", date: params.date }),
  ])
}

export async function invalidateInventoryWriteQueries(
  queryClient: QueryClient,
  params: {
    farmId: string
    date: string
    tableName: string
    includeProductionQueries?: boolean
  },
) {
  const tasks = [
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        hasPrefix(queryKey, ["inventory", "daily"]) && toStringValue(queryKey[2]) === params.farmId,
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedReportsQuery(queryKey, params.farmId),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedDashboardQuery(queryKey, params.farmId),
    }),
    invalidateRecentActivityQueries(queryClient, { tableName: params.tableName, date: params.date }),
  ]

  if (params.includeProductionQueries) {
    tasks.push(
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          toStringValue(queryKey[0]) === "production" && toStringValue(queryKey[2]) === params.farmId,
      }),
    )
  }

  await Promise.all(tasks)
}

export async function invalidateWaterQualityWriteQueries(
  queryClient: QueryClient,
  params: { farmId: string; date: string },
) {
  await Promise.all([
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedDashboardQuery(queryKey, params.farmId),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => toStringValue(queryKey[0]) === "wq" && toStringValue(queryKey[2]) === params.farmId,
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedReportsQuery(queryKey, params.farmId),
    }),
    invalidateRecentActivityQueries(queryClient, { tableName: "water_quality_measurement", date: params.date }),
  ])
}

export async function invalidateFeedInventoryWriteQueries(
  queryClient: QueryClient,
  params: { farmId: string; date: string },
) {
  await Promise.all([
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedDashboardQuery(queryKey, params.farmId),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        hasPrefix(queryKey, ["inventory", "daily"]) && toStringValue(queryKey[2]) === params.farmId,
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedReportsQuery(queryKey, params.farmId),
    }),
    invalidateRecentActivityQueries(queryClient, { tableName: "feed_inventory_snapshot", date: params.date }),
  ])
}

export async function invalidateMortalityWriteQueries(
  queryClient: QueryClient,
  params: { farmId: string; systemId: number; date: string },
) {
  await Promise.all([
    invalidateInventoryWriteQueries(queryClient, {
      farmId: params.farmId,
      date: params.date,
      tableName: "fish_mortality",
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        toStringValue(queryKey[0]) === "mortality-events" && toStringValue(queryKey[1]) === params.farmId,
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => toStringValue(queryKey[0]) === "alert-log" && toStringValue(queryKey[1]) === params.farmId,
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        toStringValue(queryKey[0]) === "survival-trend" && Number(queryKey[1]) === params.systemId,
    }),
  ])
}

export async function invalidateSystemWriteQueries(
  queryClient: QueryClient,
  params: { farmId: string; date: string },
) {
  await Promise.all([
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedDashboardQuery(queryKey, params.farmId),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        toStringValue(queryKey[0]) === "options" &&
        toStringValue(queryKey[1]) === "systems" &&
        toStringValue(queryKey[2]) === params.farmId,
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        toStringValue(queryKey[0]) === "notifications" &&
        toStringValue(queryKey[1]) === "systems" &&
        toStringValue(queryKey[2]) === params.farmId,
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedReportsQuery(queryKey, params.farmId),
    }),
    invalidateRecentActivityQueries(queryClient, { tableName: "system", date: params.date }),
  ])
}

export async function invalidateReferenceDataQueries(
  queryClient: QueryClient,
  params:
    | { kind: "feed-suppliers" }
    | { kind: "feed-types" }
    | { kind: "fingerling-suppliers" }
    | { kind: "batches"; farmId: string },
) {
  switch (params.kind) {
    case "feed-suppliers":
      await queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          toStringValue(queryKey[0]) === "options" && toStringValue(queryKey[1]) === "feed-suppliers",
      })
      return
    case "feed-types":
      await queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          toStringValue(queryKey[0]) === "options" && toStringValue(queryKey[1]) === "feeds",
      })
      return
    case "fingerling-suppliers":
      await queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          toStringValue(queryKey[0]) === "options" && toStringValue(queryKey[1]) === "fingerling-suppliers",
      })
      return
    case "batches":
      await queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          toStringValue(queryKey[0]) === "options" &&
          toStringValue(queryKey[1]) === "batches" &&
          toStringValue(queryKey[2]) === params.farmId,
      })
      return
  }
}
