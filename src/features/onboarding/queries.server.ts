import { runServerReadThrough } from "@/lib/cache/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import type { AquasmartRole } from "@/lib/app-entry"

export type OnboardingMembershipSource = "active" | "invite" | "none"

export type OnboardingPageInitialData = {
  displayEmail: string
  fullName: string
  membership: {
    farmId: string | null
    role: AquasmartRole
    source: OnboardingMembershipSource
  }
  canCreateWorkspace: boolean
  notice: string | null
}

function isPrivateSchemaUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false
  const maybe = error as { code?: string; message?: string }
  return maybe.code === "PGRST106" || /Invalid schema:\s*private/i.test(String(maybe.message ?? ""))
}

function resolveFallbackName(user: { user_metadata?: Record<string, unknown> | null }) {
  if (typeof user.user_metadata?.full_name === "string") {
    return user.user_metadata.full_name
  }

  if (typeof user.user_metadata?.name === "string") {
    return user.user_metadata.name
  }

  return ""
}

async function findPendingInvitationByEmail(email: string | null | undefined) {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""
  if (!normalizedEmail) return null

  const admin = createAdminClient() as ReturnType<typeof createAdminClient> & {
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
      }
    }
  }

  const { data, error } = await admin
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

export async function getOnboardingPageInitialData(params: { linkedFarmId: string | null }) {
  const { user, accessToken } = await requireUserContext("/onboarding")

  return runServerReadThrough({
    keyParts: ["onboarding-page", user.id, params.linkedFarmId],
    loader: async (): Promise<OnboardingPageInitialData> => {
      const supabase = createAccessTokenClient(accessToken)
      const [{ data: profileRow, error: profileError }, { data: membershipRows, error: membershipError }] =
        await Promise.all([
          supabase.from("user_profile").select("full_name").eq("user_id", user.id).maybeSingle(),
          supabase
            .from("farm_user")
            .select("farm_id, role")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(2),
        ])

      if (profileError) throw profileError
      if (membershipError) throw membershipError

      const firstMembership = (membershipRows ?? [])[0] ?? null
      const pendingInvite = !firstMembership ? await findPendingInvitationByEmail(user.email) : null
      const membershipRole = (firstMembership?.role ?? pendingInvite?.role ?? null) as AquasmartRole
      const membershipFarmId = firstMembership?.farm_id ?? pendingInvite?.farmId ?? params.linkedFarmId ?? null
      const source: OnboardingMembershipSource = firstMembership
        ? "active"
        : pendingInvite
          ? "invite"
          : "none"

      const notice =
        source === "invite"
          ? "You have a pending farm invitation. Confirm your profile to activate the assigned role and workspace access."
          : source === "active"
            ? "Confirm your profile details, then continue to your workspace."
            : "Create a workspace or ask a farm admin to invite you to an existing farm."

      return {
        displayEmail: user.email?.trim() ?? "",
        fullName: profileRow?.full_name ?? resolveFallbackName(user),
        membership: {
          farmId: membershipFarmId,
          role: membershipRole,
          source,
        },
        canCreateWorkspace: source === "none",
        notice,
      }
    },
  })
}
