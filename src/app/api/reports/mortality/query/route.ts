import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { listMortalityData } from "@/lib/server/report-reads"
import { logSbError } from "@/lib/supabase/log"

const mortalitySchema = z.object({
  systemId: z.number().int().positive().optional(),
  systemIds: z.array(z.number().int().positive()).optional(),
  batchId: z.number().int().positive().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.number().int().positive().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "reports:mortality:query", apiRateLimits.reportQuery)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof mortalitySchema>
  try {
    payload = mortalitySchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid mortality report query." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const data = await listMortalityData(supabase, payload)
    return NextResponse.json({ data })
  } catch (error) {
    logSbError("reports:mortality:query", error)
    return NextResponse.json({ error: "Unable to load mortality records." }, { status: 500 })
  }
}
