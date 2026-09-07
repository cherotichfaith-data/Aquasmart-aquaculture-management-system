import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

/**
 * Cage IDs that currently hold live fish, from the trigger-maintained
 * `system.cage_status = 'occupied'` flag. Shared by the client hook
 * (`useStockedSystemIds`) and the production server prefetch so the
 * "is this cage stocked right now" rule is defined once.
 */
export async function selectOccupiedSystemIds(
  supabase: SupabaseClient<Database>,
  farmId: string,
  options?: { signal?: AbortSignal },
): Promise<Set<number>> {
  let query = supabase
    .from("system")
    .select("id")
    .eq("farm_id", farmId)
    .eq("is_active", true)
    .eq("cage_status", "occupied")
  if (options?.signal) query = query.abortSignal(options.signal)

  const { data, error } = await query
  if (error) throw error

  return new Set(
    ((data ?? []) as Array<{ id: number | null }>)
      .map((row) => row.id)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id)),
  )
}
