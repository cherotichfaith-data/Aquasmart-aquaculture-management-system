import type { QueryResult } from "@/lib/supabase-client"
import { createClient } from "@/utils/supabase/client"
import { logSbError } from "@/utils/supabase/log"
import { getSessionUser } from "@/utils/supabase/session"

export async function refreshMaterializedViews(): Promise<QueryResult<null>> {
  try {
    const supabase = createClient()
    const sessionUser = await getSessionUser(supabase, "refreshMaterializedViews:getSession")
    if (!sessionUser) {
      return { status: "error", data: null, error: "No active session" }
    }
    // RPC removed per data-layer change request. If you still need refresh,
    // re-introduce a secure server-side path (edge function or RPC).
    logSbError("refreshMaterializedViews", new Error("Materialized view refresh disabled (RPC removed)"))
    return { status: "success", data: [] }
  } catch (err) {
    logSbError("refreshMaterializedViews:catch", err)
    const message = err instanceof Error ? err.message : String(err)
    return { status: "error", data: null, error: message }
  }
}
