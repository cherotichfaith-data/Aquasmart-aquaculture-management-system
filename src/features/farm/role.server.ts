import { logSbError } from "@/lib/supabase/log"
import { createAccessTokenClient } from "@/lib/supabase/server"

/**
 * The signed-in user's role on a farm, read on the server so the sidebar can render its
 * navigation immediately. Without it the sidebar shows grey placeholders until a browser-side
 * lookup finishes, and that lookup can stall.
 */
export async function getServerFarmRole(params: { farmId?: string | null; userId: string; accessToken: string }) {
  if (!params.farmId) return null
  const supabase = createAccessTokenClient(params.accessToken)
  const { data, error } = await supabase
    .from("farm_user")
    .select("role")
    .eq("farm_id", params.farmId)
    .eq("user_id", params.userId)
    .maybeSingle()
  if (error) logSbError("getServerFarmRole", error)
  return data?.role ?? null
}
