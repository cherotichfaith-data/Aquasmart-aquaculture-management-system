import { NextResponse } from "next/server"
import { z } from "zod"
import { cacheTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser, revalidateWriteTags } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const systemSchema = z.object({
  farm_id: z.string().uuid(),
  commissioned_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  unit: z.string().max(120).nullable().optional(),
  name: z.string().min(1).max(120),
  type: z.enum(["rectangular_cage", "circular_cage", "pond", "tank"]),
  growth_stage: z.enum(["nursing", "grow_out"]),
  volume: z.number().min(0).nullable().optional(),
  depth: z.number().min(0).nullable().optional(),
  length: z.number().min(0).nullable().optional(),
  width: z.number().min(0).nullable().optional(),
  diameter: z.number().min(0).nullable().optional(),
  is_active: z.boolean().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "system:create", apiRateLimits.mutation)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof systemSchema>
  try {
    payload = systemSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid system payload." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("system")
    .insert({
      ...payload,
      commissioned_at: payload.commissioned_at ?? null,
      unit: payload.unit?.trim() ? payload.unit.trim() : null,
      is_active: payload.is_active ?? true,
      volume: payload.volume ?? null,
      depth: payload.depth ?? null,
      length: payload.length ?? null,
      width: payload.width ?? null,
      diameter: payload.diameter ?? null,
    })
    .select()
    .single()

  if (error || !data) {
    logSbError("system:create:insert", error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return NextResponse.json({ error: "Unable to create system." }, { status })
  }

  revalidateWriteTags([
    cacheTags.farm(payload.farm_id),
    cacheTags.systems(payload.farm_id),
    cacheTags.dashboard(payload.farm_id),
    cacheTags.reports(payload.farm_id, "recent-entries"),
  ])

  return NextResponse.json(
    {
      data,
      meta: {
        farmId: payload.farm_id,
        systemId: data.id,
        date: data.created_at,
      },
    },
    { status: 201 },
  )
}
