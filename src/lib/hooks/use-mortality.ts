"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/cache/query-keys"
import { useAuth } from "@/components/providers/auth-provider"
import { getAlertLog, getMortalityEvents, getSurvivalTrend } from "@/lib/api/mortality"
import { invalidateMortalityWriteQueries } from "@/lib/cache/react-query"
import { recordMortality } from "@/lib/commands/operations"
import type { AlertSeverity, MortalityCause } from "@/lib/mortality"
import type { TablesInsert } from "@/lib/types/database"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"

type MortalityEventInsert = Omit<TablesInsert<"fish_mortality">, "cause"> & {
  cause?: MortalityCause
}

export function useMortalityEvents(params?: {
  farmId?: string | null
  systemId?: number
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  enabled?: boolean
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: queryKeys.mortality.events(params),
    queryFn: ({ signal }) => getMortalityEvents({ ...params, signal }),
    enabled: Boolean(session) && (params?.enabled ?? true),
    staleTime: 60_000,
  })
}

export function useAlertLog(params?: {
  farmId?: string | null
  systemId?: number
  severity?: AlertSeverity
  ruleCodes?: string[]
  unacknowledgedOnly?: boolean
  limit?: number
  enabled?: boolean
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: queryKeys.mortality.alertLog(params),
    queryFn: ({ signal }) => getAlertLog({ ...params, signal }),
    enabled: Boolean(session) && (params?.enabled ?? true),
    staleTime: 30_000,
  })
}

export function useSurvivalTrend(params: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  enabled?: boolean
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: queryKeys.mortality.survivalTrend(params),
    queryFn: ({ signal }) => getSurvivalTrend({ ...params, signal }),
    enabled: Boolean(session) && Boolean(params.systemId) && Boolean(params.dateFrom) && (params.enabled ?? true),
    staleTime: 60_000,
  })
}

export function useRecordMortality() {
  return useWriteThroughMutation({
    mutationFn: recordMortality,
    activityTableName: "fish_mortality",
    recentEntryKey: "mortality",
    buildOptimisticEntry: (payload: MortalityEventInsert) => {
      return {
        id: `optimistic-${Date.now()}`,
        date: payload.date,
        system_id: payload.system_id,
        batch_id: payload.batch_id ?? null,
        number_of_fish_mortality: payload.number_of_fish_mortality,
        created_at: new Date().toISOString(),
        status: "pending",
      }
    },
    invalidate: async ({ queryClient, result }) => {
      await invalidateMortalityWriteQueries(queryClient, {
        farmId: result.meta.farmId,
        systemId: result.meta.systemId ?? 0,
        date: result.meta.date,
      })
    },
    successMessage: "Mortality recorded.",
    errorMessage: "Failed to record mortality.",
  })
}
