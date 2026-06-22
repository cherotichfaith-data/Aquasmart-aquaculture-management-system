import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { listPerformanceSummaryRows } from "@/features/reports/queries.server"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { logSbError } from "@/lib/supabase/log"

const performanceSummarySchema = z.object({
  farmId: z.string().uuid().nullable().optional(),
  systemId: z.number().int().positive().optional(),
  stage: z.string().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(
    supabase,
    request,
    "reports:performance-summary:query",
    apiRateLimits.reportQuery,
  )
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof performanceSummarySchema>
  try {
    payload = performanceSummarySchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid performance summary query." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const normalizedStage = payload.stage ? normalizeStageFilter(payload.stage) : "all"
    const data = await listPerformanceSummaryRows(supabase as never, {
      farmId: payload.farmId ?? null,
      systemId: payload.systemId,
      stage: normalizedStage === "all" ? undefined : normalizedStage,
      dateFrom: payload.dateFrom,
      dateTo: payload.dateTo,
    })
    return NextResponse.json({ data })
  } catch (error) {
    logSbError("reports:performance-summary:query", error)
    return NextResponse.json({ error: "Unable to load performance summary." }, { status: 500 })
  }
}
