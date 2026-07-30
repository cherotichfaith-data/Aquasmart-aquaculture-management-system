import { NextResponse } from "next/server"
import { z } from "zod"
import { requireApiUser } from "@/lib/server/auth"
import { createAccessTokenClient } from "@/lib/supabase/access-token-client"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import { toQueryError, toQuerySuccess, type KpiRpcName, type OptionsRpcName } from "@/lib/supabase/query-transport"

type RpcProxyName = KpiRpcName | OptionsRpcName

const ALLOWED_RPC_NAMES = new Set<RpcProxyName>([
  "api_dashboard_consolidated",
  "api_dashboard_systems",
  "api_recent_activity_feed",
  "api_time_period_bounds_scoped",
  "api_feed_dashboard_kpis",
  "api_feed_efcr_trend",
  "api_feed_plan_vs_actual",
  "api_feed_recommendations",
  "api_feed_vs_biomass_gain",
  "api_feeding_alerts",
  "api_feeding_rate_vs_target",
  "api_feeding_response_distribution",
  "api_production_summary",
  "api_recommended_actions",
  "api_system_feed_status",
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
