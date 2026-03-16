import { createClient } from "@/utils/supabase/server"
import { requireUser } from "@/utils/supabase/require-user"
import { listFeedingRecordsInputSchema, type ListFeedingRecordsInput } from "./schemas"
import type { FeedingRow, FeedTypeOption } from "./types"

export async function listFeedingRecords(input: ListFeedingRecordsInput): Promise<FeedingRow[]> {
  await requireUser()
  const parsed = listFeedingRecordsInputSchema.parse(input)
  const supabase = await createClient()

  let query = supabase.from("feeding_record").select("*").order("date", { ascending: false }).limit(parsed.limit)

  if (parsed.systemIds?.length) query = query.in("system_id", parsed.systemIds)
  if (parsed.batchId != null) query = query.eq("batch_id", parsed.batchId)
  if (parsed.dateFrom) query = query.gte("date", parsed.dateFrom)
  if (parsed.dateTo) query = query.lte("date", parsed.dateTo)

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as FeedingRow[]
}

export async function listFeedTypeOptions(): Promise<FeedTypeOption[]> {
  await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("api_feed_type_options_rpc")

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as FeedTypeOption[]
}
