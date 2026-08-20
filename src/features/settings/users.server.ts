import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/lib/types/database"
import type { SupabaseClient } from "@supabase/supabase-js"

export type SettingsFarmMember = {
  user_id: string
  full_name: string | null
  email: string | null
  role: string
  created_at: string
}

export type PendingFarmInvitation = {
  id: string
  email: string
  role: string
  status: string
  invited_by: string | null
  created_at: string
  updated_at: string
  last_sent_at: string | null
}

type AppSupabaseClient = SupabaseClient<Database>

function isPrivateSchemaUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false
  const maybe = error as { code?: string; message?: string }
  return maybe.code === "PGRST106" || /Invalid schema:\s*private/i.test(String(maybe.message ?? ""))
}

function resolveAuthUserName(user: {
  user_metadata?: Record<string, unknown> | null
  email?: string | null
}) {
  const metadata = user.user_metadata ?? {}
  const candidates = [
    metadata.full_name,
    metadata.name,
    metadata.first_name,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }

  return null
}

async function listAuthUsersByIds(userIds: string[]) {
  const admin = createAdminClient()
  const remaining = new Set(userIds)
  const usersById = new Map<string, { email: string | null; full_name: string | null }>()
  let page = 1
  const perPage = 200

  while (page <= 20 && remaining.size > 0) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })

    if (error) throw error

    const users = data.users ?? []
    for (const user of users) {
      if (!remaining.has(user.id)) continue
      usersById.set(user.id, {
        email: user.email ?? null,
        full_name: resolveAuthUserName(user),
      })
      remaining.delete(user.id)
    }

    if (users.length < perPage) break
    page += 1
  }

  return usersById
}

/**
 * `supabase` is the caller's own client, not the service role -- since the
 * 20260818100000 migration, "farm_user_select_admin_roster" lets an admin's
 * own session see every member row on a farm they administer, the same
 * boundary every caller already enforces before reaching this function
 * (assertAdminMembership() / farmRole === "admin"). Callers with no user
 * session at all (the reminder cron in
 * app/api/planned-activities/reminders/send/route.ts, which needs every
 * farm's roster regardless of who's logged in) pass createAdminClient()
 * explicitly instead -- that's a deliberate choice made at the call site,
 * not a default baked in here.
 */
export async function listFarmMembersForFarm(farmId: string, supabase: AppSupabaseClient): Promise<SettingsFarmMember[]> {
  const { data: membersData, error: membersError } = await supabase
    .from("farm_user")
    .select("user_id, role, created_at")
    .eq("farm_id", farmId)
    .order("created_at")

  if (membersError) throw membersError

  const userIds = (membersData ?? []).map((member) => member.user_id)
  const [{ data: profiles, error: profilesError }, authUsersById] = await Promise.all([
    userIds.length > 0
      ? supabase.from("user_profile").select("user_id, full_name").in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length > 0
      ? listAuthUsersByIds(userIds)
      : Promise.resolve(new Map<string, { email: string | null; full_name: string | null }>()),
  ])

  if (profilesError) throw profilesError

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.full_name ?? null]))

  return (membersData ?? []).map((member) => ({
    user_id: member.user_id,
    full_name: profileMap.get(member.user_id) ?? authUsersById.get(member.user_id)?.full_name ?? null,
    email: authUsersById.get(member.user_id)?.email ?? null,
    role: member.role,
    created_at: member.created_at ?? new Date().toISOString(),
  }))
}

export async function listPendingFarmInvitationsForFarm(
  farmId: string,
  supabase: AppSupabaseClient,
): Promise<PendingFarmInvitation[]> {
  const { data, error } = await supabase.rpc("api_farm_user_invitations", { p_farm_id: farmId })

  if (error) {
    if (isPrivateSchemaUnavailable(error)) return []
    throw error
  }
  return (data ?? [])
    .filter((invite) => invite.id && invite.email && invite.role && invite.status)
    .map((invite) => ({
    id: invite.id!,
    email: invite.email!,
    role: invite.role!,
    status: invite.status!,
    invited_by: invite.invited_by,
    created_at: invite.created_at ?? new Date().toISOString(),
    updated_at: invite.updated_at ?? invite.created_at ?? new Date().toISOString(),
    last_sent_at: invite.last_sent_at ?? null,
  }))
}
