import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { z } from "zod"
import { feedingWriteTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const feedingSchema = z.object({
  system_id: z.number().int().positive(),
  batch_id: z.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  feed_type_id: z.number().int().positive(),
  feeding_amount: z.number().positive(),
  feeding_response: z.enum(["very_good", "good", "fair", "bad"]),
  notes: z.string().max(500).nullable().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "feeding:record", apiRateLimits.mutation)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof feedingSchema>
  try {
    payload = feedingSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid feeding payload." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { data: systemRow, error: systemError } = await supabase
    .from("system")
    .select("id, farm_id")
    .eq("id", payload.system_id)
    .maybeSingle()

  if (systemError) {
    logSbError("feeding:record:systemLookup", systemError)
    const status = isSbPermissionDenied(systemError) ? 403 : 500
    return NextResponse.json({ error: "Unable to verify the selected system." }, { status })
  }

  if (!systemRow?.farm_id) {
    return NextResponse.json({ error: "Selected system is unavailable." }, { status: 404 })
  }

  const { data: row, error: insertError } = await supabase
    .from("feeding_record")
    .insert({
      system_id: payload.system_id,
      batch_id: payload.batch_id ?? null,
      date: payload.date,
      feed_type_id: payload.feed_type_id,
      feeding_amount: payload.feeding_amount,
      feeding_response: payload.feeding_response,
      notes: payload.notes?.trim() ? payload.notes.trim() : null,
    })
    .select()
    .single()

  if (insertError || !row) {
    logSbError("feeding:record:insert", insertError)
    const status = isSbPermissionDenied(insertError) ? 403 : 500
    return NextResponse.json({ error: "Unable to record the feeding event." }, { status })
  }

  feedingWriteTags({ farmId: systemRow.farm_id, systemId: payload.system_id }).forEach((tag) =>
    revalidateTag(tag, "max"),
  )

  return NextResponse.json(
    {
      data: row,
      meta: {
        farmId: systemRow.farm_id,
        systemId: payload.system_id,
        date: payload.date,
      },
    },
    { status: 201 },
  )
}
