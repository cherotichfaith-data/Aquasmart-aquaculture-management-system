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
import { invalidateWaterQualityWriteQueries } from "@/lib/cache/react-query"
import type { WaterQualityInput } from "@/lib/commands/operations"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"
import { buildOfflinePendingResult } from "@/lib/offline/pending-result"
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation"
import type { Database, Tables } from "@/lib/types/database"

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
    initialData: params.enabled ? params.initialData : undefined,
    initialDataUpdatedAt: params.enabled && params.initialData ? 0 : undefined,
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
  const { farmId } = useActiveFarm()

  const offlineMutation = useOfflineMutation<
    WaterQualityInput,
    {
      systemId: number
      date: string
      measuredAt: string
      time: string
      parameterName: WaterQualityInput[number]["parameter_name"]
      parameterValue: number
      waterDepth: number
      locationReference?: string | null
    },
    {
      data: Tables<"water_quality_measurement">[]
      meta: { farmId: string; systemId: number | null; date: string; pendingSync?: boolean; localIds?: string[] }
    }
  >({
    tableName: "waterQuality",
    buildRecords: (payload) =>
      payload.map((entry) => ({
        systemId: entry.system_id,
        date: entry.date,
        measuredAt: entry.measured_at,
        time: entry.time,
        parameterName: entry.parameter_name,
        parameterValue: entry.parameter_value,
        waterDepth: entry.water_depth,
        locationReference: entry.location_reference ?? null,
      })),
    buildPendingResult: ({ input, localIds }) =>
      buildOfflinePendingResult({
        data: [] as Tables<"water_quality_measurement">[],
        farmId,
        systemId: input[0]?.system_id ?? null,
        date: input[0]?.date ?? new Date().toISOString().slice(0, 10),
        localIds,
      }),
    combineSyncedResponses: ({ input, responses, localIds }) => {
      const normalizedResponses = responses.filter(
        (
          response,
        ): response is {
          data: Tables<"water_quality_measurement">[]
          meta: { farmId: string; systemId: number; date: string }
        } => Boolean(response && typeof response === "object" && "data" in response && "meta" in response),
      )
      const firstMeta = normalizedResponses[0]?.meta
      return {
        data: normalizedResponses.flatMap((response) => response.data),
        meta: {
          farmId: firstMeta?.farmId ?? farmId ?? "",
          systemId: firstMeta?.systemId ?? input[0]?.system_id ?? null,
          date: firstMeta?.date ?? input[0]?.date ?? new Date().toISOString().slice(0, 10),
          localIds,
        },
      }
    },
  })

  return useWriteThroughMutation({
    mutationFn: offlineMutation.mutate,
    activityTableName: "water_quality_measurement",
    recentEntryKey: "water_quality",
    buildOptimisticEntry: (payload) => {
      const entry = payload[0]
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
    invalidate: async ({ queryClient, result }) =>
      invalidateWaterQualityWriteQueries(queryClient, {
        farmId: result.meta.farmId,
        date: result.meta.date,
      }),
    successMessage: "Water quality data recorded.",
    errorMessage: "Failed to record water quality data.",
  })
}
