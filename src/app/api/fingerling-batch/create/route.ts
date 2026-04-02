import { NextResponse } from "next/server"
import { z } from "zod"
import { cacheTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser, revalidateWriteTags } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const fingerlingBatchSchema = z.object({
  farm_id: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
  date_of_delivery: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supplier_id: z.number().int().positive(),
  number_of_fish: z.number().finite().min(0).nullable().optional(),
  abw: z.number().finite().min(0).nullable().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "fingerling-batch:create", apiRateLimits.mutation)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof fingerlingBatchSchema>
  try {
    payload = fingerlingBatchSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid fingerling batch payload." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("fingerling_batch")
    .insert({
      farm_id: payload.farm_id,
      name: payload.name,
      date_of_delivery: payload.date_of_delivery,
      supplier_id: payload.supplier_id,
      number_of_fish: payload.number_of_fish ?? null,
      abw: payload.abw ?? null,
    })
    .select()
    .single()

  if (error || !data) {
    logSbError("fingerling-batch:create:insert", error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return NextResponse.json({ error: "Unable to create fingerling batch." }, { status })
  }

  revalidateWriteTags([cacheTags.batchOptions(payload.farm_id)])

  return NextResponse.json({ data }, { status: 201 })
}
