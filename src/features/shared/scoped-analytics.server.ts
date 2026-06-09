import { createClient } from "@/lib/supabase/server"
import { fetchTimePeriodBounds } from "@/lib/time-period"
import type { Database, Enums } from "@/lib/types/database"
import type { TimePeriod } from "@/lib/time-period"
import { resolveSystemIdFromFilterValue } from "@/lib/system-options"

type ServerClient = Awaited<ReturnType<typeof createClient>>

export type ScopedAnalyticsStage = "all" | Enums<"system_growth_stage">
export type ScopedAnalyticsTimePeriod = TimePeriod
export type ScopedSystemOption = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]

export function parseSelectedNumericId(value?: string | null): number | undefined {
  if (!value || value === "all") return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function cleanScopedFilterState<T extends { selectedSystem: string; selectedBatch?: string }>(
  filters: T,
  systems: Array<{ id: number | null }>,
): T {
  if (filters.selectedSystem === "all") return filters
  const selectedSystemId = resolveSystemIdFromFilterValue(filters.selectedSystem, systems)
  return selectedSystemId
    ? { ...filters, selectedSystem: String(selectedSystemId) }
    : { ...filters, selectedSystem: "all" }
}

export async function getScopedTimeBounds(
  supabase: ServerClient,
  farmId: string,
  timePeriod: ScopedAnalyticsTimePeriod,
  scope: Parameters<typeof fetchTimePeriodBounds>[1]["scope"],
  systemId?: number,
) {
  return fetchTimePeriodBounds(supabase as never, {
    farmId,
    timePeriod,
    scope,
    systemId,
  })
}

export async function getScopedSystemOptions(
  supabase: ServerClient,
  farmId: string,
  stage: ScopedAnalyticsStage,
): Promise<ScopedSystemOption[]> {
  const { data, error } = await supabase.rpc("api_system_options_rpc", {
    p_farm_id: farmId,
    p_stage: stage === "all" ? undefined : stage,
    p_active_only: true,
  })

  if (error) throw error
  return (data ?? []) as ScopedSystemOption[]
}

export async function getScopedBatchSystems(
  supabase: ServerClient,
  batchId?: number,
): Promise<Array<{ system_id: number }>> {
  if (!batchId || !Number.isFinite(batchId)) return []

  const { data, error } = await supabase.rpc("api_batch_system_ids", {
    p_batch_id: batchId,
  })

  if (error) throw error
  return ((data ?? []) as Array<{ system_id: number | null }>)
    .map((row) => row.system_id)
    .filter((system_id): system_id is number => typeof system_id === "number" && Number.isFinite(system_id))
    .map((system_id) => ({ system_id }))
}
