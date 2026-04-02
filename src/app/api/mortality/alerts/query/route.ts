import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { listAlertLog } from "@/lib/server/mortality-reads"
import { logSbError } from "@/lib/supabase/log"

const alertLogSchema = z.object({
  farmId: z.string().uuid().nullable().optional(),
  systemId: z.number().int().positive().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  ruleCodes: z.array(z.string().trim().min(1)).optional(),
  unacknowledgedOnly: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "mortality:alerts:query", apiRateLimits.reportQuery)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof alertLogSchema>
  try {
    payload = alertLogSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid alert log query." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const data = await listAlertLog(supabase, payload)
    return NextResponse.json({ data })
  } catch (error) {
    logSbError("mortality:alerts:query", error)
    return NextResponse.json({ error: "Unable to load alert log." }, { status: 500 })
  }
}
