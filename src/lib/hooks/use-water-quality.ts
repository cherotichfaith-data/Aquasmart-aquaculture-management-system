"use client"

import { queryOptions, useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import type { QueryResult } from "@/lib/supabase-client"
import {
  getAlertThresholds,
  getDailyOverlay,
  getDailyWaterQualityRating,
  getLatestWaterQualityStatus,
  getWaterQualitySyncStatus,
  getWaterQualityMeasurements,
} from "@/lib/api/water-quality"
import type { Database } from "@/lib/types/database"
import { useInsertMutation } from "@/lib/hooks/use-insert-mutation"

function waterQualityQueryOptions<TResult>(params: {
  queryKey: readonly unknown[]
  queryFn: (context: { signal: AbortSignal }) => Promise<TResult>
  enabled: boolean
  staleTime: number
  initialData?: TResult
}) {
  return queryOptions({
    queryKey: params.queryKey,
    enabled: params.enabled,
    queryFn: params.queryFn,
    staleTime: params.staleTime,
    initialData: params.initialData,
    initialDataUpdatedAt: params.initialData ? 0 : undefined,
  })
}

export function useLatestWaterQualityStatus(
  systemId?: number,
  options?: {
    farmId?: string | null
    initialData?: QueryResult<Database["public"]["Functions"]["api_latest_water_quality_status"]["Returns"][number]>
  },
) {
  return useLatestWaterQualityStatusWithInitial({
    systemId,
    farmId: options?.farmId,
    initialData: options?.initialData,
  })
}

function useLatestWaterQualityStatusWithInitial(params?: {
  systemId?: number
  farmId?: string | null
  initialData?: QueryResult<Database["public"]["Functions"]["api_latest_water_quality_status"]["Returns"][number]>
}) {
  const { farmId } = useActiveFarm()
  const { session } = useAuth()
  const resolvedFarmId = params?.farmId ?? farmId
  const enabled = Boolean(session) && Boolean(resolvedFarmId)
  return useQuery(
    waterQualityQueryOptions({
      queryKey: ["wq", "latest_status", resolvedFarmId, params?.systemId ?? null],
      enabled,
      queryFn: ({ signal }) =>
        getLatestWaterQualityStatus({ farmId: resolvedFarmId!, systemId: params?.systemId, signal }),
      staleTime: 30_000,
      initialData: params?.initialData,
    }),
  )
}

export function useWaterQualitySyncStatus(params?: {
  farmId?: string | null
  initialData?: QueryResult<Database["public"]["Functions"]["api_water_quality_sync_status"]["Returns"][number]>
}) {
  const { farmId } = useActiveFarm()
  const { session } = useAuth()
  const resolvedFarmId = params?.farmId ?? farmId
  const enabled = Boolean(session) && Boolean(resolvedFarmId)
  return useQuery(
    waterQualityQueryOptions({
      queryKey: ["wq", "sync_status", resolvedFarmId],
      enabled,
      queryFn: ({ signal }) => getWaterQualitySyncStatus({ farmId: resolvedFarmId!, signal }),
      staleTime: 30_000,
      initialData: params?.initialData,
    }),
  )
}

export function useWaterQualityMeasurements(params: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  parameterName?: string
  parameter?: string
  limit?: number
  requireSystem?: boolean
  enabled?: boolean
  farmId?: string | null
  initialData?: QueryResult<Database["public"]["Views"]["api_water_quality_measurements"]["Row"]>
}) {
  const { farmId } = useActiveFarm()
  const { session } = useAuth()
  const resolvedFarmId = params.farmId ?? farmId
  const enabledBase = Boolean(session) && Boolean(resolvedFarmId)
  const enabledSystem = enabledBase && Boolean(params.systemId)
  const enabled = Boolean(params.enabled ?? true) && (params.requireSystem ? enabledSystem : enabledBase)
  return useQuery(
    waterQualityQueryOptions({
      queryKey: [
        "wq",
        "measurements",
        resolvedFarmId,
        params.systemId ?? null,
        params.dateFrom ?? null,
        params.dateTo ?? null,
        params.parameterName ?? params.parameter ?? null,
        params.limit ?? null,
      ],
      enabled,
      queryFn: ({ signal }) =>
        getWaterQualityMeasurements({
          farmId: resolvedFarmId!,
          systemId: params.systemId,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          parameterName: params.parameterName ?? params.parameter,
          limit: params.limit,
          signal,
        }),
      staleTime: 60_000,
      initialData: params.initialData,
    }),
  )
}

export function useDailyWaterQualityRating(params: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  requireSystem?: boolean
  limit?: number
  enabled?: boolean
  farmId?: string | null
  initialData?: QueryResult<Database["public"]["Views"]["api_daily_water_quality_rating"]["Row"]>
}) {
  const { farmId } = useActiveFarm()
  const { session } = useAuth()
  const resolvedFarmId = params.farmId ?? farmId
  const enabledBase = Boolean(session) && Boolean(resolvedFarmId)
  const enabledSystem = enabledBase && Boolean(params.systemId)
  const enabled = Boolean(params.enabled ?? true) && (params.requireSystem ? enabledSystem : enabledBase)
  return useQuery(
    waterQualityQueryOptions({
      queryKey: [
        "wq",
        "daily_rating",
        resolvedFarmId,
        params.systemId ?? null,
        params.dateFrom ?? null,
        params.dateTo ?? null,
        params.limit ?? null,
      ],
      enabled,
      queryFn: ({ signal }) =>
        getDailyWaterQualityRating({
          farmId: resolvedFarmId!,
          systemId: params.systemId,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          limit: params.limit,
          signal,
        }),
      staleTime: 60_000,
      initialData: params.initialData,
    }),
  )
}

export function useWaterQualityOverlay(params: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  requireSystem?: boolean
  enabled?: boolean
  farmId?: string | null
  initialData?: QueryResult<Database["public"]["Functions"]["api_daily_overlay"]["Returns"][number]>
}) {
  const { farmId } = useActiveFarm()
  const { session } = useAuth()
  const resolvedFarmId = params.farmId ?? farmId
  const enabledBase = Boolean(session) && Boolean(resolvedFarmId)
  const enabledSystem = enabledBase && Boolean(params.systemId)
  const enabled = Boolean(params.enabled ?? true) && (params.requireSystem ? enabledSystem : enabledBase)
  return useQuery(
    waterQualityQueryOptions({
      queryKey: ["wq", "overlay", resolvedFarmId, params.systemId ?? null, params.dateFrom ?? null, params.dateTo ?? null],
      enabled,
      queryFn: ({ signal }) =>
        getDailyOverlay({
          farmId: resolvedFarmId!,
          systemId: params.systemId,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          signal,
        }),
      staleTime: 60_000,
      initialData: params.initialData,
    }),
  )
}

export function useAlertThresholds(params?: {
  farmId?: string | null
  initialData?: QueryResult<Database["public"]["Views"]["api_alert_thresholds"]["Row"]>
}) {
  const { farmId } = useActiveFarm()
  const { session } = useAuth()
  const resolvedFarmId = params?.farmId ?? farmId
  const enabled = Boolean(session) && Boolean(resolvedFarmId)
  return useQuery(
    waterQualityQueryOptions({
      queryKey: ["wq", "thresholds", resolvedFarmId],
      enabled,
      queryFn: ({ signal }) => getAlertThresholds({ farmId: resolvedFarmId!, signal }),
      staleTime: 60_000,
      initialData: params?.initialData,
    }),
  )
}

export function useRecordWaterQuality() {
  return useInsertMutation({
    table: "water_quality_measurement",
    activityTableName: "water_quality_measurement",
    recentEntryKey: "water_quality",
    buildOptimisticEntry: (payload) => {
      const entry = Array.isArray(payload) ? payload[0] : payload
      if (entry) {
        return {
          id: `optimistic-${Date.now()}`,
          date: entry.date,
          time: entry.time ?? null,
          system_id: entry.system_id,
          parameter_name: entry.parameter_name ?? null,
          parameter_value: entry.parameter_value ?? null,
          water_depth: entry.water_depth ?? null,
          created_at: new Date().toISOString(),
          status: "pending",
        }
      }
      return null
    },
    invalidate: ["dashboard", "water-quality", "recent-activity", "recent-entries"],
    successMessage: "Water quality data recorded.",
    errorMessage: "Failed to record water quality data.",
  })
}
