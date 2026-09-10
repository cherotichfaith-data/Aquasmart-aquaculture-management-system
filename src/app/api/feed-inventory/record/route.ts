import { submitApprovalResponse } from "@/lib/server/approvals"
import { NextResponse } from "next/server"
import { z } from "zod"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"

const feedInventorySchema = z.object({
  local_id: z.string().max(128).optional(),
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
 * Feed inventory submits to the approval queue like every other record route
 * (see src/lib/offline/sync.ts and src/lib/server/approvals.ts). It relies on RLS
 * ("feed_inventory: insert write roles") for farm/role scoping, matching every
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

  return submitApprovalResponse(supabase, "feed_inventory", payload.farm_id, payload)
}
