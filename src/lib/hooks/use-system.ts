"use client"

import { invalidateAfterWrite } from "@/lib/cache/react-query"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"
import { buildOfflinePendingResult } from "@/lib/offline/pending-result"
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation"
import type { Database } from "@/lib/types/database"

type SystemInsertWithUnit = Database["public"]["Tables"]["system"]["Insert"] & {
  unit?: string | null
}
type SystemRow = Database["public"]["Tables"]["system"]["Row"]

export function useCreateSystem() {
  const { farmId } = useActiveFarm()

  const offlineMutation = useOfflineMutation<
    SystemInsertWithUnit,
    {
      farmId?: string | null
      commissionedAt?: string | null
      unit?: string | null
      name: string
      type: SystemInsertWithUnit["type"]
      growthStage: SystemInsertWithUnit["growth_stage"]
      volume?: number | null
      depth?: number | null
    },
    {
      data: SystemRow
      meta: { farmId: string; systemId: number | null; date: string; pendingSync?: boolean; localIds?: string[] }
    }
  >({
    tableName: "system",
    buildRecords: (payload) => [
      {
        farmId: payload.farm_id ?? farmId,
        commissionedAt: payload.commissioned_at ?? null,
        unit: payload.unit ?? null,
        name: payload.name,
        type: payload.type,
        growthStage: payload.growth_stage,
        volume: payload.volume ?? null,
        depth: payload.depth ?? null,
      },
    ],
    buildPendingResult: ({ input, localIds }) =>
      buildOfflinePendingResult({
        data: { id: 0 } as SystemRow,
        farmId: input.farm_id ?? farmId,
        systemId: null,
        date: input.commissioned_at ?? new Date().toISOString(),
        localIds,
      }),
  })

  return useWriteThroughMutation({
    mutationFn: offlineMutation.mutate,
    activityTableName: "system",
    recentEntryKey: "systems",
    buildOptimisticEntry: (payload: SystemInsertWithUnit) => {
      return {
        id: `optimistic-${Date.now()}`,
        commissioned_at: payload.commissioned_at ?? null,
        unit: payload.unit ?? null,
        name: payload.name ?? null,
        type: payload.type ?? null,
        growth_stage: payload.growth_stage ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
    },
    invalidate: async ({ queryClient, result }) =>
      invalidateAfterWrite(queryClient, {
        type: "system",
        farmId: result.meta.farmId,
        date: result.meta.date,
      }),
    successMessage: "System created successfully.",
    errorMessage: "Failed to create system.",
  })
}
