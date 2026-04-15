import { NextResponse } from "next/server"
import { z } from "zod"
import { inventoryWriteTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { getSystemFarmId, requireRateLimitedRouteUser, revalidateWriteTags } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const stockingSchema = z.object({
  system_id: z.number().int().positive(),
  batch_id: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  number_of_fish_stocking: z.number().positive(),
  total_weight_stocking: z.number().positive(),
  abw: z.number().min(0),
  notes: z.string().max(500).nullable().optional(),
  type_of_stocking: z.enum(["empty", "already_stocked"]),
  local_id: z.string().max(128).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "stocking:record", apiRateLimits.mutation)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof stockingSchema>
  try {
    payload = stockingSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid stocking payload." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const systemScope = await getSystemFarmId(supabase, payload.system_id, "stocking:record")
  if ("response" in systemScope) return systemScope.response

  const insertPayload = {
    system_id: payload.system_id,
    batch_id: payload.batch_id,
    date: payload.date,
    number_of_fish_stocking: payload.number_of_fish_stocking,
    total_weight_stocking: payload.total_weight_stocking,
    type_of_stocking: payload.type_of_stocking,
    abw: payload.abw,
    notes: payload.notes?.trim() ? payload.notes.trim() : null,
    local_id: payload.local_id ?? null,
    synced_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("fish_stocking")
    .upsert(insertPayload, { onConflict: "local_id" })
    .select()
    .maybeSingle()

  if (error || !data) {
    logSbError("stocking:record:insert", error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return NextResponse.json({ error: "Unable to record stocking." }, { status })
  }

  revalidateWriteTags(
    inventoryWriteTags({ farmId: systemScope.farmId, systemId: payload.system_id, includeProduction: true }),
  )

  return NextResponse.json(
    {
      data,
      meta: {
        farmId: systemScope.farmId,
        systemId: payload.system_id,
        date: payload.date,
      },
    },
    { status: 201 },
  )
}
