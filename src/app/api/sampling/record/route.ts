import { NextResponse } from "next/server"
import { z } from "zod"
import { inventoryWriteTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { getSystemFarmId, requireRateLimitedRouteUser, revalidateWriteTags } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const samplingSchema = z.object({
  system_id: z.number().int().positive(),
  batch_id: z.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  number_of_fish_sampling: z.number().positive(),
  total_weight_sampling: z.number().positive(),
  abw: z.number().min(0),
  notes: z.string().max(500).nullable().optional(),
  local_id: z.string().max(128).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "sampling:record", apiRateLimits.mutation)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof samplingSchema>
  try {
    payload = samplingSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid sampling payload." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const systemScope = await getSystemFarmId(supabase, payload.system_id, "sampling:record")
  if ("response" in systemScope) return systemScope.response

  const insertPayload = {
    system_id: payload.system_id,
    batch_id: payload.batch_id ?? null,
    date: payload.date,
    number_of_fish_sampling: payload.number_of_fish_sampling,
    total_weight_sampling: payload.total_weight_sampling,
    abw: payload.abw,
    notes: payload.notes?.trim() ? payload.notes.trim() : null,
    local_id: payload.local_id ?? null,
    synced_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("fish_sampling_weight")
    .upsert(insertPayload, { onConflict: "local_id" })
    .select()
    .maybeSingle()

  if (error || !data) {
    logSbError("sampling:record:insert", error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return NextResponse.json({ error: "Unable to record sampling." }, { status })
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
