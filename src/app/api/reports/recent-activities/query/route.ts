import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { listRecentActivities } from "@/lib/server/report-reads"
import { logSbError } from "@/lib/supabase/log"

const recentActivitiesSchema = z.object({
  tableName: z.string().trim().min(1).optional(),
  changeType: z.enum(["INSERT", "UPDATE", "DELETE"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().int().positive().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(
    supabase,
    request,
    "reports:recent-activities:query",
    apiRateLimits.reportQuery,
  )
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof recentActivitiesSchema>
  try {
    payload = recentActivitiesSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid recent activities query." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const data = await listRecentActivities(supabase, payload)
    return NextResponse.json({ data })
  } catch (error) {
    logSbError("reports:recent-activities:query", error)
    return NextResponse.json({ error: "Unable to load recent activities." }, { status: 500 })
  }
}
