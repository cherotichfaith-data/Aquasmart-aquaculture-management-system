"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/hooks/use-active-farm"
import {
  getAlertThresholds,
  getDailyOverlay,
  getDailyWaterQualityRating,
  getLatestWaterQualityRating,
  getWaterQualityAsOf,
  getWaterQualityMeasurements,
  getWaterQualityStatus,
  upsertFarmThreshold,
} from "@/lib/api/water-quality"
import { insertData } from "@/lib/supabase-actions"
import {
  addOptimisticActivity,
  invalidateDashboardQueries,
  invalidateRecentActivityQueries,
  invalidateRecentEntriesQueries,
  invalidateWaterQualityQueries,
} from "@/lib/hooks/use-mutation-invalidation"
import { useToast } from "@/hooks/use-toast"
import type { TablesInsert } from "@/lib/types/database"

export function useWaterQualityAsOf() {
  const { farmId } = useActiveFarm()
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(farmId)
  return useQuery({
    queryKey: ["wq", "as_of", farmId],
    enabled,
    queryFn: ({ signal }) => getWaterQualityAsOf({ farmId: farmId!, signal }),
    staleTime: 60_000,
  })
}

export function useWaterQualityStatus(systemId?: number) {
  const { farmId } = useActiveFarm()
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(farmId)
  return useQuery({
    queryKey: ["wq", "status", farmId, systemId ?? null],
    enabled,
    queryFn: ({ signal }) => getWaterQualityStatus({ farmId: farmId!, systemId, signal }),
    staleTime: 30_000,
  })
}

export function useLatestWaterQualityRating(systemId?: number) {
  const { farmId } = useActiveFarm()
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(farmId)
  return useQuery({
    queryKey: ["wq", "latest_rating", farmId, systemId ?? null],
    enabled,
    queryFn: ({ signal }) => getLatestWaterQualityRating({ farmId: farmId!, systemId, signal }),
    staleTime: 30_000,
  })
}

export function useWaterQualityMeasurements(params: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  parameterName?: string
  parameter?: string
  limit?: number
  requireSystem?: boolean
}) {
  const { farmId } = useActiveFarm()
  const { session } = useAuth()
  const enabledBase = Boolean(session) && Boolean(farmId)
  const enabledSystem = enabledBase && Boolean(params.systemId)
  const enabled = params.requireSystem ? enabledSystem : enabledBase
  return useQuery({
    queryKey: [
      "wq",
      "measurements",
      farmId,
      params.systemId ?? null,
      params.dateFrom ?? null,
      params.dateTo ?? null,
      params.parameterName ?? params.parameter ?? null,
      params.limit ?? null,
    ],
    enabled,
    queryFn: ({ signal }) =>
      getWaterQualityMeasurements({
        farmId: farmId!,
        systemId: params.systemId,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        parameterName: params.parameterName ?? params.parameter,
        limit: params.limit,
        signal,
      }),
    staleTime: 60_000,
  })
}

export function useDailyWaterQualityRating(params: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  requireSystem?: boolean
}) {
  const { farmId } = useActiveFarm()
  const { session } = useAuth()
  const enabledBase = Boolean(session) && Boolean(farmId)
  const enabledSystem = enabledBase && Boolean(params.systemId)
  const enabled = params.requireSystem ? enabledSystem : enabledBase
  return useQuery({
    queryKey: ["wq", "daily_rating", farmId, params.systemId ?? null, params.dateFrom ?? null, params.dateTo ?? null],
    enabled,
    queryFn: ({ signal }) =>
      getDailyWaterQualityRating({
        farmId: farmId!,
        systemId: params.systemId,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        signal,
      }),
    staleTime: 60_000,
  })
}

export function useWaterQualityOverlay(params: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  requireSystem?: boolean
}) {
  const { farmId } = useActiveFarm()
  const { session } = useAuth()
  const enabledBase = Boolean(session) && Boolean(farmId)
  const enabledSystem = enabledBase && Boolean(params.systemId)
  const enabled = params.requireSystem ? enabledSystem : enabledBase
  return useQuery({
    queryKey: ["wq", "overlay", farmId, params.systemId ?? null, params.dateFrom ?? null, params.dateTo ?? null],
    enabled,
    queryFn: ({ signal }) =>
      getDailyOverlay({
        farmId: farmId!,
        systemId: params.systemId,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        signal,
      }),
    staleTime: 60_000,
  })
}

export function useAlertThresholds() {
  const { farmId } = useActiveFarm()
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(farmId)
  return useQuery({
    queryKey: ["wq", "thresholds", farmId],
    enabled,
    queryFn: ({ signal }) => getAlertThresholds({ farmId: farmId!, signal }),
    staleTime: 60_000,
  })
}

export function useUpsertFarmThreshold() {
  const qc = useQueryClient()
  const { farmId } = useActiveFarm()

  return useMutation({
    mutationFn: (input: { low_do_threshold?: number | null; high_ammonia_threshold?: number | null; high_mortality_threshold?: number | null }) =>
      upsertFarmThreshold({ farmId: farmId!, ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wq", "thresholds", farmId] })
      qc.invalidateQueries({ queryKey: ["wq", "status", farmId] })
    },
  })
}

export function useRecordWaterQuality() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (payload: TablesInsert<"water_quality_measurement"> | TablesInsert<"water_quality_measurement">[]) => {
      const result = await insertData("water_quality_measurement", payload)
      if (!result.success) throw result.error
      return result.data
    },
    onMutate: () => {
      addOptimisticActivity(queryClient, { tableName: "water_quality_measurement" })
    },
    onSuccess: () => {
      invalidateDashboardQueries(queryClient)
      invalidateWaterQualityQueries(queryClient)
      invalidateRecentActivityQueries(queryClient)
      invalidateRecentEntriesQueries(queryClient)
      toast({ title: "Success", description: "Water quality data recorded." })
    },
    onError: (error: any) => {
      const message = error?.message ?? "Failed to record water quality data."
      toast({ variant: "destructive", title: "Error", description: message })
    },
  })
}
