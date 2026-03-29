"use client"

import type { Enums } from "@/lib/types/database"
import type { DashboardSystemRow } from "@/features/dashboard/types"
import { getSystemOptions } from "@/lib/api/options"
import { getBatchSystemIds } from "@/lib/api/reports"

export type ScopedSystemIds = number[] | "all" | null

export const normalizeSystemIds = (ids: Array<number | null | undefined>): number[] =>
  Array.from(new Set(ids.filter((id): id is number => typeof id === "number" && Number.isFinite(id))))

export async function resolveScopedSystemIds(params: {
  farmId?: string | null
  stage?: "all" | Enums<"system_growth_stage">
  system?: string
  batch?: string
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
  scopedSystemIds?: number[] | null
}): Promise<ScopedSystemIds> {
  if (Array.isArray(params.scopedSystemIds)) {
    return normalizeSystemIds(params.scopedSystemIds)
  }

  const farmId = params.farmId ?? null
  if (!farmId) return null

  const parsedSystemId =
    params.system && params.system !== "all" && Number.isFinite(Number(params.system))
      ? Number(params.system)
      : undefined

  if (params.system && params.system !== "all" && parsedSystemId === undefined) {
    return []
  }

  let scoped: ScopedSystemIds = "all"

  if (params.stage && params.stage !== "all") {
    const systemsResult = await getSystemOptions({
      farmId,
      stage: params.stage,
      activeOnly: false,
      signal: params.signal,
    })
    if (systemsResult.status !== "success") return null
    scoped = normalizeSystemIds(systemsResult.data.map((row) => row.id))
  }

  if (params.batch && params.batch !== "all") {
    const batchId = Number(params.batch)
    if (!Number.isFinite(batchId)) return []
    const batchSystemsResult = await getBatchSystemIds({ batchId, signal: params.signal })
    if (batchSystemsResult.status !== "success") return null
    const batchIds = normalizeSystemIds(batchSystemsResult.data.map((row) => row.system_id))
    if (scoped === "all") {
      scoped = batchIds
    } else {
      const batchIdSet = new Set(batchIds)
      scoped = scoped.filter((id) => batchIdSet.has(id))
    }
  }

  if (parsedSystemId !== undefined) {
    if (scoped === "all") return [parsedSystemId]
    return scoped.filter((id) => id === parsedSystemId)
  }

  return scoped
}

export const hasCompleteSystemMetrics = (row: DashboardSystemRow): boolean => {
  const requiredNumericMetrics: Array<number | null> = [
    row.fish_end,
    row.biomass_end,
    row.feed_total,
    row.efcr,
    row.abw,
    row.feeding_rate,
    row.mortality_rate,
    row.biomass_density,
  ]

  const hasAllNumericMetrics = requiredNumericMetrics.every(
    (value) => typeof value === "number" && Number.isFinite(value),
  )
  if (!hasAllNumericMetrics) return false

  return typeof row.water_quality_rating_average === "string" && row.water_quality_rating_average.trim().length > 0
}
