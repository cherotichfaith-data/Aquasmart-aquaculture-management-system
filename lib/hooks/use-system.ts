"use client"

import { useInsertMutation } from "@/lib/hooks/use-insert-mutation"

export function useCreateSystem() {
  return useInsertMutation({
    table: "system",
    activityTableName: "system",
    recentEntryKey: "systems",
    buildOptimisticEntry: (payload) => {
      if (Array.isArray(payload)) return null
      return {
        id: `optimistic-${Date.now()}`,
        name: payload.name ?? null,
        type: payload.type ?? null,
        growth_stage: payload.growth_stage ?? null,
        created_at: new Date().toISOString(),
        status: "pending",
      }
    },
    invalidate: ["dashboard", "options", "recent-activity", "recent-entries"],
    successMessage: "System created successfully.",
    errorMessage: "Failed to create system.",
  })
}
