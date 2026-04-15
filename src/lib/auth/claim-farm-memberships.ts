import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"
import { isSbMissingFunction } from "@/lib/supabase/log"

type FarmMembershipRpcClient = Pick<SupabaseClient<Database>, "rpc">

export async function claimFarmMembershipsByEmail(supabase: FarmMembershipRpcClient) {
  const result = await supabase.rpc("claim_my_farm_user_invitations")

  if (result.error && isSbMissingFunction(result.error, "claim_my_farm_user_invitations")) {
    return { data: 0, error: null }
  }

  return result
}
