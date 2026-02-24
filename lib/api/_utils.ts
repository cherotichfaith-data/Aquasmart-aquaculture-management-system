import type { Database } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { createClient } from "@/utils/supabase/client"
import { isSbAuthMissing, isSbPermissionDenied, logSbError } from "@/utils/supabase/log"
import { getSessionUser } from "@/utils/supabase/session"

type SupabaseClient = ReturnType<typeof createClient>
type PublicFunctions = Database["public"]["Functions"]

export type KpiRpcName =
  | "api_dashboard"
  | "api_dashboard_consolidated"
  | "api_dashboard_systems"
  | "api_daily_fish_inventory"
  | "api_daily_fish_inventory_consolidated"
  | "api_daily_fish_inventory_count"
  | "api_efcr_trend"
  | "api_production_summary"

export type OptionsViewName =
  | "api_farm_options"
  | "api_system_options"
  | "api_feed_type_options"
  | "api_fingerling_batch_options"
  | "api_alert_thresholds"
  | "api_water_quality_measurements"
  | "api_latest_water_quality_rating"
  | "api_daily_water_quality_rating"

export function queryKpiRpc<Name extends KpiRpcName>(
  supabase: SupabaseClient,
  name: Name,
  args: PublicFunctions[Name]["Args"],
) {
  return supabase.rpc(name, args)
}

export function queryOptionsView<Name extends OptionsViewName>(
  supabase: SupabaseClient,
  view: Name,
) {
  return supabase.from(view)
}

export async function getClientOrError(
  tag: string,
  options?: { requireSession?: boolean },
): Promise<
  | { supabase: SupabaseClient }
  | { error: QueryResult<never> }
> {
  const supabase = createClient()
  const requireSession = options?.requireSession ?? false
  if (requireSession) {
    const sessionUser = await getSessionUser(supabase, `api:${tag}:getSession`)
    if (!sessionUser) {
      return { error: { status: "error", data: null, error: "No active session" } }
    }
  }
  return { supabase }
}

export function toQueryError<T>(tag: string, err: unknown): QueryResult<T> {
  if (!isSbPermissionDenied(err) && !isSbAuthMissing(err)) {
    logSbError(tag, err)
  }
  const message = err instanceof Error
    ? err.message
    : String((typeof err === "object" && err !== null && "message" in err && typeof err.message === "string")
      ? err.message
      : err ?? "Unknown error")
  return { status: "error", data: null, error: message }
}

export function toQuerySuccess<T>(data: T[] | null | undefined): QueryResult<T> {
  return { status: "success", data: (data ?? []) as T[] }
}
