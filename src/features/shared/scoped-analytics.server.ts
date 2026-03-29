import { createClient } from "@/lib/supabase/server"
import { buildTimeBoundsFromAvailableRange, fetchTimePeriodBounds } from "@/lib/time-period"
import { resolveSystemTimelineWindow } from "@/lib/system-timeline-window"
import type { Database, Enums } from "@/lib/types/database"
import type { TimePeriod } from "@/lib/time-period"
import { mapSystemRowToOption, type SystemOptionSource } from "@/lib/system-options"

type ServerClient = Awaited<ReturnType<typeof createClient>>

export type ScopedAnalyticsStage = "all" | Enums<"system_growth_stage">
export type ScopedAnalyticsTimePeriod = TimePeriod
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
  systemId?: number,
) {
  const farmBounds = await fetchTimePeriodBounds(supabase, {
    farmId,
    timePeriod,
    scope,
  })

  if (!systemId || !Number.isFinite(systemId)) return farmBounds

  const { data, error } = await supabase.rpc("api_system_timeline_bounds", {
    p_farm_id: farmId,
    p_system_id: systemId,
  })

  if (error) {
    throw new Error(error.message)
  }

  const timelineRow = ((data ?? []) as Database["public"]["Functions"]["api_system_timeline_bounds"]["Returns"])[0] ?? null
  const timeline = resolveSystemTimelineWindow(timelineRow)

  if (!timeline?.fullStart || !timeline.fullEnd) return farmBounds

  return buildTimeBoundsFromAvailableRange({
    timePeriod,
    availableFromDate: timeline.fullStart,
    latestAvailableDate: timeline.fullEnd,
    anchorScope: `${scope}:system`,
  })
}

export async function getScopedSystemOptions(
  supabase: ServerClient,
  farmId: string,
  stage: ScopedAnalyticsStage,
): Promise<ScopedSystemOption[]> {
  let query = supabase
    .from("system")
    .select("id, farm_id, growth_stage, is_active, name, type, unit")
    .eq("farm_id", farmId)

  if (stage !== "all") {
    query = query.eq("growth_stage", stage)
  }

  const { data, error } = await query.order("name", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as unknown as SystemOptionSource[])
    .map(mapSystemRowToOption)
    .sort((a, b) => a.label.localeCompare(b.label))
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
