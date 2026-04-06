"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { getFarmKpisToday, type FarmKpisTodayRow } from "@/lib/api/dashboard"
import type { QueryResult } from "@/lib/supabase-client"

export function useFarmKpisToday(params?: {
  farmId?: string | null
  initialData?: QueryResult<FarmKpisTodayRow>
}) {
  const { farmId: activeFarmId } = useActiveFarm()
  const { session } = useAuth()
  const farmId = params?.farmId ?? activeFarmId
  const enabled = Boolean(session) && Boolean(farmId)

  return useQuery({
    queryKey: ["farm-kpis-today", farmId],
    queryFn: ({ signal }) => getFarmKpisToday({ farmId, signal }),
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    initialData: enabled && params?.initialData ? params.initialData : undefined,
    initialDataUpdatedAt: enabled && params?.initialData ? 0 : undefined,
  })
}
