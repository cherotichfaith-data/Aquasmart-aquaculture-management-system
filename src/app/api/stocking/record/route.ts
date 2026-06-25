import { NextResponse } from "next/server"
import { z } from "zod"
import { inventoryWriteTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { getSystemFarmId, requireRateLimitedRouteUser, revalidateWriteTags } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import { Constants, type Database } from "@/lib/types/database"

type StockingInsert = Database["public"]["Tables"]["fish_stocking"]["Insert"]
type DbAssignedStockingInsert = Omit<StockingInsert, "abw" | "cycle_id"> & {
  abw?: never
  cycle_id?: StockingInsert["cycle_id"]
}

const stockingSchema = z.object({
  system_id: z.number().int().positive(),
  batch_id: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  number_of_fish_stocking: z.number().int("Stocking count must be a whole number.").positive(),
  total_weight_stocking: z.number().positive(),
  notes: z.string().max(500).nullable().optional(),
  type_of_stocking: z.enum(Constants.public.Enums.type_of_stocking),
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

  const insertPayload: DbAssignedStockingInsert = {
    system_id: payload.system_id,
    batch_id: payload.batch_id,
    date: payload.date,
    number_of_fish_stocking: payload.number_of_fish_stocking,
    total_weight_stocking: payload.total_weight_stocking,
    type_of_stocking: payload.type_of_stocking,
    notes: payload.notes?.trim() ? payload.notes.trim() : null,
    local_id: payload.local_id ?? null,
    synced_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("fish_stocking")
    .upsert(insertPayload as unknown as StockingInsert, { onConflict: "local_id" })
    .select()
    .maybeSingle()

  if (error || !data) {
    logSbError("stocking:record:insert", error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return NextResponse.json({ error: "Unable to record stocking." }, { status })
  }

  const { error: statusError } = await supabase
    .from("system")
    .update({ cage_status: "occupied" })
    .eq("id", payload.system_id)
    .eq("farm_id", systemScope.farmId)

  if (statusError) {
    logSbError("stocking:record:updateCageStatus", statusError)
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
