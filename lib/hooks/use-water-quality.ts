"use client"

import { useQuery } from "@tanstack/react-query"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { getWaterQualityMeasurements, getWaterQualityRatings } from "@/lib/api/water-quality"
import { useAuth } from "@/components/providers/auth-provider"
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

export function useWaterQualityRatings(params?: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  farmId?: string | null
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId)
  return useQuery({
    queryKey: [
      "water-quality",
      "ratings",
      params?.farmId ?? "all",
      params?.systemId ?? "all",
      params?.dateFrom ?? "",
      params?.dateTo ?? "",
      params?.limit ?? "all",
    ],
    queryFn: ({ signal }) => getWaterQualityRatings({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useWaterQualityMeasurements(params?: {
  systemId?: number
  parameter?: Enums<"water_quality_parameters">
  dateFrom?: string
  dateTo?: string
  limit?: number
  farmId?: string | null
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId)
  return useQuery({
    queryKey: [
      "water-quality",
      "measurements",
      params?.farmId ?? "all",
      params?.systemId ?? "all",
      params?.parameter ?? "all",
      params?.dateFrom ?? "",
      params?.dateTo ?? "",
      params?.limit ?? "all",
    ],
    queryFn: ({ signal }) => getWaterQualityMeasurements({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
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
