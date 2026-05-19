"use server"

import { z } from "zod"
import { cacheTags } from "@/lib/cache/tags"
import { requireMutationActionUser } from "@/lib/server/mutation-actions"
import { revalidateWriteTags } from "@/lib/server/write-through"
import { createAdminClient } from "@/lib/supabase/admin"
import { logSbError } from "@/lib/supabase/log"
import { normalizeRole, type AquaSmartRole } from "@/lib/app-entry"
import type { TablesInsert } from "@/lib/types/database"

const VALID_ROLES = [
  "admin",
  "farm_manager",
  "system_operator",
  "data_analyst",
  "viewer",
] as const

const onboardingProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  role: z.enum(VALID_ROLES, { errorMap: () => ({ message: "Invalid role." }) }),
})

const onboardingBootstrapSchema = z.object({
  farmName: z.string().trim().min(2, "Farm name is required."),
  location: z.string().trim().min(2, "Location is required."),
  owner: z.string().trim().optional().default(""),
  email: z.string().trim().optional().default(""),
  phone: z.string().trim().optional().default(""),
  lowDoThreshold: z.number().finite().min(0).optional().default(5.0),
  highAmmoniaThreshold: z.number().finite().min(0).optional().default(0.05),
  highMortalityThreshold: z.number().finite().min(0).optional().default(2.0),
})

type OnboardingProfileInput = z.infer<typeof onboardingProfileSchema>
type OnboardingBootstrapInput = z.infer<typeof onboardingBootstrapSchema>

type OnboardingProfileResult = {
  farmId: string | null
  role: AquaSmartRole
  membershipAssigned: boolean
  notice?: string
}

type FarmAssignment = {
  admin: ReturnType<typeof createAdminClient>
  farmId: string | null
  role: string | null
  membershipAssigned: boolean
  pendingInviteId: string | null
}

function isPrivateSchemaUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false
  const maybe = error as { code?: string; message?: string }
  return maybe.code === "PGRST106" || /Invalid schema:\s*private/i.test(String(maybe.message ?? ""))
}

async function findPendingInvitationByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string | null | undefined,
) {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""
  if (!normalizedEmail) return null

  const privateAdmin = admin as ReturnType<typeof createAdminClient> & {
    schema: (schema: string) => {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            eq: (column: string, value: string) => {
              is: (column: string, value: null) => {
                is: (column: string, value: null) => {
                  order: (column: string, options: { ascending: boolean }) => {
                    limit: (count: number) => Promise<{
                      data: Array<Record<string, string | null>> | null
                      error: { message?: string } | null
                    }>
                  }
                }
              }
            }
          }
        }
        update: (values: Record<string, string | null>) => {
          eq: (column: string, value: string) => Promise<{ error: { message?: string } | null }>
        }
      }
    }
  }

  const { data, error } = await privateAdmin
    .schema("private")
    .from("farm_user_invitation")
    .select("id, farm_id, role, status")
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: true })
    .limit(1)

  if (error) {
    if (isPrivateSchemaUnavailable(error)) return null
    throw error
  }

  const invitation = (data ?? [])[0] ?? null
  if (!invitation?.farm_id || !invitation?.role) return null

  return {
    id: invitation.id ?? null,
    farmId: invitation.farm_id,
    role: invitation.role,
  }
}

async function markPendingInvitationAccepted(
  admin: ReturnType<typeof createAdminClient>,
  invitationId: string,
  userId: string,
) {
  const privateAdmin = admin as ReturnType<typeof createAdminClient> & {
    schema: (schema: string) => {
      from: (table: string) => {
        update: (values: Record<string, string | null>) => {
          eq: (column: string, value: string) => Promise<{ error: { message?: string } | null }>
        }
      }
    }
  }

  const { error } = await privateAdmin
    .schema("private")
    .from("farm_user_invitation")
    .update({
      status: "accepted",
      invited_user_id: userId,
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", invitationId)

  if (error) {
    if (isPrivateSchemaUnavailable(error)) return
    throw error
  }
}

async function resolveTargetFarmAssignment(userId: string, email: string | null | undefined): Promise<FarmAssignment> {
  const admin = createAdminClient()

  const { data: membership, error: membershipError } = await admin
    .from("farm_user")
    .select("farm_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    throw membershipError
  }

  if (membership?.farm_id) {
    return {
      admin,
      farmId: membership.farm_id,
      role: typeof membership.role === "string" ? membership.role : null,
      membershipAssigned: true,
      pendingInviteId: null,
    }
  }

  const pendingInvite = await findPendingInvitationByEmail(admin, email)
  if (pendingInvite?.farmId) {
    return {
      admin,
      farmId: pendingInvite.farmId,
      role: typeof pendingInvite.role === "string" ? pendingInvite.role : null,
      membershipAssigned: true,
      pendingInviteId: pendingInvite.id,
    }
  }

  return {
    admin,
    farmId: null,
    role: null,
    membershipAssigned: false,
    pendingInviteId: null,
  }
}

async function claimPendingInvitationsForCurrentUser(
  supabase: Awaited<ReturnType<typeof requireMutationActionUser>>["supabase"],
) {
  const { error } = await supabase.rpc("claim_my_farm_user_invitations")

  if (error) {
    if (isPrivateSchemaUnavailable(error)) return
    throw error
  }
}

export async function completeOnboardingProfileAction(
  input: OnboardingProfileInput,
): Promise<OnboardingProfileResult> {
  const { supabase, user } = await requireMutationActionUser("onboarding:profile")

  let payload: OnboardingProfileInput
  try {
    payload = onboardingProfileSchema.parse(input)
  } catch (error) {
    throw new Error(
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid onboarding payload."
        : "Invalid request body.",
    )
  }

  let assignment: FarmAssignment
  try {
    await claimPendingInvitationsForCurrentUser(supabase)
    assignment = await resolveTargetFarmAssignment(user.id, user.email ?? null)
  } catch (error) {
    logSbError("onboarding:profile:resolveTargetFarmId", error)
    throw new Error("Unable to resolve your farm access.")
  }

  const selectedRole = (normalizeRole(assignment.role) ?? payload.role) as (typeof VALID_ROLES)[number]
  const nextUserMetadata = {
    ...(typeof user.user_metadata === "object" && user.user_metadata ? user.user_metadata : {}),
    full_name: payload.fullName,
    name: payload.fullName,
    role: selectedRole,
  }

  const { error: metadataError } = await assignment.admin.auth.admin.updateUserById(user.id, {
    user_metadata: nextUserMetadata,
  })
  if (metadataError) {
    logSbError("onboarding:profile:updateUserMetadata", metadataError)
  }

  const { error: profileError } = await assignment.admin.from("user_profile").upsert(
    {
      user_id: user.id,
      full_name: payload.fullName,
      role: selectedRole,
    },
    { onConflict: "user_id" },
  )

  if (profileError) {
    logSbError("onboarding:profile:upsertUserProfile", profileError)
    throw new Error("Unable to save your profile.")
  }

  if (!assignment.farmId) {
    return {
      farmId: null,
      role: selectedRole,
      membershipAssigned: false,
      notice: "Profile saved. Create a workspace or ask a farm admin for an invite to continue.",
    }
  }

  const { error: membershipError } = await assignment.admin.from("farm_user").upsert(
    {
      user_id: user.id,
      farm_id: assignment.farmId,
      role: selectedRole,
    },
    { onConflict: "farm_id,user_id" },
  )

  if (membershipError) {
    logSbError("onboarding:profile:upsertFarmUser", membershipError)
    throw new Error("Unable to assign your farm access.")
  }

  if (assignment.pendingInviteId) {
    try {
      await markPendingInvitationAccepted(assignment.admin, assignment.pendingInviteId, user.id)
    } catch (error) {
      logSbError("onboarding:profile:acceptPendingInvite", error)
    }
  }

  revalidateWriteTags([cacheTags.farmOptions(user.id), cacheTags.farm(assignment.farmId)])

  return {
    farmId: assignment.farmId,
    role: selectedRole,
    membershipAssigned: true,
  }
}

export async function bootstrapOnboardingWorkspaceAction(
  input: OnboardingBootstrapInput,
): Promise<{ farmId: string; alreadyProvisioned: boolean }> {
  const { supabase, user } = await requireMutationActionUser("onboarding:bootstrap")

  const { data: farmOptions, error: farmOptionsError } = await supabase.rpc("api_farm_options_rpc")
  if (farmOptionsError) {
    logSbError("onboarding:bootstrap:farmOptions", farmOptionsError)
    throw new Error("Unable to verify onboarding status.")
  }

  const existingFarmId = (farmOptions ?? [])[0]?.id ?? null
  if (existingFarmId) {
    return { farmId: existingFarmId, alreadyProvisioned: true }
  }

  let payload: OnboardingBootstrapInput
  try {
    payload = onboardingBootstrapSchema.parse(input)
  } catch (error) {
    throw new Error(
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid onboarding payload."
        : "Invalid request body.",
    )
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (error) {
    logSbError("onboarding:bootstrap:createAdminClient", error)
    throw new Error("Server onboarding is not configured. Set SUPABASE_SERVICE_ROLE_KEY.")
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
    throw new Error("Unable to create the farm workspace.")
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
    throw new Error("Farm created, but owner membership setup failed.")
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
    throw new Error("Farm created, but default thresholds could not be saved.")
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

  revalidateWriteTags([cacheTags.farmOptions(user.id), cacheTags.farm(farm.id)])

  return {
    farmId: farm.id,
    alreadyProvisioned: false,
  }
}
