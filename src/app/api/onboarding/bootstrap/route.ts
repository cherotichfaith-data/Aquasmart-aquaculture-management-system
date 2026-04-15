import { NextResponse } from "next/server"
import { z } from "zod"
import { cacheTags } from "@/lib/cache/tags"
import { apiRateLimits } from "@/lib/server/rate-limit"
import { requireRateLimitedRouteUser, revalidateWriteTags } from "@/lib/server/write-through"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logSbError } from "@/lib/supabase/log"
import type { TablesInsert } from "@/lib/types/database"

const onboardingSchema = z
  .object({
    farmName: z.string().trim().min(2, "Farm name is required."),
    location: z.string().trim().min(2, "Location is required."),
    owner: z.string().trim().optional().default(""),
    email: z.string().trim().optional().default(""),
    phone: z.string().trim().optional().default(""),
    // Thresholds optional — sensible defaults are seeded automatically
    lowDoThreshold: z.number().finite().min(0).optional().default(5.0),
    highAmmoniaThreshold: z.number().finite().min(0).optional().default(0.05),
    highMortalityThreshold: z.number().finite().min(0).optional().default(2.0),
  })

export async function POST(request: Request) {
  const supabase = await createClient()
  const auth = await requireRateLimitedRouteUser(
    supabase,
    request,
    "onboarding:bootstrap",
    apiRateLimits.onboardingBootstrap,
  )
  if ("response" in auth) return auth.response
  const { user } = auth

  const { data: farmOptions, error: farmOptionsError } = await supabase.rpc("api_farm_options_rpc")
  if (farmOptionsError) {
    logSbError("onboarding:bootstrap:farmOptions", farmOptionsError)
    return NextResponse.json({ error: "Unable to verify onboarding status." }, { status: 500 })
  }

  const existingFarmId = (farmOptions ?? [])[0]?.id ?? null
  if (existingFarmId) {
    return NextResponse.json({ farmId: existingFarmId, alreadyProvisioned: true })
  }

  let payload: z.infer<typeof onboardingSchema>
  try {
    const json = await request.json()
    payload = onboardingSchema.parse(json)
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid onboarding payload." : "Invalid request body."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (error) {
    logSbError("onboarding:bootstrap:createAdminClient", error)
    return NextResponse.json(
      { error: "Server onboarding is not configured. Set SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    )
  }

  const { data: farm, error: farmInsertError } = await admin
    .from("farm")
    .insert({
      name: payload.farmName,
      location: payload.location,
      owner: payload.owner,
      email: payload.email,
      phone: payload.phone || null,
    })
    .select("id")
    .single()

  if (farmInsertError || !farm?.id) {
    logSbError("onboarding:bootstrap:createFarm", farmInsertError)
    return NextResponse.json({ error: "Unable to create the farm workspace." }, { status: 500 })
  }

  const { error: membershipError } = await admin
    .from("farm_user")
    .upsert(
      {
        farm_id: farm.id,
        user_id: user.id,
        role: "admin",
      },
      { onConflict: "farm_id,user_id" },
    )

  if (membershipError) {
    logSbError("onboarding:bootstrap:createFarmUser", membershipError)
    return NextResponse.json({ error: "Farm created, but owner membership setup failed." }, { status: 500 })
  }

  const { error: thresholdError } = await admin
    .from("alert_threshold")
    .insert({
      scope: "farm",
      farm_id: farm.id,
      low_do_threshold: payload.lowDoThreshold,
      high_ammonia_threshold: payload.highAmmoniaThreshold,
      high_mortality_threshold: payload.highMortalityThreshold,
    } as TablesInsert<"alert_threshold">)

  if (thresholdError) {
    logSbError("onboarding:bootstrap:createThresholds", thresholdError)
    return NextResponse.json({ error: "Farm created, but default thresholds could not be saved." }, { status: 500 })
  }

  const nextUserMetadata = {
    ...(typeof user.user_metadata === "object" && user.user_metadata ? user.user_metadata : {}),
    role: "admin",
    farm_name: payload.farmName,
    location: payload.location,
    owner: payload.owner,
  }
  const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: nextUserMetadata,
  })
  if (metadataError) {
    logSbError("onboarding:bootstrap:updateUserMetadata", metadataError)
  }

  revalidateWriteTags([cacheTags.farmOptions(user.id)])

  return NextResponse.json(
    {
      farmId: farm.id,
      alreadyProvisioned: false,
    },
    { status: 201 },
  )
}
