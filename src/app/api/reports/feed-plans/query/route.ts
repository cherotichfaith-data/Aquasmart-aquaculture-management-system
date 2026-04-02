import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { listFeedPlans } from "@/lib/server/report-reads"
import { logSbError } from "@/lib/supabase/log"

const feedPlansSchema = z.object({
  farmId: z.string().uuid().nullable().optional(),
  systemIds: z.array(z.number().int().positive()).optional().default([]),
  batchId: z.number().int().positive().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "reports:feed-plans:query", apiRateLimits.reportQuery)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof feedPlansSchema>
  try {
    payload = feedPlansSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid feed plans query." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const data = await listFeedPlans(supabase, payload)
    return NextResponse.json({ data })
  } catch (error) {
    logSbError("reports:feed-plans:query", error)
    return NextResponse.json({ error: "Unable to load feed plans." }, { status: 500 })
  }
}
