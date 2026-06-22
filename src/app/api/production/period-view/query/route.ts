import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { logSbError } from "@/lib/supabase/log"
import { getProductionPeriodViewData } from "@/features/production/queries.server"

const productionPeriodViewSchema = z.object({
  farmId: z.string().uuid().nullable().optional(),
  systemId: z.number().int().positive().optional(),
  systemIds: z.array(z.number().int().positive()).optional(),
  stage: z.string().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  consolidate: z.boolean().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(
    supabase,
    request,
    "production:period-view:query",
    apiRateLimits.reportQuery,
  )
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof productionPeriodViewSchema>
  try {
    payload = productionPeriodViewSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid production period view query." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const normalizedStage = payload.stage ? normalizeStageFilter(payload.stage) : "all"
    const data = await getProductionPeriodViewData(supabase as never, {
      farmId: payload.farmId ?? null,
      systemId: payload.systemId,
      systemIds: payload.systemIds,
      stage: normalizedStage === "all" ? undefined : normalizedStage,
      dateFrom: payload.dateFrom,
      dateTo: payload.dateTo,
      consolidate: payload.consolidate,
    })
    return NextResponse.json({ data })
  } catch (error) {
    logSbError("production:period-view:query", error)
    return NextResponse.json({ error: "Unable to load production period view." }, { status: 500 })
  }
}
