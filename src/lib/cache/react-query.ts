"use client"

import type { QueryClient } from "@tanstack/react-query"

const DASHBOARD_ROOTS = new Set([
  "systems-table",
  "systems-overview",
  "kpi-overview",
  "recommended-actions",
  "production-trend",
])

const toStringValue = (value: unknown) => (typeof value === "string" ? value : String(value ?? ""))

const hasPrefix = (queryKey: readonly unknown[], prefix: readonly unknown[]) =>
  prefix.every((part, index) => queryKey[index] === part)

const isFarmScopedReportsQuery = (queryKey: readonly unknown[], farmId: string) =>
  toStringValue(queryKey[0]) === "reports" && toStringValue(queryKey[2]) === farmId

const isFarmScopedDashboardQuery = (queryKey: readonly unknown[], farmId: string) =>
  DASHBOARD_ROOTS.has(toStringValue(queryKey[0])) && toStringValue(queryKey[1]) === farmId

const isFarmScopedAnalyticsQuery = (queryKey: readonly unknown[], farmId: string) =>
  toStringValue(queryKey[0]) === "analytics" && toStringValue(queryKey[2]) === farmId

const isFarmScopedProductionQuery = (queryKey: readonly unknown[], farmId: string) =>
  toStringValue(queryKey[0]) === "production" && toStringValue(queryKey[2]) === farmId

const isFarmScopedTimePeriodQuery = (queryKey: readonly unknown[], farmId: string) =>
  toStringValue(queryKey[0]) === "time-period-bounds" && toStringValue(queryKey[1]) === farmId

const isFarmScopedDashboardFeedbackQuery = (queryKey: readonly unknown[], farmId: string) =>
  isFarmScopedDashboardQuery(queryKey, farmId) ||
  isFarmScopedAnalyticsQuery(queryKey, farmId) ||
  isFarmScopedTimePeriodQuery(queryKey, farmId)

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

async function invalidateFeedingWriteQueries(
  queryClient: QueryClient,
  params: { farmId: string; date: string },
) {
  await Promise.all([
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        toStringValue(queryKey[0]) === "options" &&
        toStringValue(queryKey[1]) === "feeds" &&
        toStringValue(queryKey[2]) === params.farmId,
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedReportsQuery(queryKey, params.farmId),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedDashboardFeedbackQuery(queryKey, params.farmId),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedProductionQuery(queryKey, params.farmId),
    }),
    invalidateRecentActivityQueries(queryClient, { tableName: "feeding_record", date: params.date }),
  ])
}

async function invalidateInventoryWriteQueries(
  queryClient: QueryClient,
  params: {
    farmId: string
    date: string
    tableName: string
    includeProductionQueries?: boolean
    includeBatchOptions?: boolean
  },
) {
  const tasks = [
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        toStringValue(queryKey[0]) === "options" &&
        toStringValue(queryKey[1]) === "systems" &&
        toStringValue(queryKey[2]) === params.farmId,
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedReportsQuery(queryKey, params.farmId),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedDashboardFeedbackQuery(queryKey, params.farmId),
    }),
    invalidateRecentActivityQueries(queryClient, { tableName: params.tableName, date: params.date }),
  ]

  if (params.includeProductionQueries) {
    tasks.push(
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) => isFarmScopedProductionQuery(queryKey, params.farmId),
      }),
    )
  }

  if (params.includeBatchOptions) {
    tasks.push(
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          toStringValue(queryKey[0]) === "options" &&
          toStringValue(queryKey[1]) === "batches" &&
          toStringValue(queryKey[2]) === params.farmId,
      }),
    )
  }

  await Promise.all(tasks)
}

async function invalidateWaterQualityWriteQueries(
  queryClient: QueryClient,
  params: { farmId: string; date: string },
) {
  await Promise.all([
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedDashboardFeedbackQuery(queryKey, params.farmId),
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

async function invalidateFeedInventoryWriteQueries(
  queryClient: QueryClient,
  params: { farmId: string; date: string },
) {
  await Promise.all([
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedDashboardFeedbackQuery(queryKey, params.farmId),
    }),
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedReportsQuery(queryKey, params.farmId),
    }),
    invalidateRecentActivityQueries(queryClient, { tableName: "feed_inventory", date: params.date }),
  ])
}

async function invalidateMortalityWriteQueries(
  queryClient: QueryClient,
  params: { farmId: string; systemId: number; date: string },
) {
  await invalidateInventoryWriteQueries(queryClient, {
    farmId: params.farmId,
    date: params.date,
    tableName: "fish_mortality",
  })
}

async function invalidateSystemWriteQueries(
  queryClient: QueryClient,
  params: { farmId: string; date: string },
) {
  await Promise.all([
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) => isFarmScopedDashboardFeedbackQuery(queryKey, params.farmId),
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

export type DataEntryWriteType =
  | "feeding"
  | "mortality"
  | "sampling"
  | "waterQuality"
  | "harvest"
  | "transfer"
  | "stocking"
  | "feedInventory"
  | "system"

export async function invalidateAfterWrite(
  queryClient: QueryClient,
  params: {
    type: DataEntryWriteType
    farmId: string
    date: string
    systemId?: number | null
  },
) {
  switch (params.type) {
    case "feeding":
      return invalidateFeedingWriteQueries(queryClient, { farmId: params.farmId, date: params.date })
    case "mortality":
      return invalidateMortalityWriteQueries(queryClient, {
        farmId: params.farmId,
        systemId: params.systemId ?? 0,
        date: params.date,
      })
    case "waterQuality":
      return invalidateWaterQualityWriteQueries(queryClient, { farmId: params.farmId, date: params.date })
    case "feedInventory":
      return invalidateFeedInventoryWriteQueries(queryClient, { farmId: params.farmId, date: params.date })
    case "system":
      return invalidateSystemWriteQueries(queryClient, { farmId: params.farmId, date: params.date })
    case "sampling":
      return invalidateInventoryWriteQueries(queryClient, {
        farmId: params.farmId,
        date: params.date,
        tableName: "fish_sampling_weight",
        includeProductionQueries: true,
      })
    case "harvest":
      return invalidateInventoryWriteQueries(queryClient, {
        farmId: params.farmId,
        date: params.date,
        tableName: "fish_harvest",
        includeProductionQueries: true,
      })
    case "transfer":
      return invalidateInventoryWriteQueries(queryClient, {
        farmId: params.farmId,
        date: params.date,
        tableName: "fish_transfer",
        includeProductionQueries: true,
        includeBatchOptions: true,
      })
    case "stocking":
      return invalidateInventoryWriteQueries(queryClient, {
        farmId: params.farmId,
        date: params.date,
        tableName: "fish_stocking",
        includeProductionQueries: true,
        includeBatchOptions: true,
      })
  }
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
