import { createClient } from "@/utils/supabase/server"
import { requireUser } from "@/utils/supabase/require-user"
import { listStockingRecordsInputSchema, type ListStockingRecordsInput } from "./schemas"
import type { BatchOption, StockingRow } from "./types"

export async function listStockingRecords(input: ListStockingRecordsInput): Promise<StockingRow[]> {
  await requireUser()
  const parsed = listStockingRecordsInputSchema.parse(input)
  const supabase = await createClient()

  let query = supabase.from("fish_stocking").select("*").order("date", { ascending: false }).limit(parsed.limit)

  if (parsed.systemIds?.length) query = query.in("system_id", parsed.systemIds)
  if (parsed.batchId != null) query = query.eq("batch_id", parsed.batchId)
  if (parsed.dateFrom) query = query.gte("date", parsed.dateFrom)
  if (parsed.dateTo) query = query.lte("date", parsed.dateTo)

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as StockingRow[]
}

export async function listBatchOptions(farmId: string): Promise<BatchOption[]> {
  await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("api_fingerling_batch_options_rpc", {
    p_farm_id: farmId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as BatchOption[]
}
