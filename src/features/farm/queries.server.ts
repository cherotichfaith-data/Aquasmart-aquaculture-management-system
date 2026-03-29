import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/supabase/require-user"
import type { Database } from "@/lib/types/database"
import { redirect } from "next/navigation"
import { cache } from "react"

export type FarmOption = Database["public"]["Functions"]["api_farm_options_rpc"]["Returns"][number]

export const listFarmOptions = cache(async (): Promise<FarmOption[]> => {
  await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("api_farm_options_rpc")
  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as FarmOption[]).sort((a, b) => String(a.label ?? "").localeCompare(String(b.label ?? "")))
})

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
  const context = await resolveInitialFarmId(searchFarmId)

  if (!context.farmId) {
    redirect("/onboarding")
  }

  return context
}

export async function redirectIfFarmExists() {
  const { farmId } = await resolveInitialFarmId()

  if (farmId) {
    redirect("/")
  }
}
