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

export function resolveScopedSelectedSystemId(
  selectedSystem: string | number | undefined | null,
  systems: Array<{ id: number | null; label?: string | null; name?: string | null; unit?: string | null }>,
): number | undefined {
  return resolveSystemIdFromFilterValue(selectedSystem, systems)
}

export function cleanScopedFilterState<T extends { selectedSystem: string; selectedBatch?: string }>(
  filters: T,
  systems: Array<{ id: number | null }>,
): T {
  if (filters.selectedSystem === "all") return filters
  const selectedSystemId = resolveScopedSelectedSystemId(filters.selectedSystem, systems)
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

  const [cycles, stockings, feeding, sampling, mortality, harvests, transfers] = await Promise.all([
    supabase.from("production_cycle").select("system_id").eq("batch_id", batchId),
    supabase.from("fish_stocking").select("system_id").eq("batch_id", batchId),
    supabase.from("feeding_record").select("system_id").eq("batch_id", batchId),
    supabase.from("fish_sampling_weight").select("system_id").eq("batch_id", batchId),
    supabase.from("fish_mortality").select("system_id").eq("batch_id", batchId),
    supabase.from("fish_harvest").select("system_id").eq("batch_id", batchId),
    supabase
      .from("fish_transfer")
      .select("origin_system_id, target_system_id")
      .eq("batch_id", batchId),
  ])

  const firstError = [cycles, stockings, feeding, sampling, mortality, harvests, transfers].find((result) => result.error)
  if (firstError?.error) throw firstError.error

  const lineageIds = new Set<number>()
  ;[cycles.data, stockings.data, feeding.data, sampling.data, mortality.data, harvests.data].forEach((rows) => {
    ;(rows ?? []).forEach((row) => {
      if (typeof row.system_id === "number" && Number.isFinite(row.system_id)) lineageIds.add(row.system_id)
    })
  })
  ;(transfers.data ?? []).forEach((row) => {
    if (typeof row.origin_system_id === "number" && Number.isFinite(row.origin_system_id)) lineageIds.add(row.origin_system_id)
    if (typeof row.target_system_id === "number" && Number.isFinite(row.target_system_id)) lineageIds.add(row.target_system_id)
  })
  if (lineageIds.size === 0) return []

  for (let depth = 0; depth < 3; depth += 1) {
    const sourceIds = Array.from(lineageIds)
    const { data: transferRows, error: transferError } = await supabase
      .from("fish_transfer")
      .select("origin_system_id, target_system_id")
      .in("origin_system_id", sourceIds)
      .not("target_system_id", "is", null)

    if (transferError) throw transferError

    const beforeSize = lineageIds.size
    ;(transferRows ?? []).forEach((row) => {
      if (typeof row.target_system_id === "number" && Number.isFinite(row.target_system_id)) {
        lineageIds.add(row.target_system_id)
      }
    })
    if (lineageIds.size === beforeSize) break
  }

  const { data: activeRows, error: activeError } = await supabase
    .from("system")
    .select("id")
    .in("id", Array.from(lineageIds))
    .eq("is_active", true)

  if (activeError) throw activeError

  return Array.from(
    new Set((activeRows ?? []).map((row) => row.id).filter((id): id is number => typeof id === "number")),
  ).map((system_id) => ({ system_id }))
}
