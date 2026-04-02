import { NextResponse } from "next/server"
import { z } from "zod"
import { feedInventoryWriteTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser, revalidateWriteTags } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const feedInventorySchema = z.object({
  farm_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  snapshot_time: z.string().regex(/^\d{2}:\d{2}$/),
  feed_type_id: z.number().int().positive(),
  bag_weight_kg: z.number().positive(),
  number_of_bags: z.number().int().min(0),
  open_bags_kg: z.number().min(0),
  notes: z.string().max(500).nullable().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "feed-inventory:record", apiRateLimits.mutation)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof feedInventorySchema>
  try {
    payload = feedInventorySchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid feed inventory payload." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const insertPayload = {
    farm_id: payload.farm_id,
    date: payload.date,
    snapshot_time: payload.snapshot_time,
    feed_type_id: payload.feed_type_id,
    bag_weight_kg: payload.bag_weight_kg,
    number_of_bags: payload.number_of_bags,
    open_bags_kg: payload.open_bags_kg,
    notes: payload.notes?.trim() ? payload.notes.trim() : null,
  }

  const { data, error } = await supabase.from("feed_inventory_snapshot").insert(insertPayload).select().single()

  if (error || !data) {
    logSbError("feed-inventory:record:insert", error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return NextResponse.json({ error: "Unable to record feed inventory snapshot." }, { status })
  }

  revalidateWriteTags(feedInventoryWriteTags({ farmId: payload.farm_id }))

  return NextResponse.json(
    {
      data,
      meta: {
        farmId: payload.farm_id,
        date: payload.date,
      },
    },
    { status: 201 },
  )
}
