import type { Database } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getMe } from "@/lib/api"
import { createClient } from "@/lib/supabase/client"
import { createAccessTokenClient } from "@/lib/supabase/access-token-client"
import { isSbAuthMissing, isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import { getSessionUser, isSessionTokenExpired } from "@/lib/supabase/session"

type SupabaseClient = ReturnType<typeof createClient> | ReturnType<typeof createAccessTokenClient>
type PublicFunctions = Database["public"]["Functions"]

/**
 * KPI/analytics RPCs (server-side filtering, membership checks, etc.)
 * Keep this list tight to avoid accidental .rpc("anything").
 */
export type KpiRpcName =
  | "api_dashboard_consolidated"
  | "api_dashboard_systems"
  | "api_feed_dashboard_kpis"
  | "api_feed_efcr_trend"
  | "api_feed_plan_vs_actual"
  | "api_feed_recommendations"
  | "api_feed_vs_biomass_gain"
  | "api_feeding_alerts"
  | "api_feeding_rate_vs_target"
  | "api_feeding_response_distribution"
  | "api_growth_standard_curve"
  | "api_production_summary"
  | "api_recent_activity_feed"
  | "api_recommended_actions"
  | "api_system_feed_status"
  | "api_time_period_bounds_scoped"
  | "api_latest_water_quality_status"
  | "api_water_quality_trend"
  | "api_water_quality_index"

/**
 * Option RPCs (replacing PostgREST option views where possible).
 */
export type OptionsRpcName =
  | "api_batch_system_ids"
  | "api_farm_options_rpc"
  | "api_system_options_rpc"
  | "api_fingerling_batch_options_rpc"

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
  args: Record<string, unknown>,
) {
  return supabase.rpc(name as never, args as never)
}

/**
 * Typed RPC wrapper (Options). Deliberately not declared as two overloads
 * returning `ReturnType<SupabaseClient["rpc"]>` -- that type doesn't carry
 * `Name` through, so it collapses to a broad union across every RPC's
 * return shape in the whole schema instead of the one being called.
 * Leaving the return type inferred from the two branches below (both real
 * `.rpc()` calls narrowed by the literal `name: Name`) gives callers the
 * builder actually typed to this RPC's row shape.
 */
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

/**
 * The browser Supabase client's `auth.getSession()`/`getUser()` calls serialize
 * through the SDK's cross-tab lock (Web Locks API where available). If that lock
 * is ever left held -- another tab mid-refresh, a stuck prior call -- this can
 * hang indefinitely instead of rejecting. Race it against a timeout so a stuck
 * lock degrades to the `/api/me` server-backed fallback below instead of leaving
 * every direct-Supabase read (reports, supplier options, etc.) stuck loading forever.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve(null)
      },
    )
  })
}

export async function getClientOrError(
  tag: string,
  options?: { requireSession?: boolean; accessToken?: string | null },
): Promise<{ supabase: SupabaseClient } | { error: QueryResult<never> }> {
  const requireSession = options?.requireSession ?? false
  const suppliedAccessToken = options?.accessToken?.trim() ?? ""

  // AuthProvider restores returning users from the server-side session cookie.
  // That gives React a valid access token even when the browser Supabase client
  // has no local session yet. Use that token immediately instead of waiting on
  // browser auth discovery (which is only guaranteed after a fresh sign-in).
  if (suppliedAccessToken && !isSessionTokenExpired(suppliedAccessToken)) {
    return { supabase: createAccessTokenClient(suppliedAccessToken) }
  }

  const supabase = createClient()

  if (requireSession) {
    const sessionUser = await withTimeout(getSessionUser(supabase, `api:${tag}:getSession`), 4000)
    if (sessionUser) {
      return { supabase }
    }

    try {
      const me = await getMe()
      if (typeof me.token === "string" && me.token.trim().length > 0) {
        return { supabase: createAccessTokenClient(me.token) }
      }
    } catch {
    }
  }

  if (requireSession) {
    return { error: { status: "error", data: null, error: "No active session" } }
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

type ClientReadQuery<Row> = PromiseLike<{ data: Row[] | null; error: unknown }>

export async function resolveClientReadQuery<Row>(params: {
  tag: string
  query: ClientReadQuery<Row>
  signal?: AbortSignal
  allowMissingObject?: boolean
  allowInvalidBigint?: boolean
  emptyOnAnyError?: boolean
  quietWhen?: (err: unknown) => boolean
}): Promise<QueryResult<Row>> {
  const { data, error } = await params.query

  if (!error) {
    return toQuerySuccess<Row>((data ?? []) as Row[])
  }

  if (
    params.emptyOnAnyError ||
    params.signal?.aborted ||
    isAbortLikeError(error) ||
    isSbPermissionDenied(error) ||
    isSbAuthMissing(error) ||
    (params.allowMissingObject && isMissingObjectError(error)) ||
    (params.allowInvalidBigint && isInvalidBigintUuidError(error)) ||
    params.quietWhen?.(error)
  ) {
    return toQuerySuccess<Row>([])
  }

  return toQueryError<Row>(params.tag, error)
}

/**
 * Client-read transport for RPCs, going through the authenticated /api/rpc
 * proxy instead of calling supabase.rpc(...) directly from the browser.
 */
export async function fetchRpc<Row>(
  tag: string,
  name: KpiRpcName | OptionsRpcName,
  args?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<QueryResult<Row>> {
  try {
    const response = await fetch("/api/rpc", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, args: args ?? {} }),
      signal,
    })
    const body = (await response.json().catch(() => ({}))) as QueryResult<Row> | { error?: string }

    if (!response.ok) {
      const errorMessage =
        typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "Request failed."
      const error = new Error(errorMessage)
      if (signal?.aborted || isAbortLikeError(error) || isSbPermissionDenied(error) || isSbAuthMissing(error)) {
        return toQuerySuccess<Row>([])
      }
      return toQueryError<Row>(tag, error)
    }

    const result = body as QueryResult<Row>
    return result?.status ? result : toQuerySuccess<Row>([])
  } catch (error) {
    if (signal?.aborted || isAbortLikeError(error) || isSbPermissionDenied(error) || isSbAuthMissing(error)) {
      return toQuerySuccess<Row>([])
    }
    return toQueryError<Row>(tag, error)
  }
}
