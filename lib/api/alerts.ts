import type { QueryResult } from "@/lib/supabase-client"
import type { Tables } from "@/lib/types/database"
import { supabaseQuery } from "@/lib/supabase-client"

type AlertThresholdRow = Tables<"alert_threshold">

export async function getAlertThresholds(params?: { farmId?: string | null }) {
  const eq = params?.farmId ? { farm_id: params.farmId } : undefined
  return supabaseQuery<AlertThresholdRow>("alert_threshold", {
    select: "*",
    eq,
    order: "created_at.desc",
  }) as Promise<QueryResult<AlertThresholdRow>>
}
