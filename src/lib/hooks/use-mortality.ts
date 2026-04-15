"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/cache/query-keys"
import { useAuth } from "@/components/providers/auth-provider"
import { getAlertLog, getMortalityEvents, getSurvivalTrend } from "@/lib/api/mortality"
import { invalidateMortalityWriteQueries } from "@/lib/cache/react-query"
import type { MortalityInput } from "@/lib/commands/operations"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"
import { buildOfflinePendingResult } from "@/lib/offline/pending-result"
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation"
import type { AlertSeverity, MortalityCause } from "@/lib/mortality"
import type { Tables, TablesInsert } from "@/lib/types/database"

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
  const { farmId } = useActiveFarm()

  const offlineMutation = useOfflineMutation<
    MortalityInput,
    {
      systemId: number
      farmId?: string | null
      batchId?: number | null
      date: string
      numberOfFishMortality: number
      avgDeadWtG?: number | null
      cause: MortalityInput["cause"]
      isMassMortality?: boolean | null
      notes?: string | null
    },
    {
      data: Tables<"fish_mortality">
      meta: { farmId: string; systemId: number | null; date: string; pendingSync?: boolean; localIds?: string[] }
    }
  >({
    tableName: "mortality",
    buildRecords: (payload) => [
      {
        systemId: payload.system_id,
        farmId: payload.farm_id,
        batchId: payload.batch_id ?? null,
        date: payload.date,
        numberOfFishMortality: payload.number_of_fish_mortality,
        avgDeadWtG: payload.avg_dead_wt_g ?? null,
        cause: payload.cause,
        isMassMortality: payload.is_mass_mortality ?? null,
        notes: payload.notes ?? null,
      },
    ],
    buildPendingResult: ({ input, localIds }) =>
      buildOfflinePendingResult({
        data: { id: 0 } as Tables<"fish_mortality">,
        farmId: input.farm_id ?? farmId,
        systemId: input.system_id,
        date: input.date,
        localIds,
      }),
  })

  return useWriteThroughMutation({
    mutationFn: offlineMutation.mutate,
    activityTableName: "fish_mortality",
    recentEntryKey: "mortality",
    buildOptimisticEntry: (payload: MortalityEventInsert) => ({
      id: `optimistic-${Date.now()}`,
      date: payload.date,
      system_id: payload.system_id,
      batch_id: payload.batch_id ?? null,
      number_of_fish_mortality: payload.number_of_fish_mortality,
      created_at: new Date().toISOString(),
      status: "pending",
    }),
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
