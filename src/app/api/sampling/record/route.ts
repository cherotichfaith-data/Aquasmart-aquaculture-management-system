import { submitApprovalResponse } from "@/lib/server/approvals"
import { NextResponse } from "next/server"
import { z } from "zod"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { getSystemFarmId, requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"

const samplingSchema = z.object({
  system_id: z.number().int().positive(),
  batch_id: z.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  number_of_fish_sampling: z.number().int("Sample count must be a whole number.").positive(),
  total_weight_sampling: z.number().positive(),
  notes: z.string().max(500).nullable().optional(),
  local_id: z.string().max(128).optional(),
})

const normalizeSamplingWeightKg = (totalWeight: number, sampleCount: number) => {
  if (sampleCount <= 0) return totalWeight
  return totalWeight / sampleCount > 20 ? totalWeight / 1000 : totalWeight
}

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
    total_weight_sampling: normalizeSamplingWeightKg(payload.total_weight_sampling, payload.number_of_fish_sampling),
    notes: payload.notes?.trim() ? payload.notes.trim() : null,
    local_id: payload.local_id ?? null,
    synced_at: new Date().toISOString(),
  }

  return submitApprovalResponse(supabase, "sampling", systemScope.farmId, insertPayload)
}
