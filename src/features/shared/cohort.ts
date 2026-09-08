import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

/**
 * Per-cage "current cohort" anchor: the start date of the ongoing production
 * cycle homed at each cage. Rows dated earlier belong to a previous occupant.
 * Cages with no homed ongoing cycle are absent from the map (no cutoff).
 *
 * Mirrors the SQL `private.system_cohort_start(bigint)` used inside the
 * analytics RPCs, for the few code paths that read base tables directly.
 */
export async function selectSystemCohortStarts(
  supabase: SupabaseClient<Database>,
  farmId: string,
  options?: { signal?: AbortSignal },
): Promise<Map<number, string>> {
  let query = supabase
    .from("production_cycle")
    .select("system_id, cycle_start, system:system!inner(farm_id)")
    .eq("ongoing_cycle", true)
    .eq("system.farm_id", farmId)
  if (options?.signal) query = query.abortSignal(options.signal)

  const { data, error } = await query
  if (error) throw error

  const bySystem = new Map<number, string>()
  for (const row of (data ?? []) as Array<{ system_id: number | null; cycle_start: string | null }>) {
    if (typeof row.system_id !== "number" || typeof row.cycle_start !== "string") continue
    const existing = bySystem.get(row.system_id)
    if (!existing || row.cycle_start > existing) bySystem.set(row.system_id, row.cycle_start)
  }
  return bySystem
}

/** Drop rows dated before their cage's current-cohort start. */
export function filterRowsToCohort<T extends { system_id: number | null; date: string | null }>(
  rows: T[],
  cohortStartBySystem: Map<number, string>,
): T[] {
  return rows.filter((row) => {
    if (typeof row.system_id !== "number") return true
    const cohortStart = cohortStartBySystem.get(row.system_id)
    return !(cohortStart && typeof row.date === "string" && row.date < cohortStart)
  })
}
