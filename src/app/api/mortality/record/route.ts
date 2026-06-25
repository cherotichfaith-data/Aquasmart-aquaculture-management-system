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
  number_of_fish_mortality: z.number().int("Dead fish count must be a whole number.").positive(),
  total_weight_mortality: z.number().min(0).nullable().optional(),
  cause: z.enum(MORTALITY_CAUSES),
  notes: z.string().max(500).nullable().optional(),
  local_id: z.string().max(128).optional(),
}).superRefine((payload, ctx) => {
  if (payload.number_of_fish_mortality >= 100 && payload.total_weight_mortality == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["total_weight_mortality"],
      message: "Total dead weight is required when mortality is 100 fish or more.",
    })
  }
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
      system_id: payload.system_id,
      batch_id: payload.batch_id ?? null,
      date: payload.date,
      number_of_fish_mortality: payload.number_of_fish_mortality,
      total_weight_mortality: payload.total_weight_mortality ?? null,
      cause: payload.cause,
      notes: payload.notes?.trim() ? payload.notes.trim() : null,
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
