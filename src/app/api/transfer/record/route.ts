import { submitApprovalResponse } from "@/lib/server/approvals"
import { NextResponse } from "next/server"
import { z } from "zod"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { getSystemFarmIds, requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { UI_TRANSFER_TYPES } from "@/lib/transfer-types"

const transferSchema = z.object({
  origin_system_id: z.number().int().positive(),
  target_system_id: z.number().int().positive().nullable().optional(),
  external_target_name: z.string().max(200).nullable().optional(),
  transfer_type: z.enum(UI_TRANSFER_TYPES),
  batch_id: z.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  number_of_fish_transfer: z.number().int("Transfer count must be a whole number.").positive(),
  total_weight_transfer: z.number().positive(),
  notes: z.string().max(500).nullable().optional(),
  local_id: z.string().max(128).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "transfer:record", apiRateLimits.mutation)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof transferSchema>
  try {
    payload = transferSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid transfer payload." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const systemIds = [payload.origin_system_id, payload.target_system_id].filter((value): value is number => typeof value === "number")
  const systemScope = await getSystemFarmIds(supabase, systemIds, "transfer:record")
  if ("response" in systemScope) return systemScope.response

  const originFarmId = systemScope.farmIdsBySystemId.get(payload.origin_system_id)
  if (!originFarmId) {
    return NextResponse.json({ error: "Origin system is unavailable." }, { status: 404 })
  }

  const externalTargetName = payload.external_target_name?.trim() ? payload.external_target_name.trim() : null
  const isExternalOut = payload.transfer_type === "external_out"

  if (isExternalOut && !externalTargetName) {
    return NextResponse.json({ error: "External destination is required." }, { status: 400 })
  }

  if (!isExternalOut && !payload.target_system_id) {
    return NextResponse.json({ error: "Destination system is required." }, { status: 400 })
  }

  if (!isExternalOut && payload.target_system_id === payload.origin_system_id) {
    return NextResponse.json({ error: "Origin and destination cannot be the same." }, { status: 400 })
  }

  return submitApprovalResponse(supabase, "transfer", originFarmId, {
    ...payload,
    target_system_id: isExternalOut ? null : payload.target_system_id,
    external_target_name: isExternalOut ? externalTargetName : null,
  })
}
