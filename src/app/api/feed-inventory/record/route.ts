import { NextResponse } from "next/server"
import { z } from "zod"
import { feedInventoryWriteTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser, revalidateWriteTags } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const feedInventorySchema = z.object({
  farm_id: z.string().uuid(),
  inventory_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  inventory_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  feed_type_id: z.number().int().positive(),
  bag_weight: z.number().finite().positive(),
  amount_of_bags: z.number().finite().min(0),
  opened_bags: z.number().int().min(0).nullable().optional(),
  comments: z.string().trim().max(500).nullable().optional(),
})

/**
 * Mirrors recordFeedInventorySnapshotAction (src/features/feed/mutations.server.ts) as a
 * plain REST route so it can go through the offline sync queue (src/lib/offline/sync.ts),
 * the same way /api/feeding/record, /api/mortality/record, etc. do. Server actions can't
 * be retried/queued by the offline layer, which is why feed inventory previously had no
 * offline path. Relies on RLS ("feed_inventory: insert write roles") for farm/role scoping
 * instead of the admin client + manual role check the server action used, matching every
 * other record route in this API.
 */
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

  const { data, error } = await supabase
    .from("feed_inventory")
    .insert({
      farm_id: payload.farm_id,
      inventory_date: payload.inventory_date,
      inventory_time: payload.inventory_time ?? null,
      feed_type_id: payload.feed_type_id,
      bag_weight: payload.bag_weight,
      amount_of_bags: payload.amount_of_bags,
      opened_bags: payload.opened_bags ?? null,
      comments: payload.comments?.trim() ? payload.comments.trim() : null,
    })
    .select()
    .single()

  if (error || !data) {
    logSbError("feed-inventory:record:insert", error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return NextResponse.json({ error: "Unable to record feed inventory." }, { status })
  }

  revalidateWriteTags(feedInventoryWriteTags({ farmId: payload.farm_id }))

  return NextResponse.json(
    {
      data,
      meta: {
        farmId: payload.farm_id,
        date: payload.inventory_date,
      },
    },
    { status: 201 },
  )
}
