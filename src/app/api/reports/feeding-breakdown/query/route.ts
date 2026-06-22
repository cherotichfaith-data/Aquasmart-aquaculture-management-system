import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { listFeedingBreakdownRows } from "@/features/reports/queries.server"
import { logSbError } from "@/lib/supabase/log"

const feedingBreakdownSchema = z.object({
  farmId: z.string().uuid().nullable().optional(),
  systemId: z.number().int().positive().optional(),
  batchId: z.number().int().positive().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(
    supabase,
    request,
    "reports:feeding-breakdown:query",
    apiRateLimits.reportQuery,
  )
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof feedingBreakdownSchema>
  try {
    payload = feedingBreakdownSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid feeding breakdown query." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const data = await listFeedingBreakdownRows(supabase as never, payload)
    return NextResponse.json({ data })
  } catch (error) {
    logSbError("reports:feeding-breakdown:query", error)
    return NextResponse.json({ error: "Unable to load feeding breakdown." }, { status: 500 })
  }
}
