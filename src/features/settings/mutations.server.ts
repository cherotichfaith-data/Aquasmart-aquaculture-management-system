"use server"

import { z } from "zod"
import { requireMutationActionUser } from "@/lib/server/mutation-actions"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"
import {
  listFarmMembersForFarm,
  listPendingFarmInvitationsForFarm,
  type PendingFarmInvitation,
  type SettingsFarmMember,
} from "@/features/settings/users.server"

const VALID_ROLES = [
  "admin",
  "farm_manager",
  "system_operator",
  "data_analyst",
  "viewer",
] as const

const inviteSchema = z.object({
  farmId: z.string().uuid("Invalid farm ID."),
  email: z.string().email("A valid email is required."),
  role: z.enum(VALID_ROLES, { errorMap: () => ({ message: "Invalid role." }) }),
})

const memberListSchema = z.object({
  farmId: z.string().uuid("Invalid farm ID."),
})

const updateRoleSchema = z.object({
  farmId: z.string().uuid("Invalid farm ID."),
  userId: z.string().uuid("Invalid user ID."),
  role: z.enum(VALID_ROLES, { errorMap: () => ({ message: "Invalid role." }) }),
})

const removeMemberSchema = z.object({
  farmId: z.string().uuid("Invalid farm ID."),
  userId: z.string().uuid("Invalid user ID."),
})

const revokeInviteSchema = z.object({
  farmId: z.string().uuid("Invalid farm ID."),
  invitationId: z.string().uuid("Invalid invitation ID."),
})

const ACCESS_GRANT_ALLOWED_ROLES = new Set(["admin"])

type InviteActionResult = {
  assigned: true
  pendingInvite: true
  inviteSent: boolean
}

function getAppOrigin() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim()

  if (!configured) return "http://localhost:3000"
  return configured.startsWith("http") ? configured : `https://${configured}`
}

function buildInviteRedirectUrl() {
  const origin = getAppOrigin().replace(/\/$/, "")
  const confirmUrl = new URL("/auth/confirm", origin)
  confirmUrl.searchParams.set("next", "/onboarding")
  return confirmUrl.toString()
}

function isPrivateSchemaUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false
  const maybe = error as { code?: string; message?: string }
  return maybe.code === "PGRST106" || /Invalid schema:\s*private/i.test(String(maybe.message ?? ""))
}

async function assertAdminMembership(farmId: string, userId: string) {
  const { supabase } = await requireMutationActionUser("settings:users")
  const { data: requesterMembership, error: requesterMembershipError } = await supabase
    .from("farm_user")
    .select("role")
    .eq("farm_id", farmId)
    .eq("user_id", userId)
    .maybeSingle()

  if (requesterMembershipError) {
    if (isSbPermissionDenied(requesterMembershipError)) {
      throw new Error("You do not have permission to manage users for this farm.")
    }
    logSbError("settings:users:requesterMembership", requesterMembershipError)
    throw new Error("Unable to verify your farm role.")
  }

  if (!requesterMembership?.role || !ACCESS_GRANT_ALLOWED_ROLES.has(requesterMembership.role)) {
    throw new Error("You do not have permission to manage users for this farm.")
  }
}

export async function grantFarmAccessAction(
  input: z.infer<typeof inviteSchema>,
): Promise<InviteActionResult> {
  const { supabase, user } = await requireMutationActionUser("settings:invite")

  let payload: z.infer<typeof inviteSchema>
  try {
    payload = inviteSchema.parse(input)
  } catch (error) {
    throw new Error(
      error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid invite payload." : "Invalid request body.",
    )
  }

  await assertAdminMembership(payload.farmId, user.id)

  const { data: invitationRows, error } = await supabase.rpc("create_farm_user_invitation", {
    p_farm_id: payload.farmId,
    p_email: payload.email.trim().toLowerCase(),
    p_role: payload.role,
  })

  if (error) {
    logSbError("settings:invite:createPendingInvite", error)
    if (isPrivateSchemaUnavailable(error)) {
      throw new Error("Pending invites are not enabled on this deployment yet.")
    }
    throw new Error("Unable to save the pending invitation.")
  }

  const invitationId = invitationRows?.[0]?.id ?? null
  const admin = createAdminClient()
  const normalizedEmail = payload.email.trim().toLowerCase()
  const inviteOptions = {
    redirectTo: buildInviteRedirectUrl(),
    data: {
      invited_farm_id: payload.farmId,
      invited_role: payload.role,
    },
  }
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, inviteOptions)

  if (inviteError) {
    logSbError("settings:invite:sendAuthInvite", inviteError)
    return { assigned: true, pendingInvite: true, inviteSent: false }
  }

  if (invitationId) {
    const { error: markSentError } = await supabase.rpc("mark_farm_user_invitation_sent", {
      p_invitation_id: invitationId,
    })
    if (markSentError) {
      logSbError("settings:invite:markSent", markSentError)
    }
  }

  return { assigned: true, pendingInvite: true, inviteSent: true }
}

export async function listFarmMembersAction(input: z.infer<typeof memberListSchema>): Promise<SettingsFarmMember[]> {
  const { user } = await requireMutationActionUser("settings:listMembers")
  const payload = memberListSchema.parse(input)
  await assertAdminMembership(payload.farmId, user.id)
  return listFarmMembersForFarm(payload.farmId)
}

export async function updateFarmMemberRoleAction(input: z.infer<typeof updateRoleSchema>): Promise<SettingsFarmMember[]> {
  const { user } = await requireMutationActionUser("settings:updateMemberRole")
  const payload = updateRoleSchema.parse(input)
  await assertAdminMembership(payload.farmId, user.id)

  const admin = createAdminClient()
  const { error } = await admin
    .from("farm_user")
    .update({ role: payload.role })
    .eq("farm_id", payload.farmId)
    .eq("user_id", payload.userId)

  if (error) {
    logSbError("settings:updateMemberRole", error)
    throw new Error("Unable to update the member role.")
  }

  return listFarmMembersForFarm(payload.farmId)
}

export async function removeFarmMemberAction(input: z.infer<typeof removeMemberSchema>): Promise<SettingsFarmMember[]> {
  const { user } = await requireMutationActionUser("settings:removeMember")
  const payload = removeMemberSchema.parse(input)
  await assertAdminMembership(payload.farmId, user.id)

  if (payload.userId === user.id) {
    throw new Error("You cannot remove your own admin access from this page.")
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("farm_user")
    .delete()
    .eq("farm_id", payload.farmId)
    .eq("user_id", payload.userId)

  if (error) {
    logSbError("settings:removeMember", error)
    throw new Error("Unable to remove the member from this farm.")
  }

  return listFarmMembersForFarm(payload.farmId)
}

export async function listPendingFarmInvitesAction(
  input: z.infer<typeof memberListSchema>,
): Promise<PendingFarmInvitation[]> {
  const { supabase, user } = await requireMutationActionUser("settings:listPendingInvites")
  const payload = memberListSchema.parse(input)
  await assertAdminMembership(payload.farmId, user.id)
  return listPendingFarmInvitationsForFarm(payload.farmId, supabase)
}

export async function revokePendingFarmInviteAction(
  input: z.infer<typeof revokeInviteSchema>,
): Promise<PendingFarmInvitation[]> {
  const { supabase, user } = await requireMutationActionUser("settings:revokeInvite")
  const payload = revokeInviteSchema.parse(input)
  await assertAdminMembership(payload.farmId, user.id)

  const { data, error } = await supabase.rpc("revoke_farm_user_invitation", {
    p_invitation_id: payload.invitationId,
  })

  if (error || !data) {
    logSbError("settings:revokeInvite", error)
    throw new Error("Unable to revoke the pending invitation.")
  }

  return listPendingFarmInvitationsForFarm(payload.farmId, supabase)
}
