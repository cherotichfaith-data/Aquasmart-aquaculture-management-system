import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

type FarmMembershipRpcClient = Pick<SupabaseClient<Database>, "rpc">

export async function claimFarmMembershipsByEmail(supabase: FarmMembershipRpcClient) {
  return supabase.rpc("claim_my_farm_user_invitations")
}
