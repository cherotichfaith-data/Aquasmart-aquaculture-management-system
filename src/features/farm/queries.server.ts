import { runServerReadThrough } from "@/lib/cache/server"
import { cacheTags } from "@/lib/cache/tags"
import { ONBOARDING_PATH, resolveAppEntryPath, WORKSPACE_SELECT_PATH } from "@/lib/app-entry"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import type { Database } from "@/lib/types/database"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { ACTIVE_FARM_COOKIE, normalizeContextValue } from "@/lib/context"

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
  await requireUserContext()
  const farms = await listFarmOptions()
  const farmIds = new Set(farms.map((farm) => farm.id))
  const cookieStore = await cookies()
  const cookieFarmId = normalizeContextValue(cookieStore.get(ACTIVE_FARM_COOKIE)?.value)
  const requestedFarmId = normalizeContextValue(searchFarmId) ?? cookieFarmId
  const farmId = requestedFarmId && farmIds.has(requestedFarmId) ? requestedFarmId : null
  const farm = farmId ? farms.find((row) => row.id === farmId) ?? null : null

  return {
    farmId,
    farmName: farm?.label ?? null,
    farms,
  }
}

export async function requireInitialFarmId(searchFarmId?: string | null) {
  return resolveInitialFarmId(searchFarmId)
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
      entryPath: farms.length > 0 ? WORKSPACE_SELECT_PATH : ONBOARDING_PATH,
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
    entryPath: `${resolveAppEntryPath(role)}?farmId=${encodeURIComponent(farmId)}`,
  }
}
