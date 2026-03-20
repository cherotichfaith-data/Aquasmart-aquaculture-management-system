"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/lib/hooks/app/use-toast"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { getSessionUser } from "@/lib/supabase/session"
import { getAlertLog, getMortalityEvents, getSurvivalTrend } from "@/lib/api/mortality"
import type { AlertSeverity, MortalityEventInsert } from "@/lib/types/mortality"
import {
  addOptimisticActivity,
  addOptimisticRecentEntry,
  invalidateDashboardQueries,
  invalidateInventoryQueries,
  invalidateRecentActivityQueries,
  invalidateRecentEntriesQueries,
  invalidateReportsQueries,
  restoreRecentEntries,
} from "@/lib/hooks/use-mutation-invalidation"

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
    queryKey: [
      "mortality-events",
      params?.farmId ?? "all",
      params?.systemId ?? "all",
      params?.batchId ?? "all",
      params?.dateFrom ?? "",
      params?.dateTo ?? "",
      params?.limit ?? 100,
    ],
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
    queryKey: [
      "alert-log",
      params?.farmId ?? "all",
      params?.systemId ?? "all",
      params?.severity ?? "all",
      params?.ruleCodes?.join(",") ?? "all-rules",
      params?.unacknowledgedOnly ?? false,
      params?.limit ?? 50,
    ],
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
    queryKey: [
      "survival-trend",
      params.systemId ?? "all",
      params.dateFrom ?? "",
      params.dateTo ?? "",
    ],
    queryFn: ({ signal }) => getSurvivalTrend({ ...params, signal }),
    enabled: Boolean(session) && Boolean(params.systemId) && Boolean(params.dateFrom) && (params.enabled ?? true),
    staleTime: 60_000,
  })
}

export function useRecordMortality() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (payload: MortalityEventInsert) => {
      const supabase = createClient()
      const user = await getSessionUser(supabase, "insertData:fish_mortality:getSession")
      if (!user) {
        throw new Error("No active session")
      }

      const insertPayload = {
        ...payload,
        cause: payload.cause ?? "unknown",
        batch_id: payload.batch_id ?? null,
        avg_dead_wt_g: payload.avg_dead_wt_g ?? null,
        notes: payload.notes ?? null,
        recorded_by: user.id,
      }

      const { data, error } = await (supabase as unknown as { from: (table: string) => any })
        .from("fish_mortality")
        .insert(insertPayload)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: (payload) => {
      addOptimisticActivity(queryClient, { tableName: "fish_mortality" })
      const previous = addOptimisticRecentEntry(queryClient, {
        key: "mortality",
        entry: {
          id: `optimistic-${Date.now()}`,
          date: payload.date,
          system_id: payload.system_id,
          batch_id: payload.batch_id ?? null,
          number_of_fish_mortality: payload.number_of_fish_mortality,
          created_at: new Date().toISOString(),
          status: "pending",
        },
      })
      return { previous }
    },
    onSuccess: () => {
      invalidateDashboardQueries(queryClient)
      invalidateInventoryQueries(queryClient)
      invalidateRecentActivityQueries(queryClient)
      invalidateRecentEntriesQueries(queryClient)
      invalidateReportsQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: ["mortality-events"] })
      queryClient.invalidateQueries({ queryKey: ["alert-log"] })
      queryClient.invalidateQueries({ queryKey: ["survival-trend"] })
      toast({ title: "Success", description: "Mortality recorded." })
    },
    onError: (error: any, _payload, context) => {
      restoreRecentEntries(queryClient, context?.previous)
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message ?? "Failed to record mortality.",
      })
    },
  })
}
