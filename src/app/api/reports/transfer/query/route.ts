import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { listTransferData } from "@/lib/server/report-reads"
import { logSbError } from "@/lib/supabase/log"

const transferSchema = z.object({
  batchId: z.number().int().positive().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.number().int().positive().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "reports:transfer:query", apiRateLimits.reportQuery)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof transferSchema>
  try {
    payload = transferSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid transfer query." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const data = await listTransferData(supabase, payload)
    return NextResponse.json({ data })
  } catch (error) {
    logSbError("reports:transfer:query", error)
    return NextResponse.json({ error: "Unable to load transfer records." }, { status: 500 })
  }
}
