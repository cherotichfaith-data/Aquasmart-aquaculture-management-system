import { NextResponse } from "next/server"
import { z } from "zod"
import { inventoryWriteTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { getSystemFarmIds, requireRateLimitedRouteUser, revalidateWriteTags } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const transferSchema = z.object({
  origin_system_id: z.number().int().positive(),
  target_system_id: z.number().int().positive().nullable().optional(),
  external_target_name: z.string().max(200).nullable().optional(),
  transfer_type: z.enum(["transfer", "grading", "density_thinning", "broodstock", "count_check", "external_out"]),
  batch_id: z.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  number_of_fish_transfer: z.number().positive(),
  total_weight_transfer: z.number().positive(),
  abw: z.number().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
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

  const { data, error } = await supabase
    .from("fish_transfer")
    .insert({
      ...payload,
      target_system_id: payload.target_system_id ?? null,
      batch_id: payload.batch_id ?? null,
      abw: payload.abw ?? null,
      external_target_name: payload.external_target_name?.trim() ? payload.external_target_name.trim() : null,
      notes: payload.notes?.trim() ? payload.notes.trim() : null,
    })
    .select()
    .single()

  if (error || !data) {
    logSbError("transfer:record:insert", error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return NextResponse.json({ error: "Unable to record transfer." }, { status })
  }

  const revalidateFarmIds = new Set(systemScope.farmIdsBySystemId.values())
  revalidateFarmIds.forEach((farmId) => {
    revalidateWriteTags(
      inventoryWriteTags({ farmId, systemId: payload.origin_system_id, includeProduction: true }),
    )
  })

  return NextResponse.json(
    {
      data,
      meta: {
        farmId: originFarmId,
        systemId: payload.origin_system_id,
        date: payload.date,
      },
    },
    { status: 201 },
  )
}
