import { NextResponse } from "next/server"
import { z } from "zod"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

const VALID_ROLES = [
  "farm_manager",
  "farm_technician",
  "inventory_storekeeper",
  "analyst_planner",
  "viewer_auditor",
] as const

const inviteSchema = z.object({
  farmId: z.string().uuid("Invalid farm ID."),
  email: z.string().email("A valid email is required."),
  role: z.enum(VALID_ROLES, { errorMap: () => ({ message: "Invalid role." }) }),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(
    supabase,
    request,
    "settings:invite",
    apiRateLimits.mutation,
  )
  if ("response" in auth) return auth.response

  let payload: z.infer<typeof inviteSchema>
  try {
    payload = inviteSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid invite payload."
        : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { data, error } = await supabase.rpc("create_farm_user_invitation", {
    p_farm_id: payload.farmId,
    p_email: payload.email,
    p_role: payload.role,
  })

  if (error) {
    if (isSbPermissionDenied(error)) {
      return NextResponse.json(
        { error: "You do not have permission to invite users to this farm." },
        { status: 403 },
      )
    }
    logSbError("settings:invite:create", error)
    return NextResponse.json({ error: "Failed to create invitation." }, { status: 500 })
  }

  return NextResponse.json({ invitationId: data }, { status: 201 })
}
