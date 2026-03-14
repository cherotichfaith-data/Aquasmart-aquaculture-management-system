"use server"

import { revalidateTag } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { requireUser } from "@/utils/supabase/require-user"
import { logSbError } from "@/utils/supabase/log"
import { cacheTags } from "@/lib/cache/tags"
import { recordFeedingInputSchema, type RecordFeedingInput } from "./schemas"
import type { FeedingRow } from "./types"

export async function recordFeedingCommand(input: RecordFeedingInput): Promise<FeedingRow> {
  await requireUser()
  const parsed = recordFeedingInputSchema.parse(input)
  const supabase = await createClient()

  const { farmId, ...payload } = parsed
  const { data, error } = await supabase.from("feeding_record").insert(payload).select("*").single()

  if (error) {
    logSbError("features:feeding:recordFeedingCommand", error)
    throw new Error(error.message)
  }

  revalidateTag(cacheTags.farm(farmId), "max")
  revalidateTag(cacheTags.inventory(farmId), "max")
  revalidateTag(cacheTags.feeding(farmId, parsed.system_id), "max")
  revalidateTag(cacheTags.reports(farmId, "feeding"), "max")
  revalidateTag(cacheTags.dataEntry(farmId), "max")

  return data as FeedingRow
}
