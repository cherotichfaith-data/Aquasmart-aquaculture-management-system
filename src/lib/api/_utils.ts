import type { Database } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { createClient } from "@/lib/supabase/client"
import { isSbAuthMissing, isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import { getSessionUser } from "@/lib/supabase/session"

type SupabaseClient = ReturnType<typeof createClient>
type PublicFunctions = Database["public"]["Functions"]

/**
 * KPI/analytics RPCs (server-side filtering, membership checks, etc.)
 * Keep this list tight to avoid accidental .rpc("anything").
 */
export type KpiRpcName =
  | "api_dashboard_consolidated"
  | "api_dashboard_systems"
  | "api_daily_overlay"
  | "api_daily_fish_inventory_rpc"
  | "api_production_summary"
  | "api_system_timeline_bounds"
  | "api_latest_water_quality_status"
  | "api_water_quality_sync_status"
  | "api_time_period_bounds"
  | "get_farm_kpis_today"
  | "get_fcr_trend"
  | "get_fcr_trend_window"
  | "get_growth_trend"
  | "get_growth_trend_window"
  | "get_running_stock"
  | "get_survival_trend"

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

type ErrorLike = {
  code?: string
  message?: unknown
  name?: unknown
}

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
): ReturnType<SupabaseClient["rpc"]>
export function queryOptionsRpc<Name extends OptionsRpcName>(
  supabase: SupabaseClient,
  name: Name,
  args: PublicFunctions[Name]["Args"],
): ReturnType<SupabaseClient["rpc"]>
export function queryOptionsRpc<Name extends OptionsRpcName>(
  supabase: SupabaseClient,
  name: Name,
  args?: PublicFunctions[Name]["Args"],
) {
  return args === undefined ? supabase.rpc(name) : supabase.rpc(name, args)
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

export function getErrorCode(err: unknown): string {
  if (typeof err !== "object" || err === null || !("code" in err)) return ""
  return String((err as ErrorLike).code ?? "")
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "object" && err !== null && "message" in err && typeof (err as ErrorLike).message === "string") {
    return (err as { message: string }).message
  }
  return String(err ?? "Unknown error")
}

export function isAbortLikeError(err: unknown): boolean {
  if (!err) return false
  const name = String(typeof err === "object" && err !== null && "name" in err ? (err as ErrorLike).name ?? "" : "").toLowerCase()
  const message = getErrorMessage(err).toLowerCase()
  return (
    name.includes("abort") ||
    name.includes("cancel") ||
    message.includes("abort") ||
    message.includes("cancel") ||
    message.includes("canceled")
  )
}

export function isMissingObjectError(err: unknown): boolean {
  const code = getErrorCode(err)
  if (code === "42P01" || code === "42883" || code === "PGRST202") return true

  const message = getErrorMessage(err).toLowerCase()
  return (
    message.includes("does not exist") ||
    message.includes("could not find the function") ||
    message.includes("schema cache")
  )
}

export function isInvalidBigintUuidError(err: unknown): boolean {
  const normalized = getErrorMessage(err).toLowerCase()
  return normalized.includes("invalid input syntax for type bigint") && normalized.includes("-")
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

  return { status: "error", data: null, error: getErrorMessage(err) }
}

export function toQuerySuccess<T>(data: T[] | null | undefined): QueryResult<T> {
  return { status: "success", data: (data ?? []) as T[] }
}
