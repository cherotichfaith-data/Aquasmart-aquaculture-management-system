import { createClient } from "@/lib/supabase/server"
import { buildTimeBoundsFromAvailableRange, fetchTimePeriodBounds } from "@/lib/time-period"
import { resolveSystemTimelineWindow } from "@/lib/system-timeline-window"
import type { Database, Enums } from "@/lib/types/database"
import type { TimePeriod } from "@/lib/time-period"
import { mapSystemRowToOption, sortSystemsByCurrentProduction, type SystemOptionSource } from "@/lib/system-options"
import { resolveSystemIdFromFilterValue } from "@/lib/system-options"

type ServerClient = Awaited<ReturnType<typeof createClient>>

export type ScopedAnalyticsStage = "all" | Enums<"system_growth_stage">
export type ScopedAnalyticsTimePeriod = TimePeriod
export type ScopedSystemOption = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]

async function getFirstStockingDateBySystemId(supabase: ServerClient, systemIds: number[]) {
  const firstStockingBySystemId = new Map<number, string>()
  if (systemIds.length === 0) return firstStockingBySystemId

  const { data, error } = await supabase
    .from("fish_stocking")
    .select("system_id, date")
    .in("system_id", systemIds)
    .order("date", { ascending: true })

  if (error) throw error

  ;(data ?? []).forEach((row) => {
    if (typeof row.system_id !== "number" || !row.date || firstStockingBySystemId.has(row.system_id)) return
    firstStockingBySystemId.set(row.system_id, row.date)
  })

  return firstStockingBySystemId
}

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
  const farmBounds = await fetchTimePeriodBounds(supabase as never, {
    farmId,
    timePeriod,
    scope,
  })

  if (!systemId || !Number.isFinite(systemId)) return farmBounds

  const { data: selectedSystem, error: selectedSystemError } = await supabase
    .from("system")
    .select("id")
    .eq("farm_id", farmId)
    .eq("is_active", true)
    .eq("id", systemId)
    .maybeSingle()

  if (selectedSystemError || selectedSystem?.id !== systemId) return farmBounds

  const { data, error } = await supabase.rpc("api_system_timeline_bounds", {
    p_farm_id: farmId,
    p_system_id: systemId,
  })

  if (error) {
    throw error
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
    .select("id, cage_status, commissioned_at, farm_id, growth_stage, is_active, name, type, unit")
    .eq("farm_id", farmId)
    .eq("is_active", true)

  if (stage !== "all") {
    query = query.eq("growth_stage", stage)
  }

  const { data, error } = await query
    .order("commissioned_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })

  if (error) {
    throw error
  }

  const sourceRows = (data ?? []) as unknown as SystemOptionSource[]
  const firstStockingBySystemId = await getFirstStockingDateBySystemId(
    supabase,
    sourceRows.map((row) => row.id).filter((id): id is number => typeof id === "number"),
  )

  return sortSystemsByCurrentProduction(
    sourceRows.map((row) => ({ ...row, production_start: firstStockingBySystemId.get(row.id) ?? null })),
  )
    .map(mapSystemRowToOption)
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
    throw error
  }

  const stockedIds = Array.from(
    new Set((data ?? []).map((row) => row.system_id).filter((id): id is number => typeof id === "number")),
  )
  if (stockedIds.length === 0) return []

  const lineageIds = new Set(stockedIds)
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
