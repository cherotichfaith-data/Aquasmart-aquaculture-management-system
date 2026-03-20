"use client"

import { useInsertMutation } from "@/lib/hooks/use-insert-mutation"
import type { Database } from "@/lib/types/database"

type SystemInsertWithUnit = Database["public"]["Tables"]["system"]["Insert"] & {
  unit?: string | null
}

export function useCreateSystem() {
  return useInsertMutation({
    table: "system",
    activityTableName: "system",
    recentEntryKey: "systems",
    buildOptimisticEntry: (payload) => {
      if (Array.isArray(payload)) return null
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
    invalidate: ["dashboard", "options", "recent-activity", "recent-entries"],
    successMessage: "System created successfully.",
    errorMessage: "Failed to create system.",
  })
}
