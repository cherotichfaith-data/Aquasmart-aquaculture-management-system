import { runServerReadThrough } from "@/lib/cache/server"
import { cacheTags } from "@/lib/cache/tags"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import type { Database } from "@/lib/types/database"
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

