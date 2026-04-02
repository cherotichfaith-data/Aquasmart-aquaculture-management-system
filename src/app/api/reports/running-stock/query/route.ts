import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { listRunningStock } from "@/lib/server/report-reads"
import { logSbError } from "@/lib/supabase/log"

const runningStockSchema = z.object({
  farmId: z.string().uuid().nullable().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(
    supabase,
    request,
    "reports:running-stock:query",
    apiRateLimits.reportQuery,
  )
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof runningStockSchema>
  try {
    payload = runningStockSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid running stock query." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const data = await listRunningStock(supabase, payload)
    return NextResponse.json({ data })
  } catch (error) {
    logSbError("reports:running-stock:query", error)
    return NextResponse.json({ error: "Unable to load running stock." }, { status: 500 })
  }
}
