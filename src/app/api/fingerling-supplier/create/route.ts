import { NextResponse } from "next/server"
import { z } from "zod"
import { cacheTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser, revalidateWriteTags } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const fingerlingSupplierSchema = z.object({
  company_name: z.string().trim().min(1).max(255),
  location_country: z.string().trim().min(1).max(255),
  location_city: z.string().trim().max(255).nullable().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(supabase, request, "fingerling-supplier:create", apiRateLimits.mutation)
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof fingerlingSupplierSchema>
  try {
    payload = fingerlingSupplierSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid fingerling supplier payload."
        : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("fingerling_supplier")
    .insert({
      company_name: payload.company_name,
      location_country: payload.location_country,
      location_city: payload.location_city?.trim() ? payload.location_city.trim() : null,
    })
    .select()
    .single()

  if (error || !data) {
    logSbError("fingerling-supplier:create:insert", error)
    const status = isSbPermissionDenied(error) ? 403 : 500
    return NextResponse.json({ error: "Unable to create fingerling supplier." }, { status })
  }

  revalidateWriteTags([cacheTags.fingerlingSuppliers()])

  return NextResponse.json({ data }, { status: 201 })
}
