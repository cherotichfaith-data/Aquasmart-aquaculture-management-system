import { NextResponse } from "next/server"
import { z } from "zod"
import { inventoryWriteTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { getSystemFarmId, requireRateLimitedRouteUser, revalidateWriteTags } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import { MORTALITY_CAUSES } from "@/lib/mortality"

const mortalitySchema = z.object({
  farm_id: z.string().uuid(),
  system_id: z.number().int().positive(),
  batch_id: z.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  number_of_fish_mortality: z.number().positive(),
  cause: z.enum(MORTALITY_CAUSES),
  avg_dead_wt_g: z.number().min(0).nullable().optional(),
  is_mass_mortality: z.boolean().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  local_id: z.string().max(128).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "mortality:record", apiRateLimits.mutation)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof mortalitySchema>
  try {
    payload = mortalitySchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid mortality payload." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const systemScope = await getSystemFarmId(supabase, payload.system_id, "mortality:record")
  if ("response" in systemScope) return systemScope.response

  const { data, error } = await supabase
    .from("fish_mortality")
    .upsert({
      ...payload,
      batch_id: payload.batch_id ?? null,
      avg_dead_wt_g: payload.avg_dead_wt_g ?? null,
      is_mass_mortality: payload.is_mass_mortality ?? null,
      notes: payload.notes?.trim() ? payload.notes.trim() : null,
      recorded_by: auth.user.id,
      local_id: payload.local_id ?? null,
      synced_at: new Date().toISOString(),
    }, {
      onConflict: "local_id",
    })
    .select()
    .maybeSingle()

  if (error || !data) {
    logSbError("mortality:record:insert", error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return NextResponse.json({ error: "Unable to record mortality." }, { status })
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
