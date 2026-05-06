import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { z } from "zod"
import { feedInventoryWriteTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const incomingFeedSchema = z.object({
  farm_id: z.string().uuid().optional().nullable(),
  feed_type_id: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  feed_amount: z.number().positive(),
  local_id: z.string().max(128).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "incoming-feed:record", apiRateLimits.mutation)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof incomingFeedSchema>
  try {
    payload = incomingFeedSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid incoming-feed payload."
        : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Resolve farm ID — use the payload value or derive from the authenticated user's farm
  let farmId = payload.farm_id ?? null
  if (!farmId) {
    const { data: farmUser, error: farmErr } = await supabase
      .from("farm_user")
      .select("farm_id")
      .eq("user_id", auth.user.id)
      .limit(1)
      .maybeSingle()

    if (farmErr || !farmUser?.farm_id) {
      logSbError("incoming-feed:record:farmLookup", farmErr)
      return NextResponse.json({ error: "Unable to resolve farm for this user." }, { status: 400 })
    }
    farmId = farmUser.farm_id
  }

  // Verify the feed type belongs to an accessible farm (or is global)
  const { data: feedType, error: ftErr } = await supabase
    .from("feed_type")
    .select("id")
    .eq("id", payload.feed_type_id)
    .maybeSingle()

  if (ftErr || !feedType) {
    return NextResponse.json({ error: "Selected feed type is unavailable." }, { status: 404 })
  }

  const upsertPayload: Record<string, unknown> = {
    farm_id: farmId,
    feed_type_id: payload.feed_type_id,
    date: payload.date,
    feed_amount: payload.feed_amount,
  }
  // Only include local_id in the upsert if provided (used for offline idempotency)
  if (payload.local_id) {
    upsertPayload.local_id = payload.local_id
  }

  const { data: row, error: insertError } = await supabase
    .from("feed_incoming")
    .upsert(upsertPayload as any, {
      onConflict: payload.local_id ? "local_id" : undefined,
    })
    .select()
    .maybeSingle()

  if (insertError || !row) {
    logSbError("incoming-feed:record:insert", insertError)
    const status = isSbPermissionDenied(insertError) ? 403 : 500
    return NextResponse.json({ error: "Unable to record the incoming feed event." }, { status })
  }

  feedInventoryWriteTags({ farmId }).forEach((tag) => revalidateTag(tag, "max"))

  return NextResponse.json(
    {
      data: row,
      meta: {
        farmId,
        date: payload.date,
      },
    },
    { status: 201 },
  )
}
