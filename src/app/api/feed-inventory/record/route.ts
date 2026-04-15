import { NextResponse } from "next/server"
import { z } from "zod"
import { feedInventoryWriteTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser, revalidateWriteTags } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const FEED_INVENTORY_ALLOWED_ROLES = new Set(["admin", "farm_manager", "inventory_storekeeper"])

const feedInventorySchema = z.object({
  farm_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  feed_type_id: z.number().int().positive(),
  bag_weight_kg: z.number().positive(),
  number_of_bags: z.number().int().min(0),
  open_bags_kg: z.number().min(0),
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

  const { data: membership, error: membershipError } = await supabase
    .from("farm_user")
    .select("role")
    .eq("farm_id", payload.farm_id)
    .eq("user_id", auth.user.id)
    .maybeSingle()

  if (membershipError) {
    logSbError("feed-inventory:record:membership", membershipError)
    const status = isSbPermissionDenied(membershipError) ? 403 : 500
    return NextResponse.json({ error: "Unable to verify feed inventory permissions." }, { status })
  }

  if (!membership?.role || !FEED_INVENTORY_ALLOWED_ROLES.has(membership.role)) {
    return NextResponse.json({ error: "You do not have permission to record feed inventory." }, { status: 403 })
  }

  const insertPayload = {
    farm_id: payload.farm_id,
    date: payload.date,
    feed_type_id: payload.feed_type_id,
    feed_amount: payload.bag_weight_kg * payload.number_of_bags + payload.open_bags_kg,
  }

  const { data, error } = await supabase.from("feed_incoming").insert(insertPayload).select().single()

  if (error || !data) {
    logSbError("feed-inventory:record:insert", error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return NextResponse.json({ error: "Unable to record feed delivery." }, { status })
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
