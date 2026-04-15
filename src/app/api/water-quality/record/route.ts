import { NextResponse } from "next/server"
import { z } from "zod"
import { waterQualityWriteTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { getSystemFarmId, requireRateLimitedRouteUser, revalidateWriteTags } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const measurementSchema = z.object({
  system_id: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  measured_at: z.string().min(1),
  water_depth: z.number().min(0),
  parameter_name: z.enum([
    "temperature",
    "dissolved_oxygen",
    "pH",
    "ammonia",
    "nitrite",
    "nitrate",
    "salinity",
    "secchi_disk_depth",
  ]),
  parameter_value: z.number(),
  location_reference: z.string().max(200).nullable().optional(),
  local_id: z.string().max(128).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "water-quality:record", apiRateLimits.mutation)
  if ("response" in auth) return auth.response

  let payload: Array<z.infer<typeof measurementSchema>>
  try {
    payload = z.array(measurementSchema).min(1).parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid water quality payload." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const systemScope = await getSystemFarmId(supabase, payload[0]!.system_id, "water-quality:record")
  if ("response" in systemScope) return systemScope.response

  const normalized = payload.map((row) => ({
    ...row,
    location_reference: row.location_reference?.trim() ? row.location_reference.trim() : null,
    local_id: row.local_id ?? null,
    synced_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from("water_quality_measurement")
    .upsert(normalized, { onConflict: "local_id" })
    .select()

  if (error || !data) {
    logSbError("water-quality:record:insert", error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return NextResponse.json({ error: "Unable to record water quality data." }, { status })
  }

  revalidateWriteTags(waterQualityWriteTags({ farmId: systemScope.farmId }))

  return NextResponse.json(
    {
      data,
      meta: {
        farmId: systemScope.farmId,
        systemId: payload[0]!.system_id,
        date: payload[0]!.date,
      },
    },
    { status: 201 },
  )
}
