"use server"

import { revalidateTag } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { requireUser } from "@/utils/supabase/require-user"
import { logSbError } from "@/utils/supabase/log"
import { cacheTags } from "@/lib/cache/tags"
import { recordStockingInputSchema, type RecordStockingInput } from "./schemas"
import type { StockingRow } from "./types"

export async function recordStockingCommand(input: RecordStockingInput): Promise<StockingRow> {
  await requireUser()
  const parsed = recordStockingInputSchema.parse(input)
  const supabase = await createClient()

  const { farmId, ...payload } = parsed
  const { data, error } = await supabase.from("fish_stocking").insert(payload).select("*").single()

  if (error) {
    logSbError("features:stocking:recordStockingCommand", error)
    throw new Error(error.message)
  }

  revalidateTag(cacheTags.farm(farmId), "max")
  revalidateTag(cacheTags.inventory(farmId), "max")
  revalidateTag(cacheTags.stocking(farmId, parsed.system_id), "max")
  revalidateTag(cacheTags.reports(farmId, "stocking"), "max")
  revalidateTag(cacheTags.dataEntry(farmId), "max")

  return data as StockingRow
}
