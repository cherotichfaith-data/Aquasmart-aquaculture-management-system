import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { getDashboardKpiOverviewData } from "@/features/dashboard/queries.server"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { logSbError } from "@/lib/supabase/log"

const dashboardKpiOverviewSchema = z.object({
  farmId: z.string().uuid().nullable().optional(),
  stage: z.string().optional(),
  systemIds: z.array(z.number().int().positive()).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(
    supabase,
    request,
    "dashboard:kpi-overview:query",
    apiRateLimits.reportQuery,
  )
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof dashboardKpiOverviewSchema>
  try {
    payload = dashboardKpiOverviewSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid dashboard KPI query." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    if (!payload.farmId) {
      return NextResponse.json({ data: { metrics: [], dateBounds: { start: payload.dateFrom, end: payload.dateTo } } })
    }
    const stage = normalizeStageFilter(payload.stage)
    const data = await getDashboardKpiOverviewData(supabase as never, {
      farmId: payload.farmId,
      stage,
      systemIds: payload.systemIds,
      dateFrom: payload.dateFrom,
      dateTo: payload.dateTo,
    })
    return NextResponse.json({ data })
  } catch (error) {
    logSbError("dashboard:kpi-overview:query", error)
    return NextResponse.json({ error: "Unable to load dashboard KPIs." }, { status: 500 })
  }
}
