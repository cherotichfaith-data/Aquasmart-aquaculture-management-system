import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { listFarmKpisToday } from "@/lib/server/report-reads"
import { logSbError } from "@/lib/supabase/log"

const farmKpisTodaySchema = z.object({
  farmId: z.string().uuid().nullable().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(
    supabase,
    request,
    "reports:farm-kpis-today:query",
    apiRateLimits.reportQuery,
  )
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof farmKpisTodaySchema>
  try {
    payload = farmKpisTodaySchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid farm KPI query." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const data = await listFarmKpisToday(supabase, payload)
    return NextResponse.json({ data })
  } catch (error) {
    logSbError("reports:farm-kpis-today:query", error)
    return NextResponse.json({ error: "Unable to load farm KPIs." }, { status: 500 })
  }
}
