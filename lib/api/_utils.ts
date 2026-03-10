import type { Database } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { createClient } from "@/utils/supabase/client"
import { isSbAuthMissing, isSbPermissionDenied, logSbError } from "@/utils/supabase/log"
import { getSessionUser } from "@/utils/supabase/session"

type SupabaseClient = ReturnType<typeof createClient>
type PublicFunctions = Database["public"]["Functions"]

/**
 * KPI/analytics RPCs (server-side filtering, membership checks, etc.)
 * Keep this list tight to avoid accidental .rpc("anything").
 */
export type KpiRpcName =
  | "api_dashboard"
  | "api_dashboard_consolidated"
  | "api_dashboard_systems"
  | "api_daily_overlay"
  | "api_daily_fish_inventory"
  | "api_daily_fish_inventory_rpc"
  | "api_efcr_trend"
  | "api_production_summary"
  | "api_latest_water_quality_status"
  | "api_water_quality_sync_status"
  | "api_time_period_bounds"
  | "api_time_period_options"

/**
 * Option RPCs (replacing PostgREST option views where possible).
 */
export type OptionsRpcName =
  | "api_farm_options_rpc"
  | "api_system_options_rpc"
  | "api_fingerling_batch_options_rpc"
  | "api_feed_type_options_rpc"

/**
 * PostgREST views still used in code.
 * Keep this list small and shrink over time.
 */
export type OptionsViewName =
  | "api_alert_thresholds"
  | "api_water_quality_measurements"
  | "api_daily_water_quality_rating"

/**
 * Typed RPC wrapper (KPI)
 */
export function queryKpiRpc<Name extends KpiRpcName>(
  supabase: SupabaseClient,
  name: Name,
  args: PublicFunctions[Name]["Args"],
) {
  return supabase.rpc(name, args)
}

/**
 * Typed RPC wrapper (Options)
 */
export function queryOptionsRpc<Name extends OptionsRpcName>(
  supabase: SupabaseClient,
  name: Name,
  args?: PublicFunctions[Name]["Args"],
) {
  return supabase.rpc(name, (args ?? {}) as PublicFunctions[Name]["Args"])
}

/**
 * Typed PostgREST view wrapper (Options only).
 * Prefer queryOptionsRpc(...) where possible.
 */
export function queryOptionsView<Name extends OptionsViewName>(
  supabase: SupabaseClient,
  view: Name,
) {
  return supabase.from(view)
}

export async function getClientOrError(
  tag: string,
  options?: { requireSession?: boolean },
): Promise<{ supabase: SupabaseClient } | { error: QueryResult<never> }> {
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

/**
 * Standard error conversion (keeps logs quiet for auth/permission issues).
 */
export function toQueryError<T>(tag: string, err: unknown): QueryResult<T> {
  if (!isSbPermissionDenied(err) && !isSbAuthMissing(err)) {
    logSbError(tag, err)
  }

  const message =
    err instanceof Error
      ? err.message
      : String(
          typeof err === "object" &&
            err !== null &&
            "message" in err &&
            typeof (err as any).message === "string"
            ? (err as any).message
            : err ?? "Unknown error",
        )

  return { status: "error", data: null, error: message }
}

export function toQuerySuccess<T>(data: T[] | null | undefined): QueryResult<T> {
  return { status: "success", data: (data ?? []) as T[] }
}
