"use client"

import { invalidateAfterWrite } from "@/lib/cache/react-query"
import { useWriteThroughMutation } from "@/lib/hooks/use-write-through-mutation"
import type { Database } from "@/lib/types/database"

type SystemInsertWithUnit = Database["public"]["Tables"]["system"]["Insert"] & {
  unit?: string | null
}

async function createSystem(payload: SystemInsertWithUnit) {
  const response = await fetch("/api/system/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : "Failed to create system."
    throw new Error(message)
  }

  return body as {
    data: Database["public"]["Tables"]["system"]["Row"]
    meta: { farmId: string; systemId: number | null; date: string }
  }
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
      invalidateAfterWrite(queryClient, {
        type: "system",
        farmId: result.meta.farmId,
        date: result.meta.date,
      }),
    successMessage: "System created successfully.",
    errorMessage: "Failed to create system.",
  })
}
