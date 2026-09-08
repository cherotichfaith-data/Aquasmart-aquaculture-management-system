import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

/**
 * Per-cage "current cohort" anchor: the start date of the current continuous
 * occupancy by the production cycle physically resident in the cage now. Rows
 * dated earlier belong to a previous occupant. Cages never stocked are absent
 * from the map (no cutoff).
 *
 * Backed by the `api_system_cohort_starts` RPC (which wraps
 * `private.system_cohort_starts`), the same anchor the analytics RPCs apply --
 * for the few code paths that read base tables / MVs directly.
 */
export async function selectSystemCohortStarts(
  supabase: SupabaseClient<Database>,
  farmId: string,
  options?: { signal?: AbortSignal },
): Promise<Map<number, string>> {
  let rpc = supabase.rpc("api_system_cohort_starts", { p_farm_id: farmId })
  if (options?.signal) rpc = rpc.abortSignal(options.signal)

  const { data, error } = await rpc
  if (error) throw error

  const bySystem = new Map<number, string>()
  for (const row of (data ?? []) as Array<{ system_id: number | null; cohort_start: string | null }>) {
    if (typeof row.system_id !== "number" || typeof row.cohort_start !== "string") continue
    bySystem.set(row.system_id, row.cohort_start)
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
