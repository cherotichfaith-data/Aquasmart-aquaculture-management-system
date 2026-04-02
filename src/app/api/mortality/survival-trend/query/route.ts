import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { listSurvivalTrend } from "@/lib/server/mortality-reads"
import { logSbError } from "@/lib/supabase/log"

const survivalTrendSchema = z.object({
  systemId: z.number().int().positive().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(
    supabase,
    request,
    "mortality:survival-trend:query",
    apiRateLimits.reportQuery,
  )
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof survivalTrendSchema>
  try {
    payload = survivalTrendSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid survival trend query." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const data = await listSurvivalTrend(supabase, payload)
    return NextResponse.json({ data })
  } catch (error) {
    logSbError("mortality:survival-trend:query", error)
    return NextResponse.json({ error: "Unable to load survival trend." }, { status: 500 })
  }
}
