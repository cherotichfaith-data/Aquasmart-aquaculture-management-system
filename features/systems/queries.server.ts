import { createClient } from "@/utils/supabase/server"
import { requireUser } from "@/utils/supabase/require-user"
import { listSystemsInputSchema, type ListSystemsInput } from "./schemas"
import type { SystemOption, SystemRow } from "./types"

export async function listSystemOptions(input: ListSystemsInput): Promise<SystemOption[]> {
  await requireUser()
  const parsed = listSystemsInputSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("api_system_options_rpc", {
    p_farm_id: parsed.farmId,
    p_stage: parsed.stage === "all" ? undefined : parsed.stage,
    p_active_only: parsed.activeOnly,
  })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as SystemOption[]
}

export async function listSystemsByFarm(farmId: string): Promise<SystemRow[]> {
  await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("system")
    .select("*")
    .eq("farm_id", farmId)
    .order("name", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as SystemRow[]
}
