import type { SupabaseClient, User } from "@supabase/supabase-js"
import { isSbAuthMissing, isSbNetworkError, logSbError } from "./log"

export async function getSessionUser(
  supabase: SupabaseClient,
  tag: string,
): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      if (!isSbAuthMissing(error) && !isSbNetworkError(error)) {
        logSbError(tag, error)
      }
    }
    return data?.user ?? null
  } catch (error) {
    if (!isSbNetworkError(error)) {
      logSbError(tag, error)
    }
    return null
  }
}
