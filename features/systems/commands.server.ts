"use server"

import { revalidateTag } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { requireUser } from "@/utils/supabase/require-user"
import { logSbError } from "@/utils/supabase/log"
import { cacheTags } from "@/lib/cache/tags"
import { createSystemInputSchema, type CreateSystemInput } from "./schemas"
import type { SystemRow } from "./types"

export async function createSystemCommand(input: CreateSystemInput): Promise<SystemRow> {
  await requireUser()
  const parsed = createSystemInputSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase.from("system").insert(parsed).select("*").single()

  if (error) {
    logSbError("features:systems:createSystemCommand", error)
    throw new Error(error.message)
  }

  revalidateTag(cacheTags.farm(parsed.farm_id), "max")
  revalidateTag(cacheTags.systems(parsed.farm_id), "max")
  revalidateTag(cacheTags.inventory(parsed.farm_id), "max")
  revalidateTag(cacheTags.dataEntry(parsed.farm_id), "max")

  return data as SystemRow
}
