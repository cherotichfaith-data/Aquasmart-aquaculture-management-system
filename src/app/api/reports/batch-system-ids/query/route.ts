import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { listBatchSystemIds } from "@/lib/server/report-reads"
import { logSbError } from "@/lib/supabase/log"

const batchSystemIdsSchema = z.object({
  batchId: z.number().int().positive(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(
    supabase,
    request,
    "reports:batch-system-ids:query",
    apiRateLimits.reportQuery,
  )
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof batchSystemIdsSchema>
  try {
    payload = batchSystemIdsSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid batch system query." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const data = await listBatchSystemIds(supabase, payload)
    return NextResponse.json({ data })
  } catch (error) {
    logSbError("reports:batch-system-ids:query", error)
    return NextResponse.json({ error: "Unable to load batch system IDs." }, { status: 500 })
  }
}
