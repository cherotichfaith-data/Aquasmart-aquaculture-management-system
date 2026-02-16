import type { SupabaseClient, User } from "@supabase/supabase-js"
import { isSbAuthMissing, logSbError } from "./log"

export async function getSessionUser(
  supabase: SupabaseClient,
  tag: string,
): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    if (!isSbAuthMissing(error)) {
      logSbError(tag, error)
    }
  }
  return data?.user ?? null
}
