import type { Database } from "@/lib/types/database"
import { createClient } from "@/lib/supabase/server"
import { isMissingObjectError } from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>
type MortalityEventRow = Database["public"]["Tables"]["fish_mortality"]["Row"]

const isQuietReadError = (error: unknown) =>
  isSbPermissionDenied(error) || isSbAuthMissing(error) || isMissingObjectError(error)

export async function listMortalityEvents(
  supabase: ServerSupabaseClient,
  params?: {
    farmId?: string | null
    systemId?: number
    batchId?: number
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<MortalityEventRow[]> {
  let query = supabase.from("fish_mortality").select("*")
  if (params?.farmId) query = query.eq("farm_id", params.farmId)
  if (params?.systemId) query = query.eq("system_id", params.systemId)
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)

  const { data, error } = await query
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(params?.limit ?? 100)

  if (error) {
    if (isQuietReadError(error)) return []
    throw error
  }

  return (data ?? []) as MortalityEventRow[]
}


