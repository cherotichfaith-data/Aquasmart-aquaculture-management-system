"use client"

import { invalidateSystemWriteQueries } from "@/lib/cache/react-query"
import { createSystem } from "@/lib/commands/operations"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"
import type { Database } from "@/lib/types/database"

type SystemInsertWithUnit = Database["public"]["Tables"]["system"]["Insert"] & {
  unit?: string | null
}

export function useCreateSystem() {
  return useWriteThroughMutation({
    mutationFn: createSystem,
    activityTableName: "system",
    recentEntryKey: "systems",
    buildOptimisticEntry: (payload) => {
      const systemPayload = payload as SystemInsertWithUnit
      return {
        id: `optimistic-${Date.now()}`,
        commissioned_at: systemPayload.commissioned_at ?? null,
        unit: systemPayload.unit ?? null,
        name: systemPayload.name ?? null,
        type: systemPayload.type ?? null,
        growth_stage: systemPayload.growth_stage ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
    },
    invalidate: async ({ queryClient, result }) =>
      invalidateSystemWriteQueries(queryClient, {
        farmId: result.meta.farmId,
        date: result.meta.date,
      }),
    successMessage: "System created successfully.",
    errorMessage: "Failed to create system.",
  })
}
