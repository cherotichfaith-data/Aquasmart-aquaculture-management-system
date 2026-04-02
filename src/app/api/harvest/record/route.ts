import { NextResponse } from "next/server"
import { z } from "zod"
import { inventoryWriteTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { getSystemFarmId, requireRateLimitedRouteUser, revalidateWriteTags } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const harvestSchema = z.object({
  system_id: z.number().int().positive(),
  batch_id: z.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  number_of_fish_harvest: z.number().min(0),
  total_weight_harvest: z.number().min(0),
  type_of_harvest: z.enum(["partial", "final"]),
  abw: z.number().min(0),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "harvest:record", apiRateLimits.mutation)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof harvestSchema>
  try {
    payload = harvestSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid harvest payload." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const systemScope = await getSystemFarmId(supabase, payload.system_id, "harvest:record")
  if ("response" in systemScope) return systemScope.response

  const insertPayload = {
    system_id: payload.system_id,
    batch_id: payload.batch_id ?? null,
    date: payload.date,
    number_of_fish_harvest: payload.number_of_fish_harvest,
    total_weight_harvest: payload.total_weight_harvest,
    type_of_harvest: payload.type_of_harvest,
    abw: payload.abw,
  }

  const { data, error } = await supabase.from("fish_harvest").insert(insertPayload).select().single()

  if (error || !data) {
    logSbError("harvest:record:insert", error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return NextResponse.json({ error: "Unable to record harvest." }, { status })
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
