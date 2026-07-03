"use server"

import type { User } from "@supabase/supabase-js"
import { z } from "zod"
import { requireMutationActionUser } from "@/lib/server/mutation-actions"
import { createAdminClient } from "@/lib/supabase/admin"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { logSbError } from "@/lib/supabase/log"
import { normalizeRole } from "@/lib/app-entry"
import { getSessionIdentity } from "@/lib/supabase/session"

const accountSetupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  accessToken: z.string().min(20).optional(),
})

export async function completeAccountSetupAction(input: z.infer<typeof accountSetupSchema>) {
  const payload = accountSetupSchema.parse(input)
  const admin = createAdminClient()
  const tokenIdentity = payload.accessToken ? getSessionIdentity(payload.accessToken) : null

  let user: Pick<User, "id" | "email" | "user_metadata" | "app_metadata"> | null = tokenIdentity
    ? {
        id: tokenIdentity.userId,
        email: tokenIdentity.email ?? undefined,
        user_metadata: tokenIdentity.userMetadata,
        app_metadata: tokenIdentity.appMetadata,
      }
    : null
  let authenticatedSupabase = payload.accessToken ? createAccessTokenClient(payload.accessToken) : null

  if (!user) {
    const actionUser = await requireMutationActionUser("auth:setPasswordProfile")
    user = actionUser.user
    authenticatedSupabase = actionUser.supabase
  }
  const setupUser = user

  try {
    const { error: claimError } = authenticatedSupabase
      ? await authenticatedSupabase.rpc("claim_my_farm_user_invitations")
      : { error: null }
    if (claimError) {
      logSbError("auth:setPasswordProfile:claimInvitations", claimError)
    }
  } catch (error) {
    logSbError("auth:setPasswordProfile:claimInvitations", error)
  }

  const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(setupUser.id)
  if (authUserError) {
    logSbError("auth:setPasswordProfile:getUserById", authUserError)
  }

  const currentMetadata =
    typeof authUserData.user?.user_metadata === "object" && authUserData.user.user_metadata
      ? authUserData.user.user_metadata
      : setupUser.user_metadata
  const metadata = typeof currentMetadata === "object" && currentMetadata ? currentMetadata : {}
  const metadataRole = normalizeRole(typeof metadata.invited_role === "string" ? metadata.invited_role : null)

  const { data: membership, error: membershipError } = await admin
    .from("farm_user")
    .select("farm_id, role")
    .eq("user_id", setupUser.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    logSbError("auth:setPasswordProfile:membership", membershipError)
  }

  const selectedRole = normalizeRole(membership?.role ?? null) ?? metadataRole

  const nextUserMetadata = {
    ...metadata,
    full_name: payload.fullName,
    name: payload.fullName,
    password_configured: true,
    ...(selectedRole ? { role: selectedRole } : {}),
  }

  const { error: metadataError } = await admin.auth.admin.updateUserById(setupUser.id, {
    user_metadata: nextUserMetadata,
  })

  if (metadataError) {
    logSbError("auth:setPasswordProfile:updateMetadata", metadataError)
    throw new Error("Unable to save the user's display name.")
  }

  const { error: profileError } = await admin.from("user_profile").upsert(
    {
      user_id: setupUser.id,
      email: setupUser.email ?? null,
      full_name: payload.fullName,
    },
    { onConflict: "user_id" },
  )

  if (profileError) {
    logSbError("auth:setPasswordProfile:upsertProfile", profileError)
    throw new Error("Unable to save the user's profile.")
  }

  return { ok: true }
}
