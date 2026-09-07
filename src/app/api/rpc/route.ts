import { NextResponse } from "next/server"
import { z } from "zod"
import { requireApiUser } from "@/lib/server/auth"
import { createAccessTokenClient } from "@/lib/supabase/access-token-client"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import { toQueryError, toQuerySuccess, type KpiRpcName, type OptionsRpcName } from "@/lib/supabase/query-transport"
import { resolveScopedTimeBounds } from "@/features/shared/time-bounds.server"
import type { AnalyticsTimeScope, DateType } from "@/lib/time-period"

type RpcProxyName = KpiRpcName | OptionsRpcName

const ALLOWED_RPC_NAMES = new Set<RpcProxyName>([
  "api_dashboard_consolidated",
  "api_dashboard_systems",
  "api_recent_activity_feed",
  "api_time_period_bounds_scoped",
  "api_feed_dashboard",
  "api_production_summary",
  "api_recommended_actions",
  "api_latest_water_quality_status",
  "api_water_quality_trend",
  "api_water_quality_index",
  "api_batch_system_ids",
  "api_farm_options_rpc",
  "api_system_options_rpc",
  "api_fingerling_batch_options_rpc",
])

function isAllowedRpcName(name: string): name is RpcProxyName {
  return ALLOWED_RPC_NAMES.has(name as RpcProxyName)
}

const bodySchema = z.object({
  name: z.string().min(1),
  args: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: Request) {
  const auth = await requireApiUser("api:rpc")
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof bodySchema>
  try {
    payload = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  if (!isAllowedRpcName(payload.name)) {
    return NextResponse.json({ error: "Unknown RPC." }, { status: 400 })
  }

  const tag = `api:rpc:${payload.name}`

  // Time-period bounds go through the one shared resolver (cached + tagged),
  // so the client hook and every server prefetch share a single result.
  if (payload.name === "api_time_period_bounds_scoped") {
    const args = payload.args ?? {}
    const farmId = typeof args.p_farm_id === "string" ? args.p_farm_id : null
    if (!farmId) {
      return NextResponse.json(toQuerySuccess([{ start: null, end: null }]), {
        headers: { "Cache-Control": "no-store" },
      })
    }
    try {
      const bounds = await resolveScopedTimeBounds(auth.accessToken, {
        farmId,
        timePeriod: String(args.p_time_period ?? "month") as DateType,
        scope: (args.p_scope as AnalyticsTimeScope | undefined) ?? undefined,
        systemId: args.p_system_id == null ? null : Number(args.p_system_id),
        batchId: args.p_batch_id == null ? null : Number(args.p_batch_id),
        anchorDate: args.p_anchor_date == null ? null : String(args.p_anchor_date),
      })
      return NextResponse.json(toQuerySuccess([bounds]), { headers: { "Cache-Control": "no-store" } })
    } catch (error) {
      logSbError(tag, error)
      return NextResponse.json(toQueryError(tag, error), { status: 500 })
    }
  }

  const supabase = createAccessTokenClient(auth.accessToken)

  try {
    const { data, error } = await supabase.rpc(payload.name as never, (payload.args ?? {}) as never)

    if (error) {
      const result = toQueryError(tag, error)
      return NextResponse.json(result, {
        status: isSbPermissionDenied(error) ? 403 : 500,
        headers: { "Cache-Control": "no-store" },
      })
    }

    return NextResponse.json(toQuerySuccess(data), { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    logSbError(tag, error)
    return NextResponse.json(toQueryError(tag, error), { status: 500 })
  }
}
