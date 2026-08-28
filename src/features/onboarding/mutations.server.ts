"use server"

import { z } from "zod"
import { cacheTags } from "@/lib/cache/tags"
import { requireMutationActionUser } from "@/lib/server/mutation-actions"
import { revalidateWriteTags } from "@/lib/server/write-through"
import { createAdminClient } from "@/lib/supabase/admin"
import { logSbError } from "@/lib/supabase/log"
import { normalizeRole, type Samaki360Role } from "@/lib/app-entry"

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

type OnboardingProfileInput = z.infer<typeof onboardingProfileSchema>

type OnboardingProfileResult = {
  farmId: string | null
  role: Samaki360Role
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
      email: user.email ?? null,
      full_name: payload.fullName,
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
