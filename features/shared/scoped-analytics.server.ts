import { createClient } from "@/utils/supabase/server"
import { fetchTimePeriodBounds } from "@/lib/time-period-bounds"
import type { Database, Enums } from "@/lib/types/database"

type ServerClient = Awaited<ReturnType<typeof createClient>>

export type ScopedAnalyticsStage = "all" | Enums<"system_growth_stage">
export type ScopedAnalyticsTimePeriod = Enums<"time_period">
export type ScopedSystemOption = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]

export function parseSelectedNumericId(value?: string | null): number | undefined {
  if (!value || value === "all") return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function getScopedTimeBounds(
  supabase: ServerClient,
  farmId: string,
  timePeriod: ScopedAnalyticsTimePeriod,
  scope: Parameters<typeof fetchTimePeriodBounds>[1]["scope"],
) {
  return fetchTimePeriodBounds(supabase as never, {
    farmId,
    timePeriod,
    scope,
  })
}

export async function getScopedSystemOptions(
  supabase: ServerClient,
  farmId: string,
  stage: ScopedAnalyticsStage,
): Promise<ScopedSystemOption[]> {
  const { data, error } = await supabase.rpc("api_system_options_rpc", {
    p_farm_id: farmId,
    p_stage: stage !== "all" ? stage : undefined,
    p_active_only: true,
  })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as ScopedSystemOption[]
}

export async function getScopedBatchSystems(
  supabase: ServerClient,
  batchId?: number,
): Promise<Array<{ system_id: number }>> {
  if (!batchId || !Number.isFinite(batchId)) return []

  const { data, error } = await supabase
    .from("fish_stocking")
    .select("system_id")
    .eq("batch_id", batchId)
    .not("system_id", "is", null)

  if (error) {
    throw new Error(error.message)
  }

  const ids = Array.from(
    new Set((data ?? []).map((row) => row.system_id).filter((id): id is number => typeof id === "number")),
  )
  return ids.map((system_id) => ({ system_id }))
}
