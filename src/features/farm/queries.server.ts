import { runServerReadThrough } from "@/lib/cache/server"
import { cacheTags } from "@/lib/cache/tags"
import { resolveAppEntryPath } from "@/lib/app-entry"
import { claimFarmMembershipsByEmail } from "@/lib/auth/claim-farm-memberships"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { isSbNetworkError, logSbError } from "@/lib/supabase/log"
import { requireUserContext } from "@/lib/supabase/require-user"
import type { Database } from "@/lib/types/database"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"

export type FarmOption = Database["public"]["Functions"]["api_farm_options_rpc"]["Returns"][number]

export async function listFarmOptions(): Promise<FarmOption[]> {
  const { user, accessToken } = await requireUserContext()

  return runServerReadThrough({
    keyParts: ["farm-options", user.id],
    tags: [cacheTags.farmOptions(user.id)],
    loader: async () => {
      const supabase = createAccessTokenClient(accessToken)
      const { data, error } = await supabase.rpc("api_farm_options_rpc")
      if (error) {
        throw new Error(error.message)
      }

      return ((data ?? []) as FarmOption[]).sort((a, b) => String(a.label ?? "").localeCompare(String(b.label ?? "")))
    },
  })
}

export async function resolveInitialFarmId(searchFarmId?: string | null) {
  const { user, accessToken } = await requireUserContext()
  await claimPendingFarmMemberships(user.id, accessToken)
  const farms = await listFarmOptions()
  const farmIds = new Set(farms.map((farm) => farm.id))
  const farmId = searchFarmId && farmIds.has(searchFarmId) ? searchFarmId : (farms[0]?.id ?? null)

  return {
    farmId,
    farms,
  }
}

export async function requireInitialFarmId(searchFarmId?: string | null) {
  return resolveInitialFarmId(searchFarmId)
}

async function claimPendingFarmMemberships(userId: string, accessToken: string) {
  const supabase = createAccessTokenClient(accessToken)

  try {
    const { data, error } = await claimFarmMembershipsByEmail(supabase)
    if (error) {
      if (!isSbNetworkError(error)) {
        logSbError("farmQueries:claimFarmMemberships", error)
      }
      return
    }

    if ((data ?? 0) > 0) {
      revalidateTag(cacheTags.farmOptions(userId), "max")
    }
  } catch (error) {
    if (!isSbNetworkError(error)) {
      logSbError("farmQueries:claimFarmMemberships:catch", error)
    }
  }
}

export async function redirectIfFarmExists() {
  const { farmId, entryPath } = await resolveExistingFarmEntryPath()

  if (farmId) {
    redirect(entryPath)
  }
}

export async function resolveExistingFarmEntryPath(searchFarmId?: string | null) {
  const { user, accessToken } = await requireUserContext()
  const { farmId, farms } = await resolveInitialFarmId(searchFarmId)

  if (!farmId) {
    return {
      farmId: null,
      farms,
      role: null as Parameters<typeof resolveAppEntryPath>[0],
      entryPath: "/onboarding",
    }
  }

  const supabase = createAccessTokenClient(accessToken)
  const { data: membership } = await supabase
    .from("farm_user")
    .select("role")
    .eq("farm_id", farmId)
    .eq("user_id", user.id)
    .maybeSingle()

  const role = (membership?.role ?? null) as Parameters<typeof resolveAppEntryPath>[0]

  return {
    farmId,
    farms,
    role,
    entryPath: resolveAppEntryPath(role),
  }
}
