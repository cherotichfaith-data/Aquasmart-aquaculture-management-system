import { runServerReadThrough } from "@/lib/cache/server"
import { cacheTags } from "@/lib/cache/tags"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import type { Database } from "@/lib/types/database"
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

export async function redirectIfFarmExists() {
  const { farmId } = await resolveInitialFarmId()

  if (farmId) {
    redirect("/")
  }
}
